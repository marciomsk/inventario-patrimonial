import { describe, expect, it } from 'vitest';
import {
  classifyPlaqueta,
  cleanText,
  isLikelyRoomPlate,
  localKey,
  parseLocal,
  plaquetaKey,
  sameLocal,
} from './plaqueta';

describe('plaqueta', () => {
  it('preserva zeros à esquerda e o valor original', () => {
    expect(cleanText('  000123  ')).toBe('000123');
    expect(plaquetaKey('000123')).toBe('000123');
    expect(plaquetaKey('000123')).not.toBe(plaquetaKey('123'));
  });

  it('colapsa espaços e NBSP sem remover acentos', () => {
    expect(cleanText('SAL\u00a0  SÃO   JOSÉ')).toBe('SAL SÃO JOSÉ');
  });

  it('classifica os formatos conhecidos', () => {
    expect(classifyPlaqueta('0001').formato).toBe('numerica-4');
    expect(classifyPlaqueta('022308').formato).toBe('numerica-6');
    expect(classifyPlaqueta('MOV015327-000').formato).toBe('codigo-composto');
    expect(classifyPlaqueta('CON000010-001').formato).toBe('codigo-composto');
    expect(classifyPlaqueta('1 estante sp').formato).toBe('atipica');
    expect(classifyPlaqueta('0').valida).toBe(false);
    expect(classifyPlaqueta('6').valida).toBe(false);
    expect(classifyPlaqueta('').valida).toBe(false);
  });

  it('identifica provável placa de sala', () => {
    expect(isLikelyRoomPlate('0001', '0001 - COPA RESTAURANTE DO LAGO')).toBe(true);
    expect(isLikelyRoomPlate('0001', 'CADEIRA')).toBe(false);
    expect(isLikelyRoomPlate('022308', '022308 - QUALQUER')).toBe(false);
  });

  it('interpreta código e nome da sala', () => {
    expect(parseLocal('0589 - PRAIA PARK - CASCATAS')).toEqual({
      bruto: '0589 - PRAIA PARK - CASCATAS',
      codigo: '0589',
      nome: 'PRAIA PARK - CASCATAS',
    });
    expect(parseLocal('CARGA INICIAL')).toEqual({
      bruto: 'CARGA INICIAL',
      codigo: null,
      nome: 'CARGA INICIAL',
    });
  });

  it('compara salas ignorando caixa e espaços', () => {
    expect(sameLocal('Sala A', ' sala   a ')).toBe(true);
    expect(localKey('São José')).toBe(localKey('SÃO JOSÉ'));
    expect(sameLocal('Sala A', 'Sala B')).toBe(false);
  });
});
