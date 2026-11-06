import { describe, expect, it } from 'vitest';
import { resolveScan } from './scan';
import type { Asset } from './types';

function asset(partial: Partial<Asset> & Pick<Asset, 'id' | 'plaqueta'>): Asset {
  return {
    plaquetaKey: partial.plaqueta.toLocaleUpperCase('pt-BR'),
    descricao: 'Bem de teste',
    localOriginal: '0001 - SALA A',
    localCodigo: '0001',
    localNome: 'SALA A',
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
    ...partial,
  };
}

const assets = [
  asset({ id: 'a1', plaqueta: '000123' }),
  asset({ id: 'a2', plaqueta: '022308', localOriginal: '0002 - SALA B' }),
  asset({ id: 'd1', plaqueta: '099999', localOriginal: '0001 - SALA A' }),
  asset({ id: 'd2', plaqueta: '099999', localOriginal: '0002 - SALA B' }),
];

describe('resolveScan', () => {
  it('não decide sem sala atual', () => {
    expect(resolveScan('000123', assets, '  ').tipo).toBe('sem_sala');
  });

  it('registra plaqueta inválida', () => {
    const result = resolveScan('0', assets, '0001 - SALA A');
    expect(result.tipo).toBe('invalida');
  });

  it('encontra bem na sala correta', () => {
    const result = resolveScan('000123', assets, '0001 - Sala A');
    expect(result.tipo).toBe('encontrado');
  });

  it('detecta divergência sem alterar o bem', () => {
    const result = resolveScan('000123', assets, '0002 - SALA B');
    expect(result.tipo).toBe('divergente');
    if (result.tipo === 'divergente') {
      expect(result.asset.localOriginal).toBe('0001 - SALA A');
    }
  });

  it('não escolhe bem quando o cadastro é duplicado', () => {
    const result = resolveScan('099999', assets, '0001 - SALA A');
    expect(result.tipo).toBe('duplicado_cadastro');
    if (result.tipo === 'duplicado_cadastro') {
      expect(result.candidatos).toHaveLength(2);
    }
  });

  it('sinaliza plaqueta sem cadastro', () => {
    expect(resolveScan('555555', assets, '0001 - SALA A').tipo).toBe('nao_cadastrado');
  });
});
