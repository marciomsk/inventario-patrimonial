import { describe, expect, it } from 'vitest';
import { computeAssetStates, computeRoomProgress, summarizeSession } from './status';
import type { Asset, InventoryEvent } from './types';

function asset(id: string, plaqueta: string, localOriginal: string): Asset {
  return {
    id,
    plaqueta,
    plaquetaKey: plaqueta,
    descricao: `Bem ${id}`,
    localOriginal,
    localCodigo: localOriginal.slice(0, 4),
    localNome: localOriginal.slice(7),
    roomId: null,
    idPatrimonio: null,
    statusCadastro: '✅ OK',
    observacao: null,
    legacyStatus: 'pendente',
    legacyUltimaConferencia: null,
    legacyAcaoSapiens: '',
    legacyAlerta: '',
    source: 'xlsx-legado',
    importBatchId: null,
    revisaoPendente: false,
    revisaoMotivos: [],
    ativo: true,
    isManualRegister: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function event(
  id: string,
  assetId: string | null,
  sessionId: string,
  resultado: InventoryEvent['resultado'],
  plaqueta = assetId ?? '555555',
  dataHora = '2026-01-01T10:00:00.000Z',
  localBipagem = '0001 - SALA A',
): InventoryEvent {
  return {
    id,
    plaqueta,
    plaquetaKey: plaqueta,
    assetId,
    candidatosAssetIds: [],
    dataHora,
    localBipagem,
    roomId: null,
    resultado,
    observacao: null,
    acaoSapiens: null,
    inventorySessionId: sessionId,
    deviceId: 'dev',
    source: 'scanner',
    legacyEventId: null,
    syncStatus: 'nao_aplicavel',
    resolvidoManualmente: false,
    createdAt: dataHora,
  };
}

const assets = [
  asset('a1', '000001', '0001 - SALA A'),
  asset('a2', '000002', '0001 - SALA A'),
  asset('a3', '000003', '0002 - SALA B'),
  asset('a4', '000004', '0002 - SALA B'),
];

describe('status da sessão', () => {
  const events = [
    event('e1', 'a1', 's1', 'encontrado', '000001', '2026-01-01T10:00:00.000Z'),
    event('e2', 'a2', 's1', 'divergente', '000002', '2026-01-01T10:05:00.000Z', '0002 - SALA B'),
    event('e3', 'a2', 's1', 'encontrado', '000002', '2026-01-01T09:00:00.000Z'),
    event('e4', null, 's1', 'nao_cadastrado', '999999'),
    event('e5', null, 's1', 'duplicado_cadastro', '099999'),
    event('e6', null, 's1', 'nao_cadastrado', '999999'),
  ];

  it('considera conferido quem tem evento encontrado ou divergente', () => {
    const states = computeAssetStates(assets, events, 's1');
    expect(states.get('a1')?.conferido).toBe(true);
    expect(states.get('a2')?.conferido).toBe(true);
    expect(states.get('a2')?.divergente).toBe(true);
    expect(states.get('a3')?.conferido).toBe(false);
    expect(states.get('a3')?.divergente).toBe(false);
  });

  it('mantém o evento mais recente como último', () => {
    const states = computeAssetStates(assets, events, 's1');
    expect(states.get('a2')?.ultimoEvento?.id).toBe('e2');
  });

  it('não mantém divergência quando a última leitura voltou à sala correta', () => {
    const corrected = [
      event('x1', 'a3', 's1', 'divergente', '000003', '2026-01-01T10:00:00.000Z', '0001 - SALA A'),
      event('x2', 'a3', 's1', 'encontrado', '000003', '2026-01-01T11:00:00.000Z', '0002 - SALA B'),
    ];
    const states = computeAssetStates(assets, corrected, 's1');
    expect(states.get('a3')?.conferido).toBe(true);
    expect(states.get('a3')?.divergente).toBe(false);
    expect(summarizeSession(assets, corrected, 's1').divergentes).toBe(0);
  });

  it('deixa de ser divergente quando o local oficial é atualizado para a sala lida', () => {
    const moved = assets.map((item) =>
      item.id === 'a2' ? { ...item, localOriginal: '0002 - SALA B' } : item,
    );
    const states = computeAssetStates(moved, events, 's1');
    expect(states.get('a2')?.divergente).toBe(false);
    expect(states.get('a2')?.conferido).toBe(true);
    expect(states.get('a2')?.ultimoEvento?.id).toBe('e2');
  });

  it('ignora eventos de outra sessão', () => {
    const states = computeAssetStates(assets, events, 's2');
    expect(states.get('a1')?.conferido).toBe(false);
  });

  it('resume a sessão sem contar duplicados sem vínculo como conferidos', () => {
    const summary = summarizeSession(assets, events, 's1');
    expect(summary.totalAssets).toBe(4);
    expect(summary.conferidos).toBe(2);
    expect(summary.pendentes).toBe(2);
    expect(summary.divergentes).toBe(1);
    expect(summary.naoCadastrados).toBe(1);
    expect(summary.cadastroDuplicado).toBe(1);
    expect(summary.leiturasRepetidas).toBe(2);
    expect(summary.percentual).toBe(0.5);
  });

  it('agrupa progresso por sala', () => {
    const rooms = computeRoomProgress(assets, events, 's1');
    const roomA = rooms.find((room) => room.local === '0001 - SALA A');
    const roomB = rooms.find((room) => room.local === '0002 - SALA B');
    expect(roomA).toMatchObject({ total: 2, conferidos: 2, pendentes: 0, divergentes: 1 });
    expect(roomB).toMatchObject({ total: 2, conferidos: 0, pendentes: 2 });
  });
});
