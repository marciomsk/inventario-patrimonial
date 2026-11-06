import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db/database';
import { getActiveSession, getAllSettings } from '../../db/settingsRepository';
import { inspectWorkbookBuffer } from './legacyImport';
import { applyLegacyImport, ExistingDataError } from './applyLegacyImport';
import {
  buildLegacyWorkbookBuffer,
  LEGACY_CONFIG_ROOM,
} from '../../test/fixtures/legacyWorkbook';

async function resetDatabase() {
  await db.open();
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
}

function preview() {
  const buffer = buildLegacyWorkbookBuffer();
  return inspectWorkbookBuffer(buffer, 'Patrimonio App (2).xlsx', buffer.byteLength);
}

describe('aplicação da importação legada', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('grava bens, eventos e sessão ativa em uma transação', async () => {
    const result = await applyLegacyImport(preview());

    expect(result.assets).toBe(6);
    expect(result.events).toBe(4);
    expect(await db.assets.count()).toBe(6);
    expect(await db.events.count()).toBe(4);

    const session = await getActiveSession();
    expect(session?.id).toBe(result.sessionId);
    expect(session?.status).toBe('ativa');
    expect(session?.source).toBe('xlsx-legado');

    const settings = await getAllSettings();
    expect(settings.salaAtual).toBe(LEGACY_CONFIG_ROOM);
    expect(settings.activeSessionId).toBe(result.sessionId);

    const batch = await db.importBatches.get(result.batchId);
    expect(batch?.status).toBe('concluido');
    expect(batch?.importedAssets).toBe(6);
    expect(batch?.importedEvents).toBe(4);
  });

  it('registra o início da sessão na importação e preserva a leitura mais antiga', async () => {
    const before = Date.now();
    const result = await applyLegacyImport(preview());
    const session = await getActiveSession();

    expect(session?.id).toBe(result.sessionId);
    expect(session?.startedAt).toBe(session?.createdAt);
    expect(new Date(session!.startedAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(session?.legacyFirstReadAt).toBe('2026-02-01T10:00:00.000Z');
  });

  it('vincula leituras por plaqueta e calcula o resultado pela sala', async () => {
    await applyLegacyImport(preview());
    const events = await db.events.toArray();
    const byPlaqueta = new Map(events.map((event) => [event.plaqueta, event]));

    expect(byPlaqueta.get('000123')?.resultado).toBe('duplicado_cadastro');
    expect(byPlaqueta.get('000123')?.assetId).toBeNull();
    expect(byPlaqueta.get('000123')?.candidatosAssetIds).toHaveLength(2);

    expect(byPlaqueta.get('022308')?.resultado).toBe('divergente');
    expect(byPlaqueta.get('044444')?.resultado).toBe('encontrado');
    expect(byPlaqueta.get('999999')?.resultado).toBe('nao_cadastrado');
    expect(byPlaqueta.get('999999')?.assetId).toBeNull();
  });

  it('não apaga nem sobrescreve dados existentes', async () => {
    await applyLegacyImport(preview());
    await expect(applyLegacyImport(preview())).rejects.toBeInstanceOf(ExistingDataError);
    expect(await db.assets.count()).toBe(6);
    expect(await db.events.count()).toBe(4);
  });

  it('registra o lote com contagens e avisos', async () => {
    const result = await applyLegacyImport(preview());
    const batch = await db.importBatches.get(result.batchId);
    expect(batch?.ignored).toBe(4);
    expect(batch?.duplicates).toBe(1);
    expect(batch?.warnings.length).toBeGreaterThan(0);
  });
});
