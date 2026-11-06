import * as XLSX from 'xlsx';

export const LEGACY_CONFIG_ROOM = '0589 - PRAIA PARK - CASCATAS';

export function buildLegacyWorkbookBuffer(): ArrayBuffer {
  const assetHeaders = [
    'Plaqueta',
    'Descricao',
    'Local_Original',
    'ID_Patrimonio',
    'Status_Cadastro',
    'Ação Sapiens',
    'Status',
    'Ultima_Conferencia',
    'Status_Geral',
    'Alerta de Transferência',
  ];

  const assets: unknown[][] = [
    assetHeaders,
    [
      '000123',
      'CADEIRA GIRATÓRIA',
      '0001 - SALA A',
      '',
      '✅ OK',
      '✅ JÁ ESTAVA NO LOCAL',
      '✅ CONFERIDO',
      new Date('2026-01-10T10:00:00.000Z'),
      'FINALIZADO',
      '✅ CONFERIDO NO LOCAL',
    ],
    [
      '000123',
      'CADEIRA GIRATÓRIA 2',
      '0001 - SALA A',
      '',
      '✅ OK',
      '✅ JÁ ESTAVA NO LOCAL',
      '✅ CONFERIDO',
      new Date('2026-01-10T10:00:00.000Z'),
      'FINALIZADO',
      '✅ CONFERIDO NO LOCAL',
    ],
    [
      '022308',
      'MESA DE REUNIÃO',
      '0002 - SALA B',
      '',
      '✅ OK',
      '⏳ AGUARDANDO CONFERÊNCIA',
      '⏳ PENDENTE',
      null,
      'AGUARDANDO',
      '',
    ],
    [
      '0001',
      '0001 - COPA RESTAURANTE',
      '0001 - COPA RESTAURANTE',
      '',
      '✅ OK',
      '✅ JÁ ESTAVA NO LOCAL',
      '✅ CONFERIDO',
      new Date('2026-01-10T10:00:00.000Z'),
      'FINALIZADO',
      '✅ CONFERIDO NO LOCAL',
    ],
    [
      '044444',
      'ARMÁRIO',
      '0001 - SALA A',
      '',
      '✅ OK',
      '✅ JÁ ESTAVA NO LOCAL',
      '✅ CONFERIDO',
      new Date('2026-01-10T10:00:00.000Z'),
      'FINALIZADO',
      '✅ CONFERIDO NO LOCAL',
    ],
    [
      '055555',
      '',
      '',
      '',
      '✅ OK',
      '⏳ AGUARDANDO CONFERÊNCIA',
      '⏳ PENDENTE',
      null,
      'AGUARDANDO',
      '',
    ],
    ['', 'SEM PLAQUETA', '0001 - SALA A', '', '', '', '', null, '', ''],
  ];

  const eventHeaders = [
    'ID',
    'Plaqueta',
    'Data_Hora',
    'Local_Bipagem',
    'Status_Cadastro',
    'Ação Sapiens',
  ];

  const events: unknown[][] = [
    eventHeaders,
    ['ev1', '000123', new Date('2026-02-01T10:00:00.000Z'), '0001 - SALA A', '✅ OK', '✅ LOCAL CORRETO'],
    ['ev2', '022308', new Date('2026-02-01T10:05:00.000Z'), '0001 - SALA A', '✅ OK', '✅ LOCAL CORRETO'],
    ['ev3', '044444', new Date('2026-02-01T10:10:00.000Z'), '0001 - SALA A', '✅ OK', '✅ LOCAL CORRETO'],
    ['ev4', '999999', new Date('2026-02-01T10:15:00.000Z'), '0003 - SALA C', '✅ OK', '✅ LOCAL CORRETO'],
    ['ev5', '044444', null, '0001 - SALA A', '✅ OK', '✅ LOCAL CORRETO'],
    ['ev6', '044444', new Date('2026-02-01T10:20:00.000Z'), '', '✅ OK', '✅ LOCAL CORRETO'],
    ['ev7', '', new Date('2026-02-01T10:25:00.000Z'), '0001 - SALA A', '✅ OK', '✅ LOCAL CORRETO'],
  ];

  const config: unknown[][] = [
    ['ID', 'Sala_Atual'],
    [1, LEGACY_CONFIG_ROOM],
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(assets), 'Patrimonio');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(events), 'Conferencia');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(config), 'Config');

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
