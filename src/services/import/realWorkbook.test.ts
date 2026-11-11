import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { inspectWorkbookBuffer } from './legacyImport';

const workbookPath = resolve(process.cwd(), 'Patrimonio App (2).xlsx');
const available = existsSync(workbookPath);

/**
 * Regressão contra a planilha real. O teste é ignorado quando o arquivo de
 * referência não está presente (por exemplo, em um clone sem os dados).
 */
describe.skipIf(!available)('planilha real de referência', () => {
  it('reproduz as contagens verificadas na análise', () => {
    const buffer = readFileSync(workbookPath);
    const preview = inspectWorkbookBuffer(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      'Patrimonio App (2).xlsx',
      buffer.byteLength,
    );

    expect(preview.sheets).toEqual([
      'Conferencia',
      'Patrimonio',
      'Config',
      'ITENS_NOVOS',
      '❌ PENDENCIAS_FINAIS',
      'RESUMO_SALAS',
    ]);
    expect(preview.configSalaAtual).toBe('0589 - PRAIA PARK - CASCATAS');

    expect(preview.summary.totalAssetRows).toBe(17312);
    expect(preview.summary.assetsToImport).toBe(17312);
    expect(preview.summary.eventsToImport).toBe(13537);
    expect(preview.summary.ignored).toBe(98);
    expect(preview.summary.eventsMissingDate).toBe(96);
    expect(preview.summary.eventsMissingLocal).toBe(2);
    expect(preview.summary.duplicateGroups).toBe(16);
    expect(preview.summary.duplicateRows).toBe(32);
    expect(preview.summary.roomLikeAssets).toBe(668);
    expect(preview.summary.assetsWithoutDescription).toBe(6);
    expect(preview.summary.assetsWithoutLocal).toBe(0);
    expect(preview.summary.eventDuplicateIds).toBe(29);
    // A contagem de datas futuras depende do relógio do dia da execução
    // (a planilha tem leituras até 2027-01-18).
    expect(preview.summary.futureEvents).toBeGreaterThanOrEqual(570);
    expect(preview.summary.futureEvents).toBeLessThanOrEqual(585);
    expect(preview.summary.notInCadastro).toBe(1076);
    expect(preview.summary.divergenceEvents).toBe(526);
    expect(preview.summary.repeatedReadRows).toBe(1000);
    expect(preview.summary.roomsToCreate).toBe(654);
    expect(preview.summary.mergedRoomLabels).toBe(4);
  });
});
