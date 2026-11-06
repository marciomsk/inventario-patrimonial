import type { Table } from 'dexie';
import { db } from '../../db/database';
import { ensureDeviceId } from '../../db/settingsRepository';
import { createId, nowIso } from '../../domain/id';
import { sameLocal } from '../../domain/plaqueta';
import { buildRoomDrafts, countRoomLabels, roomKey } from '../../domain/rooms';
import type {
  Asset,
  ImportBatch,
  InventoryEvent,
  InventorySession,
  Room,
  SettingRow,
} from '../../domain/types';
import type { LegacyImportPreview } from './legacyImport';

export interface ImportProgress {
  phase: 'assets' | 'events' | 'finishing';
  done: number;
  total: number;
}

export interface ApplyResult {
  batchId: string;
  sessionId: string;
  assets: number;
  events: number;
}

export class ExistingDataError extends Error {
  constructor() {
    super(
      'Já existem dados neste dispositivo. Exporte um backup e limpe a base antes de importar novamente. A atualização incremental do cadastro será implementada em uma próxima etapa.',
    );
    this.name = 'ExistingDataError';
  }
}

const CHUNK_SIZE = 1000;

async function addInChunks<T>(
  table: Table<T, string>,
  rows: T[],
  onProgress: ((done: number) => void) | undefined,
): Promise<void> {
  for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
    await table.bulkAdd(rows.slice(index, index + CHUNK_SIZE));
    onProgress?.(Math.min(index + CHUNK_SIZE, rows.length));
  }
}

/**
 * Aplica a prévia em uma única transação. Não apaga nada: exige base vazia.
 * Eventos são vinculados por plaquetaKey; duplicidades ficam sem vínculo.
 */
