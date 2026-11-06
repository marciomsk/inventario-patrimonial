import { db } from '../db/database';
import { setSetting, ensureDeviceId } from '../db/settingsRepository';
import { nowIso } from '../domain/id';
import type {
  Asset,
  ImportBatch,
  InventoryEvent,
  InventorySession,
  Room,
  SettingRow,
  TransferRequest,
} from '../domain/types';
import { downloadText, timestampForFilename } from './download';

export interface BackupData {
  assets: Asset[];
  events: InventoryEvent[];
  sessions: InventorySession[];
  settings: SettingRow[];
  importBatches: ImportBatch[];
  transferRequests: TransferRequest[];
  rooms: Room[];
}

export interface BackupFile {
  formato: 'inventario-patrimonial-backup';
  schemaVersion: 2;
  appVersion: string;
  exportedAt: string;
  counts: {
    assets: number;
    events: number;
    sessions: number;
    transferRequests: number;
    rooms: number;
  };
  data: BackupData;
}

export async function buildBackup(): Promise<BackupFile> {
  const [assets, events, sessions, settings, importBatches, transferRequests, rooms] =
    await Promise.all([
      db.assets.toArray(),
      db.events.toArray(),
      db.sessions.toArray(),
      db.settings.toArray(),
      db.importBatches.toArray(),
      db.transferRequests.toArray(),
      db.rooms.toArray(),
    ]);

  return {
    formato: 'inventario-patrimonial-backup',
    schemaVersion: 2,
    appVersion: '0.1.0',
    exportedAt: nowIso(),
    counts: {
      assets: assets.length,
      events: events.length,
      sessions: sessions.length,
      transferRequests: transferRequests.length,
      rooms: rooms.length,
    },
    data: { assets, events, sessions, settings, importBatches, transferRequests, rooms },
  };
}

export async function downloadBackup(): Promise<string> {
  const backup = await buildBackup();
  const filename = `inventario-backup_${timestampForFilename()}.json`;
  downloadText(JSON.stringify(backup, null, 2), filename, 'application/json;charset=utf-8');
  await setSetting('lastBackupAt', backup.exportedAt);
  return filename;
}

export async function hasStoredData(): Promise<boolean> {
  const [assets, events] = await Promise.all([db.assets.count(), db.events.count()]);
  return assets > 0 || events > 0;
}

export async function clearAllData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.assets,
      db.events,
      db.sessions,
      db.settings,
      db.importBatches,
      db.transferRequests,
      db.syncQueue,
      db.rooms,
    ],
    async () => {
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
    },
  );
  await ensureDeviceId();
}

