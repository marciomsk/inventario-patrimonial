import { classifyPlaqueta, normalizePlaqueta, plaquetaKey, sameLocal } from './plaqueta';
import type { Asset, PlaquetaFormat } from './types';

export type ScanResolution =
  | {
      tipo: 'sem_sala';
      plaqueta: string;
      plaquetaKey: string;
      formato: PlaquetaFormat;
    }
  | {
      tipo: 'invalida';
      plaqueta: string;
      plaquetaKey: string;
      formato: PlaquetaFormat;
      motivo: string;
    }
  | {
      tipo: 'nao_cadastrado';
      plaqueta: string;
      plaquetaKey: string;
      formato: PlaquetaFormat;
    }
  | {
      tipo: 'duplicado_cadastro';
      plaqueta: string;
      plaquetaKey: string;
      formato: PlaquetaFormat;
      candidatos: Asset[];
    }
  | {
      tipo: 'encontrado';
      plaqueta: string;
      plaquetaKey: string;
      formato: PlaquetaFormat;
      asset: Asset;
    }
  | {
      tipo: 'divergente';
      plaqueta: string;
      plaquetaKey: string;
      formato: PlaquetaFormat;
      asset: Asset;
    };

/**
 * Decide o que fazer com uma leitura. Não grava nada e não escolhe bem
 * arbitrariamente quando há duplicidade de cadastro.
 */
export function resolveScan(
  plaquetaBruta: string,
  assets: Asset[],
  localBipagem: string,
  localBipagemId?: string | null,
): ScanResolution {
  const plaqueta = normalizePlaqueta(plaquetaBruta);
  const key = plaquetaKey(plaqueta);
  const classification = classifyPlaqueta(plaqueta);

  if (!localBipagem.trim()) {
    return { tipo: 'sem_sala', plaqueta, plaquetaKey: key, formato: classification.formato };
  }

  if (!classification.valida) {
    return {
      tipo: 'invalida',
      plaqueta,
      plaquetaKey: key,
      formato: classification.formato,
      motivo: classification.motivo ?? 'Plaqueta inválida.',
    };
  }

  const candidatos = assets.filter((asset) => asset.ativo && asset.plaquetaKey === key);

  if (candidatos.length === 0) {
    return { tipo: 'nao_cadastrado', plaqueta, plaquetaKey: key, formato: classification.formato };
  }

  if (candidatos.length > 1) {
    return {
      tipo: 'duplicado_cadastro',
      plaqueta,
      plaquetaKey: key,
      formato: classification.formato,
      candidatos: candidatos.sort((a, b) => a.plaqueta.localeCompare(b.plaqueta, 'pt-BR')),
    };
  }

  const asset = candidatos[0];
  const sameRoomRead =
    asset.roomId && localBipagemId
      ? asset.roomId === localBipagemId
      : sameLocal(asset.localOriginal, localBipagem);
  const tipo = sameRoomRead ? 'encontrado' : 'divergente';
  return {
    tipo,
    plaqueta,
    plaquetaKey: key,
    formato: classification.formato,
    asset,
  };
}
