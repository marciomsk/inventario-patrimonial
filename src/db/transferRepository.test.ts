import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import {
  createTransferRequest,
  effectivateTransfer,
  effectivateTransfers,
  listTransferRequests,
} from './transferRepository';
import { computeAssetStates } from '../domain/status';
import type { Asset, InventoryEvent } from '../domain/types';

function asset(id: string, plaqueta: string, localOriginal: string): Asset {
  return {
    id,
    plaqueta,
    plaquetaKey: plaqueta,
    descricao: `Bem ${plaqueta}`,
    localOriginal,
    localCodigo: localOriginal.slice(0, 4),
    localNome: localOriginal.slice(7),
    roomId: null,
    idPatrimonio: null,
    statusCadastro: 'OK',
    observacao: null,
    legacyStatus: 'conferido',
    legacyUltimaConferencia: null,
    legacyAcaoSapiens: '',
    legacyAlerta: '',
    source: 'xlsx-legado',
    importBatchId: null,
    revisaoPendente: false,
    revisaoMotivos: [],
    ativo: true,
    isManualRegister: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function event(id: string, assetId: string, localBipagem: string, dataHora: string): InventoryEvent {
  return {
    id,
    plaqueta: '000123',
    plaquetaKey: '000123',
    assetId,
    candidatosAssetIds: [],
    dataHora,
    localBipagem,
    roomId: null,
    resultado: 'divergente',
    observacao: null,
    acaoSapiens: null,
    inventorySessionId: 's1',
    deviceId: 'dev',
    source: 'scanner',
    legacyEventId: null,
    syncStatus: 'nao_aplicavel',
    resolvidoManualmente: false,
    createdAt: dataHora,
  };
}

async function reset() {
  await db.open();
  await Promise.all([
    db.assets.clear(),
    db.events.clear(),
    db.sessions.clear(),
    db.settings.clear(),
    db.importBatches.clear(),
    db.transferRequests.clear(),
    db.syncQueue.clear(),
    db.rooms.clear(),
  ]);
}

describe('efetivação de transferência', () => {
  beforeEach(reset);

  it('atualiza o local oficial e mantém o histórico intacto', async () => {
    await db.assets.add(asset('a1', '000123', '0001 - SALA A'));
    await db.events.add(event('e1', 'a1', '0002 - SALA B', '2026-02-01T10:00:00.000Z'));

    const request = await effectivateTransfer({
      assetId: 'a1',
      localDestino: '0002 - SALA B',
      eventId: 'e1',
    });

    const updated = await db.assets.get('a1');
    expect(updated?.localOriginal).toBe('0002 - SALA B');
    expect(updated?.localCodigo).toBe('0002');
    expect(updated?.localNome).toBe('SALA B');

    const events = await db.events.toArray();
    expect(events).toHaveLength(1);
    expect(events[0].localBipagem).toBe('0002 - SALA B');
    expect(events[0].resultado).toBe('divergente');

    const states = computeAssetStates([updated!], events, 's1');
    expect(states.get('a1')?.divergente).toBe(false);
    expect(states.get('a1')?.conferido).toBe(true);

    expect(request.status).toBe('efetivada');
    expect(request.localOriginal).toBe('0001 - SALA A');
    expect(request.localDestino).toBe('0002 - SALA B');
    expect(request.resolvedAt).not.toBeNull();
  });

  it('reaproveita a solicitação pendente em vez de duplicar', async () => {
    await db.assets.add(asset('a1', '000123', '0001 - SALA A'));
    const pending = await createTransferRequest({
      assetId: 'a1',
      plaqueta: '000123',
      localOriginal: '0001 - SALA A',
      localDestino: '0002 - SALA B',
      eventId: 'e1',
    });

    await effectivateTransfer({
      assetId: 'a1',
      localDestino: '0002 - SALA B',
      eventId: 'e1',
    });

    const transfers = await listTransferRequests();
    expect(transfers).toHaveLength(1);
    expect(transfers[0].id).toBe(pending.id);
    expect(transfers[0].status).toBe('efetivada');
  });

  it('efetiva em lote e desfaz tudo se um bem não existir', async () => {
    await db.assets.bulkAdd([
      asset('a1', '000123', '0001 - SALA A'),
      asset('a2', '000124', '0001 - SALA A'),
    ]);

    await effectivateTransfers([
      { assetId: 'a1', localDestino: '0002 - SALA B', eventId: 'e1' },
      { assetId: 'a2', localDestino: '0003 - SALA C', eventId: 'e2' },
    ]);
    expect((await db.assets.get('a1'))?.localOriginal).toBe('0002 - SALA B');
    expect((await db.assets.get('a2'))?.localOriginal).toBe('0003 - SALA C');
    expect(await db.transferRequests.count()).toBe(2);

    await expect(
      effectivateTransfers([
        { assetId: 'a1', localDestino: '0004 - SALA D', eventId: 'e1' },
        { assetId: 'inexistente', localDestino: '0004 - SALA D', eventId: 'e2' },
      ]),
    ).rejects.toThrow('Bem não encontrado');

    expect((await db.assets.get('a1'))?.localOriginal).toBe('0002 - SALA B');
    expect(await db.transferRequests.count()).toBe(2);
  });

  it('exige sala de destino', async () => {
    await db.assets.add(asset('a1', '000123', '0001 - SALA A'));
    await expect(
      effectivateTransfer({ assetId: 'a1', localDestino: '  ', eventId: 'e1' }),
    ).rejects.toThrow('Sala de destino');
    expect((await db.assets.get('a1'))?.localOriginal).toBe('0001 - SALA A');
  });
});
