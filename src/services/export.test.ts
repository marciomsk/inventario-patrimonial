import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { toCsv } from './export';
import { buildAuditWorkbook, buildPendingsWorkbook, buildSobrasWorkbook, buildTransfersWorkbook } from './exportXlsx';
import type { Asset, AssetSessionState, InventoryEvent, TransferRequest } from '../domain/types';

const transfer: TransferRequest = {
  id: 't1',
  assetId: 'a1',
  plaqueta: '000123',
  localOriginal: '0001 - SALA A',
  localDestino: '0002 - SALA B',
  eventId: 'e1',
  dataHora: '2026-02-01T10:00:00.000Z',
  status: 'efetivada',
  observacao: null,
  createdAt: '2026-02-01T10:00:00.000Z',
  resolvedAt: '2026-02-02T09:00:00.000Z',
};

const asset: Asset = {
  id: 'a1',
  plaqueta: '000123',
  plaquetaKey: '000123',
  descricao: 'Cadeira',
  localOriginal: '0001 - SALA A',
  localCodigo: '0001',
  localNome: 'SALA A',
  roomId: 'r1',
  idPatrimonio: null,
  statusCadastro: '✅ OK',
  observacao: null,
  legacyStatus: 'pendente',
  legacyUltimaConferencia: null,
  legacyAcaoSapiens: '',
  legacyAlerta: '',
  source: 'xlsx-legado',
  importBatchId: 'b1',
  revisaoPendente: false,
  revisaoMotivos: [],
  ativo: true,
  isManualRegister: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const event: InventoryEvent = {
  id: 'e1',
  plaqueta: '000123',
  plaquetaKey: '000123',
  assetId: 'a1',
  candidatosAssetIds: [],
  dataHora: '2026-02-01T10:00:00.000Z',
  localBipagem: '0001 - SALA A',
  roomId: 'r1',
  resultado: 'encontrado',
  observacao: null,
  acaoSapiens: null,
  inventorySessionId: 's1',
  deviceId: 'd1',
  source: 'scanner',
  legacyEventId: null,
  syncStatus: 'nao_aplicavel',
  resolvidoManualmente: false,
  createdAt: '2026-02-01T10:00:00.000Z',
};

describe('exportação preservando texto', () => {
  it('mantém zeros à esquerda no CSV entre aspas', () => {
    const csv = toCsv([transfer], [
      { header: 'Plaqueta', value: (row) => row.plaqueta },
      { header: 'Destino', value: (row) => row.localDestino },
    ]);
    expect(csv).toContain('"000123"');
    expect(csv).toContain('0002 - SALA B');
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });

  it('grava a plaqueta como texto no XLSX de transferências', () => {
    const workbook = buildTransfersWorkbook([transfer]);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const cell = sheet['A2'] as XLSX.CellObject;
    expect(cell.t).toBe('s');
    expect(cell.v).toBe('000123');
    const status = sheet['E2'] as XLSX.CellObject;
    expect(status.v).toBe('Efetivada');
    const resolved = sheet['F2'] as XLSX.CellObject;
    expect(String(resolved.v)).not.toBe('');
  });

  it('gera planilhas de auditoria, pendências e sobras corretamente', () => {
    const states = new Map<string, AssetSessionState>([
      ['a1', { conferido: true, divergent: false, ultimoEvento: event }],
    ]);
    const auditWb = buildAuditWorkbook([asset], states, [event], 's1');
    expect(auditWb.SheetNames).toContain('Auditoria_Geral');

    const pendingsWb = buildPendingsWorkbook([asset], states);
    expect(pendingsWb.SheetNames).toContain('Pendencias_Faltas');

    const sobrasWb = buildSobrasWorkbook([event], 's1');
    expect(sobrasWb.SheetNames).toContain('Sobras_Divergencias');
  });
});
