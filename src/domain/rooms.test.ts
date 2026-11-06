import { describe, expect, it } from 'vitest';
import {
  buildRoomDrafts,
  canonicalRoomLabel,
  normalizeRoomName,
  roomKey,
  sameRoom,
} from './rooms';

describe('identidade de salas', () => {
  it('normaliza nome sem acentos, caixa ou pontuação', () => {
    expect(normalizeRoomName('  Sala São   José — ALA 2 ')).toBe('SALA SAO JOSE ALA 2');
  });

  it('usa o código como identidade principal', () => {
    expect(roomKey('0247 - SALA DA CANASTRA - COPA')).toBe('C:0247');
    expect(roomKey('0247 - SALA DA CANASTRA – COPA')).toBe('C:0247');
    expect(roomKey('0247')).toBe('C:0247');
    expect(roomKey('CARGA INICIAL')).toBe('N:CARGA INICIAL');
  });

  it('consolida grafias do mesmo código e prefere o nome descritivo', () => {
    const drafts = buildRoomDrafts([
      { label: '0247 - SALA DA CANASTRA - COPA', count: 24 },
      { label: '0247 - SALA DA CANASTRA – COPA', count: 1 },
      { label: '0280', count: 3 },
      { label: '0280 - SANITÁRIO MASCULINO GALPÃO CRIOULO', count: 2 },
    ]);

    const room247 = drafts.find((draft) => draft.key === 'C:0247');
    expect(room247?.label).toBe('0247 - SALA DA CANASTRA - COPA');
    expect(room247?.aliases).toHaveLength(2);

    const room280 = drafts.find((draft) => draft.key === 'C:0280');
    expect(room280?.nome).toBe('SANITÁRIO MASCULINO GALPÃO CRIOULO');
    expect(room280?.label).toBe('0280 - SANITÁRIO MASCULINO GALPÃO CRIOULO');
  });

  it('não funde salas com mesmo nome e códigos diferentes', () => {
    const drafts = buildRoomDrafts([
      { label: '0623 - RECANTO DOS FUNCIONARIOS REFEITORIO', count: 2 },
      { label: '0709 - RECANTO DOS FUNCIONARIOS REFEITORIO', count: 5 },
    ]);
    expect(drafts).toHaveLength(2);
  });

  it('monta o rótulo canônico com hífen', () => {
    expect(canonicalRoomLabel('0589', 'PRAIA PARK – CASCATAS')).toBe(
      '0589 - PRAIA PARK - CASCATAS',
    );
    expect(canonicalRoomLabel(null, 'CARGA INICIAL')).toBe('CARGA INICIAL');
    expect(canonicalRoomLabel('0280', '0280')).toBe('0280');
  });

  it('compara pela sala consolidada quando os dois lados têm roomId', () => {
    const asset = { roomId: 'r1', localOriginal: '0001 - SALA A' };
    expect(sameRoom(asset, { roomId: 'r1', localBipagem: '0001 - SALA A ' })).toBe(true);
    expect(sameRoom(asset, { roomId: 'r2', localBipagem: '0001 - SALA A' })).toBe(false);
    expect(
      sameRoom({ roomId: null, localOriginal: '0001 - SALA A' }, {
        roomId: null,
        localBipagem: ' 0001 - sala a ',
      }),
    ).toBe(true);
  });
});