export async function applyLegacyImport(
  preview: LegacyImportPreview,
  onProgress?: (progress: ImportProgress) => void,
): Promise<ApplyResult> {
  const [assetCount, eventCount] = await Promise.all([db.assets.count(), db.events.count()]);
  if (assetCount > 0 || eventCount > 0) throw new ExistingDataError();

  const deviceId = await ensureDeviceId();
  const now = nowIso();
  const batchId = createId();
  const sessionId = createId();

  // Consolida as salas antes de gravar os bens: o mesmo código agrupa
  // grafias diferentes e o local do bem passa a ser o rótulo canônico.
  // Ignora placas de sala (itens de cabeçalho/identificação) para não gerar salas indevidas.
  const roomDrafts = buildRoomDrafts(
    countRoomLabels([
      ...preview.assets
        .filter((row) => !row.revisaoMotivos.includes('placa_de_sala'))
        .map((row) => row.localOriginal),
      ...(preview.configSalaAtual ? [preview.configSalaAtual] : []),
    ]),
  );
  const rooms: Room[] = roomDrafts.map((draft) => ({
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

  const assets: Asset[] = preview.assets.map((row) => {
    const room = roomsByKey.get(roomKey(row.localOriginal));
    const isRoomPlate = row.revisaoMotivos.includes('placa_de_sala') ||
      row.descricao.trim().toLowerCase() === row.localOriginal.trim().toLowerCase() ||
      row.descricao.toUpperCase().includes('PLACA DE SALA');
    return {
      id: createId(),
      plaqueta: row.plaqueta,
      plaquetaKey: row.plaquetaKey,
      descricao: row.descricao,
      localOriginal: room?.label ?? row.localOriginal,
      localCodigo: room?.codigo ?? row.localCodigo,
      localNome: room?.nome ?? row.localNome,
      roomId: room?.id ?? null,
      idPatrimonio: row.idPatrimonio,
      statusCadastro: row.statusCadastro,
      observacao: null,
      legacyStatus: row.legacyStatus,
      legacyUltimaConferencia: row.legacyUltimaConferencia,
      legacyAcaoSapiens: row.legacyAcaoSapiens,
      legacyAlerta: row.legacyAlerta,
      source: 'xlsx-legado',
      importBatchId: batchId,
      revisaoPendente: row.revisaoPendente,
      revisaoMotivos: row.revisaoMotivos,
      ativo: !isRoomPlate,
      isManualRegister: false,
      createdAt: now,
      updatedAt: now,
    };
  });

  const assetsByKey = new Map<string, Asset[]>();
  for (const asset of assets) {
    const group = assetsByKey.get(asset.plaquetaKey);
    if (group) group.push(asset);
    else assetsByKey.set(asset.plaquetaKey, [asset]);
  }

  const events: InventoryEvent[] = preview.events.map((row) => {
    const candidates = assetsByKey.get(row.plaquetaKey) ?? [];
    const single = candidates.length === 1 ? candidates[0] : null;
    const eventRoom = roomsByKey.get(roomKey(row.localBipagem));
    const sameEventRoom =
      single !== null &&
      (single.roomId && eventRoom
        ? single.roomId === eventRoom.id
        : sameLocal(single.localOriginal, row.localBipagem));
    const resultado = !single
      ? candidates.length > 1
        ? 'duplicado_cadastro'
        : 'nao_cadastrado'
      : sameEventRoom
        ? 'encontrado'
        : 'divergente';

    return {
      id: createId(),
      plaqueta: row.plaqueta,
      plaquetaKey: row.plaquetaKey,
      assetId: single?.id ?? null,
      candidatosAssetIds: candidates.map((candidate) => candidate.id),
      dataHora: row.dataHora,
      localBipagem: row.localBipagem,
      roomId: eventRoom?.id ?? null,
      resultado,
      observacao: null,
      acaoSapiens: row.acaoSapiens || null,
      inventorySessionId: sessionId,
      deviceId,
      source: 'import_xlsx',
      legacyEventId: row.legacyEventId,
      syncStatus: 'nao_aplicavel',
      resolvidoManualmente: false,
      createdAt: now,
    };
  });

  const firstEvent = preview.events.reduce<string | null>(
    (earliest, event) => (!earliest || event.dataHora < earliest ? event.dataHora : earliest),
    null,
  );

  const session: InventorySession = {
    id: sessionId,
    nome: `Inventário importado — ${preview.fileName}`,
    status: 'ativa',
    // Início real da sessão = momento da importação. A data da leitura mais
    // antiga da planilha fica em `legacyFirstReadAt` e não é usada como início.
    startedAt: now,
    endedAt: null,
    source: 'xlsx-legado',
    importBatchId: batchId,
    createdAt: now,
    legacyFirstReadAt: firstEvent,
  };

  const batch: ImportBatch = {
    id: batchId,
    origem: 'xlsx-legado',
    fileName: preview.fileName,
    startedAt: now,
    finishedAt: null,
    status: 'aplicando',
    totalRows: preview.summary.totalAssetRows + preview.summary.totalEventRows,
    importedAssets: 0,
    importedEvents: 0,
    ignored: preview.summary.ignored,
    duplicates: preview.summary.duplicateGroups,
    warnings: preview.issues.slice(0, 50),
    errorMessage: null,
  };

  const settings: SettingRow[] = [
    {
      key: 'salaAtual',
      value: preview.configSalaAtual
        ? (roomsByKey.get(roomKey(preview.configSalaAtual))?.label ?? preview.configSalaAtual)
        : '',
      updatedAt: now,
    },
    { key: 'activeSessionId', value: sessionId, updatedAt: now },
    { key: 'lastImportBatchId', value: batchId, updatedAt: now },
  ];

  const total = assets.length + events.length;

  await db.transaction(
    'rw',
    [db.assets, db.events, db.sessions, db.settings, db.importBatches, db.rooms],
    async () => {
      await db.importBatches.add(batch);
      await addInChunks(db.rooms, rooms, undefined);

      await addInChunks(db.assets, assets, (done) =>
        onProgress?.({ phase: 'assets', done, total }),
      );
      await addInChunks(db.events, events, (done) =>
        onProgress?.({ phase: 'events', done: assets.length + done, total }),
      );

      await db.sessions.add(session);
      await db.settings.bulkPut(settings);
      await db.importBatches.update(batchId, {
        status: 'concluido',
        finishedAt: nowIso(),
        importedAssets: assets.length,
        importedEvents: events.length,
      });
    },
  );

  onProgress?.({ phase: 'finishing', done: total, total });

  return { batchId, sessionId, assets: assets.length, events: events.length };
}
