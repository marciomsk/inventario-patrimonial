import { describe, expect, it } from 'vitest';
import { inspectWorkbookBuffer } from './legacyImport';
import {
  buildLegacyWorkbookBuffer,
  LEGACY_CONFIG_ROOM,
} from '../../test/fixtures/legacyWorkbook';

function preview() {
  const buffer = buildLegacyWorkbookBuffer();
  return inspectWorkbookBuffer(buffer, 'Patrimonio App (2).xlsx', buffer.byteLength);
}

describe('prévia da importação legada', () => {
  it('lê as abas e a configuração de sala atual', () => {
    const result = preview();
    expect(result.sheets).toEqual(['Patrimonio', 'Conferencia', 'Config']);
    expect(result.configSalaAtual).toBe(LEGACY_CONFIG_ROOM);
  });

  it('conta bens, leituras e linhas ignoradas', () => {
    const { summary } = preview();
    expect(summary.assetsToImport).toBe(6);
    expect(summary.eventsToImport).toBe(4);
    expect(summary.ignored).toBe(4);
    expect(summary.eventsMissingDate).toBe(1);
    expect(summary.eventsMissingLocal).toBe(1);
  });

  it('sinaliza duplicidades, placas de sala e campos vazios', () => {
    const { summary, assets } = preview();
    expect(summary.duplicateGroups).toBe(1);
    expect(summary.duplicateRows).toBe(2);
    expect(summary.roomLikeAssets).toBe(1);
    expect(summary.assetsWithoutDescription).toBe(1);
    expect(summary.assetsWithoutLocal).toBe(1);

    const duplicated = assets.filter((asset) => asset.plaqueta === '000123');
    expect(duplicated).toHaveLength(2);
    expect(duplicated.every((asset) => asset.revisaoMotivos.includes('plaqueta_duplicada'))).toBe(
      true,
    );
    expect(assets.find((asset) => asset.plaqueta === '0001')?.revisaoMotivos).toContain(
      'placa_de_sala',
    );
  });

  it('calcula divergências pela sala, não pela ação legada', () => {
    const { summary, events } = preview();
    expect(summary.divergenceEvents).toBe(1);
    expect(summary.notInCadastro).toBe(1);
    const divergent = events.find((event) => event.plaqueta === '022308');
    expect(divergent?.localBipagem).toBe('0001 - SALA A');
    expect(events.find((event) => event.plaqueta === '999999')).toBeTruthy();
  });
});
