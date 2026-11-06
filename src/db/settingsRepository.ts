import { db } from './database';
import { createId, nowIso } from '../domain/id';
import { DEFAULT_SCANNER_SETTINGS } from '../domain/constants';
import type {
  AppSettingsMap,
  ImportBatch,
  InventoryEvent,
  InventorySession,
  ScannerSettings,
  SettingKey,
} from '../domain/types';
import { sameRoom } from '../domain/rooms';

const DEFAULT_SETTINGS: AppSettingsMap = {
  salaAtual: '',
  activeSessionId: null,
  deviceId: '',
  lastImportBatchId: null,
  lastBackupAt: null,
  scanner: { ...DEFAULT_SCANNER_SETTINGS },
};

export async function getAllSettings(): Promise<AppSettingsMap> {
  const rows = await db.settings.toArray();
  const settings: AppSettingsMap = {
    ...DEFAULT_SETTINGS,
    scanner: { ...DEFAULT_SCANNER_SETTINGS },
  };
  for (const row of rows) {
    if (row.key in settings) {
      (settings as unknown as Record<string, unknown>)[row.key] = row.value;
    }
  }
  return settings;
}

export async function getSetting<K extends SettingKey>(key: K): Promise<AppSettingsMap[K]> {
  const row = await db.settings.get(key);
  const fallback = DEFAULT_SETTINGS[key];
  return (row?.value as AppSettingsMap[K] | undefined) ?? fallback;
}

export async function setSetting<K extends SettingKey>(
  key: K,
  value: AppSettingsMap[K],
): Promise<void> {
  await db.settings.put({ key, value, updatedAt: nowIso() });
}

export async function saveScannerSettings(scanner: Partial<ScannerSettings>): Promise<void> {
  const current = await getSetting('scanner');
  await setSetting('scanner', { ...current, ...scanner });
}

export async function ensureDeviceId(): Promise<string> {
  const existing = await getSetting('deviceId');
  if (existing) return existing;
  const deviceId = createId();
  await setSetting('deviceId', deviceId);
  return deviceId;
}

export async function getActiveSession(): Promise<InventorySession | null> {
  const sessions = await db.sessions.where('status').equals('ativa').toArray();
  if (sessions.length === 0) return null;
  return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
}

export async function startSession(nome: string): Promise<InventorySession> {
  return db.transaction('rw', db.sessions, db.settings, async () => {
    const now = nowIso();
    const active = await db.sessions.where('status').equals('ativa').toArray();
    for (const session of active) {
      await db.sessions.update(session.id, { status: 'encerrada', endedAt: now });
    }
    const session: InventorySession = {
      id: createId(),
      nome: nome.trim() || `Inventário ${new Date().toLocaleDateString('pt-BR')}`,
      status: 'ativa',
      startedAt: now,
      endedAt: null,
      source: 'manual',
      importBatchId: null,
      createdAt: now,
    };
    await db.sessions.add(session);
    await db.settings.put({ key: 'activeSessionId', value: session.id, updatedAt: now });
    return session;
  });
}

export async function closeActiveSession(): Promise<void> {
  const active = await getActiveSession();
  if (!active) return;
  await db.sessions.update(active.id, { status: 'encerrada', endedAt: nowIso() });
}

export async function listSessions(): Promise<InventorySession[]> {
  return db.sessions.orderBy('startedAt').reverse().toArray();
}

export async function recordEvent(event: InventoryEvent): Promise<void> {
  await db.events.add(event);
}

export async function updateEventObservation(
  eventId: string,
  observacao: string,
): Promise<void> {
  await db.events.update(eventId, { observacao: observacao.trim() || null });
}

export async function resolveDuplicateEvent(
  eventId: string,
  assetId: string,
  localBipagem: string,
): Promise<InventoryEvent | null> {
  const event = await db.events.get(eventId);
  if (!event) return null;
  const asset = await db.assets.get(assetId);
  if (!asset) return null;
  const resultado = sameRoom(asset, event) ? 'encontrado' : 'divergente';
  await db.events.update(eventId, {
    assetId: asset.id,
    resultado,
    resolvidoManualmente: true,
    localBipagem: event.localBipagem || localBipagem,
  });
  return {
    ...event,
    assetId: asset.id,
    resultado,
    resolvidoManualmente: true,
    localBipagem: event.localBipagem || localBipagem,
  };
}

export async function listSessionEvents(sessionId: string): Promise<InventoryEvent[]> {
  return db.events.where('inventorySessionId').equals(sessionId).toArray();
}

export async function listRecentEvents(limit = 12): Promise<InventoryEvent[]> {
  return db.events.orderBy('dataHora').reverse().limit(limit).toArray();
}

export async function createImportBatch(batch: ImportBatch): Promise<void> {
  await db.importBatches.add(batch);
}

export async function updateImportBatch(
  id: string,
  patch: Partial<ImportBatch>,
): Promise<void> {
  await db.importBatches.update(id, patch);
}

export async function getImportBatch(id: string): Promise<ImportBatch | null> {
  return (await db.importBatches.get(id)) ?? null;
}

export async function getLastImportBatch(): Promise<ImportBatch | null> {
  const lastId = await getSetting('lastImportBatchId');
  if (!lastId) return null;
  return getImportBatch(lastId);
}
