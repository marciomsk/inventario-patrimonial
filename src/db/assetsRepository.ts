import { db } from './database';
import { createId, nowIso } from '../domain/id';
import {
  classifyPlaqueta,
  cleanText,
  isLikelyRoomPlate,
  normalizePlaqueta,
  plaquetaKey,
  sameLocal,
} from '../domain/plaqueta';
import type { Asset, InventoryEvent, ReviewReason, Room } from '../domain/types';

export async function listAssets(): Promise<Asset[]> {
  return db.assets.toArray();
}

export async function countAssets(): Promise<number> {
  return db.assets.count();
}

export async function getAsset(id: string): Promise<Asset | null> {
  return (await db.assets.get(id)) ?? null;
}

export async function findAssetsByKey(key: string): Promise<Asset[]> {
  return db.assets.where('plaquetaKey').equals(plaquetaKey(key)).toArray();
}

export async function findAssetsByPlaqueta(plaqueta: string): Promise<Asset[]> {
  return findAssetsByKey(plaqueta);
}

export async function searchAssets(term: string, limit = 60): Promise<Asset[]> {
  const clean = normalizePlaqueta(term);
  if (!clean) return [];
  const key = plaquetaKey(clean);

  const byPlaqueta = await db.assets.where('plaquetaKey').startsWith(key).limit(limit).toArray();
  if (byPlaqueta.length >= limit) return byPlaqueta;

  const seen = new Set(byPlaqueta.map((asset) => asset.id));
  const upper = clean.toLocaleUpperCase('pt-BR');
  const byText = await db.assets
    .filter(
      (asset) =>
        !seen.has(asset.id) &&
        (asset.descricao.toLocaleUpperCase('pt-BR').includes(upper) ||
          asset.localOriginal.toLocaleUpperCase('pt-BR').includes(upper)),
    )
    .limit(limit - byPlaqueta.length)
    .toArray();

  return [...byPlaqueta, ...byText];
}

export async function listRoomNames(): Promise<string[]> {
  const keys = await db.assets.orderBy('localOriginal').uniqueKeys();
  return keys
    .map((key) => String(key))
    .filter((key) => key.trim().length > 0)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export async function listAssetsByRoom(local: string): Promise<Asset[]> {
  return db.assets.where('localOriginal').equals(local).toArray();
}

export class DuplicateAssetError extends Error {
  constructor(plaqueta: string) {
    super(
      `Já existe um bem cadastrado com a plaqueta ${plaqueta}. Edite o registro existente ou resolva a duplicidade manualmente.`,
    );
    this.name = 'DuplicateAssetError';
  }
}

export class AssetValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssetValidationError';
  }
}

export interface AssetEditInput {
  plaqueta: string;
  descricao: string;
  roomId: string | null;
  statusCadastro: string;
  observacao: string | null;
}

export interface ManualAssetInput {
  plaqueta: string;
  descricao: string;
  room: Room;
  statusCadastro?: string;
  observacao?: string | null;
  sessionId: string;
  deviceId: string;
}

function reviewReasons(
  base: ReviewReason[],
  plaqueta: string,
  descricao: string,
  local: string,
): ReviewReason[] {
  const motivos = new Set(base);
  motivos.delete('descricao_ausente');
  motivos.delete('local_ausente');
  motivos.delete('plaqueta_atipica');
  motivos.delete('placa_de_sala');

  if (!descricao) motivos.add('descricao_ausente');
  if (!local) motivos.add('local_ausente');
  if (classifyPlaqueta(plaqueta).formato === 'atipica') motivos.add('plaqueta_atipica');
  if (isLikelyRoomPlate(plaqueta, descricao)) motivos.add('placa_de_sala');
  return [...motivos];
}

/**
 * Edita os dados cadastrais de um bem. O histórico de leituras não é
 * alterado: os eventos continuam com a plaqueta e a sala do momento da
 * leitura. Só bloqueia quando a nova plaqueta já pertence a outro bem.
 */
