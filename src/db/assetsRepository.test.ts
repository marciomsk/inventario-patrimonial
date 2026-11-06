import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import { createManualAsset, DuplicateAssetError, updateAsset } from './assetsRepository';
import { ensureRoom } from './roomRepository';
import { computeAssetStates } from '../domain/status';
import type { Asset, InventoryEvent } from '../domain/types';

function asset(id: string, plaqueta: string, localOriginal: string, roomId: string | null): Asset {
  return {
    id,
    plaqueta,
    plaquetaKey: plaqueta,
    descricao: 'CADEIRA',
    localOriginal,
    localCodigo: null,
    localNome: localOriginal,
    roomId,
    idPatrimonio: null,
    statusCadastro: 'OK',
    observacao: null,
    legacyStatus: 'pendente',
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

function event(
  id: string,
  plaqueta: string,
  resultado: InventoryEvent['resultado'],
  localBipagem: string,
  roomId: string | null,
): InventoryEvent {
  return {
    id,
    plaqueta,
    plaquetaKey: plaqueta,
    assetId: null,
    candidatosAssetIds: [],
    dataHora: '2026-02-01T10:00:00.000Z',
    localBipagem,
    roomId,
    resultado,
    observacao: null,
    acaoSapiens: null,
    inventorySessionId: 's1',
    deviceId: 'dev',
    source: 'scanner',
    legacyEventId: null,
    syncStatus: 'nao_aplicavel',
    resolvidoManualmente: false,
    createdAt: '2026-02-01T10:00:00.000Z',
  };
}

async function reset() {
  await db.open();
  await Promise.all([db.assets.clear(), db.events.clear(), db.rooms.clear(), db.settings.clear()]);
}

describe('cadastro manual e edição de bens', () => {
  beforeEach(reset);

  it('cadastra item novo e vincula a leitura não cadastrada da sessão', async () => {
    const room = await ensureRoom('0001 - SALA A');
    await db.events.add(event('e1', '055555', 'nao_cadastrado', room.label, room.id));

    const created = await createManualAsset({
      plaqueta: '055555',
      descricao: 'MESA DOADA',
      room,
      observacao: 'Sem etiqueta',
      sessionId: 's1',
      deviceId: 'dev',
    });

    expect(created.isManualRegister).toBe(true);
    expect(created.source).toBe('manual');
    expect(created.roomId).toBe(room.id);
    expect(created.localOriginal).toBe(room.label);

    const linked = await db.events.get('e1');
    expect(linked?.assetId).toBe(created.id);
    expect(linked?.resultado).toBe('encontrado');
    expect(linked?.resolvidoManualmente).toBe(true);
    expect(await db.events.count()).toBe(1);

    const states = computeAssetStates([created], await db.events.toArray(), 's1');
    expect(states.get(created.id)?.conferido).toBe(true);
    expect(states.get(created.id)?.divergente).toBe(false);
  });

  it('cria a leitura de conferência quando não há leitura anterior', async () => {
    const room = await ensureRoom('0001 - SALA A');
    const created = await createManualAsset({
      plaqueta: '066666',
      descricao: 'ARMÁRIO',
      room,
      sessionId: 's1',
      deviceId: 'dev',
    });
    const events = await db.events.toArray();
    expect(events).toHaveLength(1);
    expect(events[0].assetId).toBe(created.id);
    expect(events[0].resultado).toBe('encontrado');
    expect(events[0].source).toBe('manual');
  });

  it('bloqueia plaqueta já cadastrada', async () => {
    const room = await ensureRoom('0001 - SALA A');
    await db.assets.add(asset('a1', '022308', room.label, room.id));
    await expect(
      createManualAsset({
        plaqueta: '022308',
        descricao: 'OUTRO',
        room,
        sessionId: 's1',
        deviceId: 'dev',
      }),
    ).rejects.toBeInstanceOf(DuplicateAssetError);
    expect(await db.assets.count()).toBe(1);
  });

  it('edita o bem sem alterar o histórico de leituras', async () => {
    const roomA = await ensureRoom('0001 - SALA A');
    const roomB = await ensureRoom('0002 - SALA B');
    await db.assets.add(asset('a1', '022308', roomA.label, roomA.id));
    await db.events.add(event('e1', '022308', 'encontrado', roomA.label, roomA.id));

    const updated = await updateAsset('a1', {
      plaqueta: '022309',
      descricao: 'MESA NOVA',
      roomId: roomB.id,
      statusCadastro: '✅ OK',
      observacao: 'Transferido',
    });

    expect(updated.plaqueta).toBe('022309');
    expect(updated.roomId).toBe(roomB.id);
    expect(updated.localOriginal).toBe(roomB.label);
    expect(updated.observacao).toBe('Transferido');

    const savedEvent = await db.events.get('e1');
    expect(savedEvent?.plaqueta).toBe('022308');
    expect(savedEvent?.localBipagem).toBe(roomA.label);
  });

  it('bloqueia editar para uma plaqueta de outro bem', async () => {
    const room = await ensureRoom('0001 - SALA A');
    await db.assets.bulkAdd([
      asset('a1', '022308', room.label, room.id),
      asset('a2', '022309', room.label, room.id),
    ]);
    await expect(
      updateAsset('a1', {
        plaqueta: '022309',
        descricao: 'X',
        roomId: room.id,
        statusCadastro: 'OK',
        observacao: null,
      }),
    ).rejects.toBeInstanceOf(DuplicateAssetError);
  });
});
