import { db } from './database';
import { createId, nowIso } from '../domain/id';
import { parseLocal } from '../domain/plaqueta';
import { findRoomByLabel } from './roomRepository';
import type { TransferRequest, TransferStatus } from '../domain/types';

export interface NewTransferRequest {
  assetId: string;
  plaqueta: string;
  localOriginal: string;
  localDestino: string;
  eventId: string;
  observacao?: string | null;
}

export interface EffectivateTransferInput {
  assetId: string;
  localDestino: string;
  eventId: string;
  observacao?: string | null;
}

export async function createTransferRequest(input: NewTransferRequest): Promise<TransferRequest> {
  const now = nowIso();
  const request: TransferRequest = {
    id: createId(),
    assetId: input.assetId,
    plaqueta: input.plaqueta,
    localOriginal: input.localOriginal,
    localDestino: input.localDestino,
    eventId: input.eventId,
    dataHora: now,
    status: 'pendente',
    observacao: input.observacao?.trim() || null,
    createdAt: now,
    resolvedAt: null,
  };
  await db.transferRequests.add(request);
  return request;
}

export async function listTransferRequests(): Promise<TransferRequest[]> {
  return db.transferRequests.orderBy('dataHora').reverse().toArray();
}

export async function updateTransferStatus(
  id: string,
  status: TransferStatus,
): Promise<void> {
  await db.transferRequests.update(id, { status });
}

/**
 * Efetiva a transferência no cadastro **local** do aplicativo: o
 * `localOriginal` do bem passa a ser a sala onde ele foi lido.
 *
 * - Os eventos históricos não são alterados nem apagados.
 * - O Senior e a planilha original continuam intactos.
 * - A mudança fica registrada em `transferRequests` com status `efetivada`
 *   e `resolvedAt`, servindo de relatório para atualização oficial.
 */
export async function effectivateTransfer(
  input: EffectivateTransferInput,
): Promise<TransferRequest> {
  return db.transaction('rw', db.assets, db.transferRequests, db.rooms, async () => {
    return effectivateInTransaction(input, nowIso());
  });
}

/**
 * Efetiva várias transferências em uma única transação. Se qualquer bem
 * estiver ausente ou o destino for inválido, nada é gravado.
 */
export async function effectivateTransfers(
  inputs: EffectivateTransferInput[],
): Promise<number> {
  if (inputs.length === 0) return 0;
  return db.transaction('rw', db.assets, db.transferRequests, db.rooms, async () => {
    const now = nowIso();
    for (const input of inputs) {
      await effectivateInTransaction(input, now);
    }
    return inputs.length;
  });
}

async function effectivateInTransaction(
  input: EffectivateTransferInput,
  now: string,
): Promise<TransferRequest> {
  const asset = await db.assets.get(input.assetId);
  if (!asset) {
    throw new Error('Bem não encontrado no cadastro local.');
  }

  const localDestino = input.localDestino.trim();
  if (!localDestino) {
    throw new Error('Sala de destino não informada.');
  }

  const room = await findRoomByLabel(localDestino);
  const canonicalLabel = room?.label ?? localDestino;
  const parsed = parseLocal(canonicalLabel);
  const revisaoMotivos = asset.revisaoMotivos.filter((motivo) => motivo !== 'local_ausente');
  await db.assets.update(asset.id, {
    localOriginal: canonicalLabel,
    localCodigo: room?.codigo ?? parsed.codigo,
    localNome: room?.nome ?? parsed.nome,
    roomId: room?.id ?? null,
    revisaoMotivos,
    updatedAt: now,
  });

  const request = await findOpenRequest(asset.id);
  if (request) {
    await db.transferRequests.update(request.id, {
      status: 'efetivada',
      localDestino,
      resolvedAt: now,
      observacao: request.observacao ?? input.observacao?.trim() ?? null,
    });
    return {
      ...request,
      status: 'efetivada',
      localDestino,
      resolvedAt: now,
    };
  }

  const created: TransferRequest = {
    id: createId(),
    assetId: asset.id,
    plaqueta: asset.plaqueta,
    localOriginal: asset.localOriginal,
    localDestino,
    eventId: input.eventId,
    dataHora: now,
    status: 'efetivada',
    observacao: input.observacao?.trim() || null,
    createdAt: now,
    resolvedAt: now,
  };
  await db.transferRequests.add(created);
  return created;
}

async function findOpenRequest(assetId: string): Promise<TransferRequest | undefined> {
  const requests = await db.transferRequests.where('assetId').equals(assetId).toArray();
  return requests
    .filter((item) => item.status === 'pendente' || item.status === 'enviada')
    .sort((a, b) => b.dataHora.localeCompare(a.dataHora))[0];
}