export async function updateAsset(assetId: string, input: AssetEditInput): Promise<Asset> {
  const plaqueta = normalizePlaqueta(input.plaqueta);
  if (!plaqueta) throw new AssetValidationError('Informe a plaqueta do bem.');
  const key = plaquetaKey(plaqueta);
  const descricao = cleanText(input.descricao);
  const observacao = cleanText(input.observacao) || null;
  const statusCadastro = cleanText(input.statusCadastro);

  return db.transaction('rw', db.assets, db.rooms, async () => {
    const asset = await db.assets.get(assetId);
    if (!asset) throw new AssetValidationError('Bem não encontrado no cadastro local.');

    const keyChanged = key !== asset.plaquetaKey;
    if (keyChanged) {
      const duplicates = await db.assets.where('plaquetaKey').equals(key).toArray();
      if (duplicates.some((candidate) => candidate.id !== assetId)) {
        throw new DuplicateAssetError(plaqueta);
      }
    }

    const room = input.roomId ? await db.rooms.get(input.roomId) : null;
    if (input.roomId && !room) {
      throw new AssetValidationError('Sala selecionada não encontrada no cadastro local.');
    }

    const base = asset.revisaoMotivos.filter((motivo) =>
      keyChanged ? motivo !== 'plaqueta_duplicada' : true,
    );
    const motivos = new Set(reviewReasons(base, plaqueta, descricao, room?.label ?? ''));
    if (!keyChanged) {
      const sameKey = await db.assets.where('plaquetaKey').equals(key).count();
      if (sameKey > 1) motivos.add('plaqueta_duplicada');
      else motivos.delete('plaqueta_duplicada');
    }

    const next: Asset = {
      ...asset,
      plaqueta,
      plaquetaKey: key,
      descricao,
      localOriginal: room?.label ?? '',
      localCodigo: room?.codigo ?? null,
      localNome: room?.nome ?? '',
      roomId: room?.id ?? null,
      statusCadastro,
      observacao,
      revisaoMotivos: [...motivos],
      revisaoPendente: motivos.size > 0,
      updatedAt: nowIso(),
    };
    await db.assets.put(next);
    return next;
  });
}

/**
 * Cadastra manualmente um bem lido em campo que não existia na carga
 * original. O bem passa a pertencer à sala atual da sessão e é marcado com
 * `isManualRegister` para o relatório de itens novos.
 *
 * Se houver uma leitura `nao_cadastrado` da mesma plaqueta na sessão, ela é
 * vinculada ao novo bem em vez de gerar outro evento. O texto histórico da
 * leitura nunca é reescrito.
 */
export async function createManualAsset(input: ManualAssetInput): Promise<Asset> {
  const plaqueta = normalizePlaqueta(input.plaqueta);
  if (!plaqueta) throw new AssetValidationError('Informe a plaqueta do bem.');
  if (!input.room?.label) throw new AssetValidationError('Defina a sala atual antes de cadastrar.');
  if (!input.sessionId) throw new AssetValidationError('Inicie uma sessão antes de cadastrar.');

  const key = plaquetaKey(plaqueta);
  const descricao = cleanText(input.descricao);
  const observacao = cleanText(input.observacao) || null;
  const statusCadastro = cleanText(input.statusCadastro) || 'Cadastrado em campo';

  return db.transaction('rw', db.assets, db.events, async () => {
    const existing = await db.assets.where('plaquetaKey').equals(key).count();
    if (existing > 0) throw new DuplicateAssetError(plaqueta);

    const now = nowIso();
    const asset: Asset = {
      id: createId(),
      plaqueta,
      plaquetaKey: key,
      descricao,
      localOriginal: input.room.label,
      localCodigo: input.room.codigo,
      localNome: input.room.nome,
      roomId: input.room.id,
      idPatrimonio: null,
      statusCadastro,
      observacao,
      legacyStatus: 'desconhecido',
      legacyUltimaConferencia: null,
      legacyAcaoSapiens: '',
      legacyAlerta: '',
      source: 'manual',
      importBatchId: null,
      revisaoPendente: false,
      revisaoMotivos: reviewReasons([], plaqueta, descricao, input.room.label),
      ativo: true,
      isManualRegister: true,
      createdAt: now,
      updatedAt: now,
    };
    asset.revisaoPendente = asset.revisaoMotivos.length > 0;
    await db.assets.add(asset);

    const sessionReads = await db.events
      .where('[inventorySessionId+plaquetaKey]')
      .equals([input.sessionId, key])
      .toArray();
    const pendingRead = sessionReads
      .filter(
        (event) => event.resultado === 'nao_cadastrado' && !event.assetId,
      )
      .sort((a, b) => b.dataHora.localeCompare(a.dataHora))[0];

    if (pendingRead) {
      const sameReadRoom =
        pendingRead.roomId && input.room.id
          ? pendingRead.roomId === input.room.id
          : sameLocal(pendingRead.localBipagem, input.room.label);
      await db.events.update(pendingRead.id, {
        assetId: asset.id,
        resultado: sameReadRoom ? 'encontrado' : 'divergente',
        resolvidoManualmente: true,
        observacao: pendingRead.observacao ?? observacao,
      });
    } else {
      const event: InventoryEvent = {
        id: createId(),
        plaqueta,
        plaquetaKey: key,
        assetId: asset.id,
        candidatosAssetIds: [],
        dataHora: now,
        localBipagem: input.room.label,
        roomId: input.room.id,
        resultado: 'encontrado',
        observacao,
        acaoSapiens: null,
        inventorySessionId: input.sessionId,
        deviceId: input.deviceId,
        source: 'manual',
        legacyEventId: null,
        syncStatus: 'nao_aplicavel',
        resolvidoManualmente: true,
        createdAt: now,
      };
      await db.events.add(event);
    }

    return asset;
  });
}
