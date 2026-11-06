import { db } from './database';
import { createId, nowIso } from '../domain/id';
import type { SyncEntity, SyncOperation, SyncQueueItem } from '../domain/types';

/**
 * Fila preparada para um backend futuro. Nesta versão não há consumidor
 * remoto; a função existe para que a camada de aplicação não precise mudar
 * quando a sincronização for habilitada.
 */
export async function enqueueSync(input: {
  entity: SyncEntity;
  entityId: string;
  operation: SyncOperation;
  payload: unknown;
}): Promise<SyncQueueItem> {
  const now = nowIso();
  const item: SyncQueueItem = {
    id: createId(),
    entity: input.entity,
    entityId: input.entityId,
    operation: input.operation,
    payload: input.payload,
    status: 'pendente',
    attempts: 0,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.syncQueue.add(item);
  return item;
}

export async function pendingSyncCount(): Promise<number> {
  return db.syncQueue.where('status').equals('pendente').count();
}
