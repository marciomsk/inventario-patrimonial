import Dexie, { type Table } from 'dexie';
import { buildRoomDrafts, countRoomLabels, roomKey } from '../domain/rooms';
import { createId, nowIso } from '../domain/id';
import { parseLocal } from '../domain/plaqueta';
import type {
  Asset,
  ImportBatch,
  InventoryEvent,
  InventorySession,
  Room,
  SettingRow,
  SyncQueueItem,
  TransferRequest,
} from '../domain/types';

export class InventarioDatabase extends Dexie {
  assets!: Table<Asset, string>;
  events!: Table<InventoryEvent, string>;
  sessions!: Table<InventorySession, string>;
  settings!: Table<SettingRow, string>;
  importBatches!: Table<ImportBatch, string>;
  transferRequests!: Table<TransferRequest, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  rooms!: Table<Room, string>;

  constructor(name = 'inventario-patrimonial') {
    super(name);

    this.version(1).stores({
      assets: 'id, plaquetaKey, localOriginal, localCodigo, importBatchId, legacyStatus',
      events:
        'id, plaquetaKey, assetId, dataHora, inventorySessionId, resultado, legacyEventId, [inventorySessionId+resultado], [inventorySessionId+plaquetaKey], [inventorySessionId+assetId]',
      sessions: 'id, status, startedAt',
      settings: 'key',
      importBatches: 'id, startedAt, status, origem',
      transferRequests: 'id, assetId, status, dataHora',
      syncQueue: 'id, status, createdAt, [entity+entityId]',
    });

    // v2: corrige metadados de data e adiciona o estado "efetivada" às
    // transferências. Nenhum evento ou bem é apagado.
    this.version(2)
      .stores({
        assets: 'id, plaquetaKey, localOriginal, localCodigo, importBatchId, legacyStatus',
        events:
          'id, plaquetaKey, assetId, dataHora, inventorySessionId, resultado, legacyEventId, [inventorySessionId+resultado], [inventorySessionId+plaquetaKey], [inventorySessionId+assetId]',
        sessions: 'id, status, startedAt',
        settings: 'key',
        importBatches: 'id, startedAt, status, origem',
        transferRequests: 'id, assetId, status, dataHora',
        syncQueue: 'id, status, createdAt, [entity+entityId]',
      })
      .upgrade(async (tx) => {
        await tx
          .table('sessions')
          .toCollection()
          .modify((session: InventorySession) => {
            if (session.source === 'xlsx-legado' && session.startedAt < session.createdAt) {
              session.legacyFirstReadAt ??= session.startedAt;
              session.startedAt = session.createdAt;
            }
          });
        await tx
          .table('transferRequests')
          .toCollection()
          .modify((request: TransferRequest) => {
            request.resolvedAt ??= null;
          });
      });

    // v3: consolida salas e vincula bens/leituras por `roomId`, preservando
    // todo o histórico. O texto original dos eventos não é reescrito.
    this.version(3)
      .stores({
        assets:
          'id, plaquetaKey, localOriginal, localCodigo, importBatchId, legacyStatus, roomId',
        events:
          'id, plaquetaKey, assetId, dataHora, inventorySessionId, resultado, legacyEventId, roomId, [inventorySessionId+resultado], [inventorySessionId+plaquetaKey], [inventorySessionId+assetId]',
        sessions: 'id, status, startedAt',
        settings: 'key',
        importBatches: 'id, startedAt, status, origem',
        transferRequests: 'id, assetId, status, dataHora',
        syncQueue: 'id, status, createdAt, [entity+entityId]',
        rooms: 'id, key, codigo, label',
      })
      .upgrade(async (tx) => {
        const assetTable = tx.table<Asset, string>('assets');
        const eventTable = tx.table<InventoryEvent, string>('events');
        const roomTable = tx.table<Room, string>('rooms');
        const settingsTable = tx.table<SettingRow, string>('settings');

        const [assets, settingsRows] = await Promise.all([
          assetTable.toArray(),
          settingsTable.toArray(),
        ]);

        const labels = assets.map((asset) => asset.localOriginal);
        const currentRoom = settingsRows.find((row) => row.key === 'salaAtual')?.value;
        if (typeof currentRoom === 'string' && currentRoom.trim()) labels.push(currentRoom);

        const drafts = buildRoomDrafts(countRoomLabels(labels));
        const now = nowIso();
        const rooms: Room[] = drafts.map((draft) => ({
          id: createId(),
          key: draft.key,
          codigo: draft.codigo,
          nome: draft.nome,
          label: draft.label,
          aliases: draft.aliases,
          createdAt: now,
          updatedAt: now,
        }));
        const roomsByKey = new Map(rooms.map((room) => [room.key, room]));

        if (rooms.length > 0) await roomTable.bulkAdd(rooms);

        await assetTable.toCollection().modify((asset: Asset) => {
          const parsed = parseLocal(asset.localOriginal);
          const room = roomsByKey.get(roomKey(asset.localOriginal));
          asset.roomId = room?.id ?? null;
          asset.observacao = asset.observacao ?? null;
          asset.isManualRegister = asset.isManualRegister === true;
          if (room) {
            asset.localOriginal = room.label;
            asset.localCodigo = room.codigo;
            asset.localNome = room.nome;
          } else {
            asset.localCodigo = parsed.codigo;
            asset.localNome = parsed.nome;
          }
        });

        await eventTable.toCollection().modify((event: InventoryEvent) => {
          const room = roomsByKey.get(roomKey(event.localBipagem));
          event.roomId = room?.id ?? null;
        });
      });
  }
}

export const db = new InventarioDatabase();
