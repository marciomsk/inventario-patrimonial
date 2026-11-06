import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import {
  createRoom,
  ensureRoom,
  RoomConflictError,
  updateRoom,
} from './roomRepository';
import type { Asset, InventoryEvent } from '../domain/types';

function asset(id: string, localOriginal: string, roomId: string | null): Asset {
  return {
    id,
    plaqueta: '000123',
    plaquetaKey: '000123',
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

function event(id: string, localBipagem: string, roomId: string | null): InventoryEvent {
  return {
    id,
    plaqueta: '000123',
    plaquetaKey: '000123',
    assetId: 'a1',
    candidatosAssetIds: [],
    dataHora: '2026-02-01T10:00:00.000Z',
    localBipagem,
    roomId,
    resultado: 'encontrado',
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
  await Promise.all([
    db.assets.clear(),
    db.events.clear(),
    db.rooms.clear(),
    db.settings.clear(),
  ]);
}

describe('cadastro de salas', () => {
  beforeEach(reset);

  it('cria sala com rótulo canônico e bloqueia código repetido', async () => {
    const room = await createRoom({ codigo: '0589', nome: 'PRAIA PARK – CASCATAS' });
    expect(room.label).toBe('0589 - PRAIA PARK - CASCATAS');
    expect(room.key).toBe('C:0589');

    await expect(
      createRoom({ codigo: '0589', nome: 'OUTRA GRAFIA' }),
    ).rejects.toBeInstanceOf(RoomConflictError);
  });

  it('reaproveita a mesma sala ao garantir grafias equivalentes', async () => {
    const first = await ensureRoom('0247 - SALA DA CANASTRA - COPA');
    const second = await ensureRoom('0247 - SALA DA CANASTRA – COPA');
    expect(second.id).toBe(first.id);
    expect(second.aliases).toHaveLength(2);
  });

  it('renomeia a sala e atualiza o local dos bens em cascata, sem tocar no evento', async () => {
    const room = await createRoom({ codigo: '0001', nome: 'SALA A' });
    await db.settings.put({ key: 'salaAtual', value: room.label, updatedAt: 'x' });
    await db.assets.add(asset('a1', room.label, room.id));
    await db.events.add(event('e1', room.label, room.id));

    const updated = await updateRoom(room.id, { codigo: '0002', nome: 'SALA B' });
    expect(updated.label).toBe('0002 - SALA B');

    const savedAsset = await db.assets.get('a1');
    expect(savedAsset?.localOriginal).toBe('0002 - SALA B');
    expect(savedAsset?.localCodigo).toBe('0002');
    expect(savedAsset?.localNome).toBe('SALA B');
    expect(savedAsset?.roomId).toBe(room.id);

    const savedEvent = await db.events.get('e1');
    expect(savedEvent?.localBipagem).toBe('0001 - SALA A');
    expect(savedEvent?.roomId).toBe(room.id);

    expect((await db.settings.get('salaAtual'))?.value).toBe('0002 - SALA B');
  });

  it('bloqueia renomear para o código de outra sala', async () => {
    const roomA = await createRoom({ codigo: '0001', nome: 'SALA A' });
    await createRoom({ codigo: '0002', nome: 'SALA B' });
    await expect(updateRoom(roomA.id, { codigo: '0002', nome: 'SALA A' })).rejects.toThrow(
      /Já existe uma sala/,
    );
  });
});
