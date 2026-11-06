import type { PlaquetaFormat } from './types';

const NBSP = /\u00a0/g;
const WHITESPACE = /\s+/g;

/**
 * Limpa texto sem alterar o conteúdo relevante: remove NBSP, colapsa espaços
 * internos e apara as pontas. Acentos, zeros à esquerda e caixa são mantidos.
 */
export function cleanText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).normalize('NFC').replace(NBSP, ' ').replace(WHITESPACE, ' ').trim();
}

export function normalizePlaqueta(value: unknown): string {
  return cleanText(value);
}

/** Chave de comparação: a plaqueta original nunca é sobrescrita. */
export function plaquetaKey(value: unknown): string {
  return normalizePlaqueta(value).toLocaleUpperCase('pt-BR');
}

export interface PlaquetaClassification {
  formato: PlaquetaFormat;
  valida: boolean;
  motivo: string | null;
}

export function classifyPlaqueta(value: unknown): PlaquetaClassification {
  const plaqueta = normalizePlaqueta(value);

  if (!plaqueta || plaqueta.length < 4) {
    return { formato: 'invalida', valida: false, motivo: 'Plaqueta vazia ou curta demais.' };
  }

  if (/^\d{4}$/.test(plaqueta)) {
    return { formato: 'numerica-4', valida: true, motivo: null };
  }

  if (/^\d{6}$/.test(plaqueta)) {
    return { formato: 'numerica-6', valida: true, motivo: null };
  }

  if (/^[A-Z]{3}\d{6}-\d{3}$/.test(plaqueta)) {
    return { formato: 'codigo-composto', valida: true, motivo: null };
  }

  return {
    formato: 'atipica',
    valida: true,
    motivo: 'Formato diferente dos padrões conhecidos (4 ou 6 dígitos, AAA000000-000).',
  };
}

export function isLikelyRoomPlate(plaqueta: string, descricao: string): boolean {
  const code = normalizePlaqueta(plaqueta);
  if (!/^\d{4}$/.test(code)) return false;
  const desc = cleanText(descricao);
  return desc.toLocaleUpperCase('pt-BR').startsWith(`${code} -`);
}

export interface ParsedLocal {
  bruto: string;
  codigo: string | null;
  nome: string;
}

export function parseLocal(value: unknown): ParsedLocal {
  const bruto = cleanText(value);
  const withName = /^(\d{4})\s*-\s*(.+)$/.exec(bruto);
  if (withName) {
    return { bruto, codigo: withName[1], nome: withName[2].trim() };
  }
  const onlyCode = /^(\d{4})$/.exec(bruto);
  if (onlyCode) {
    return { bruto, codigo: onlyCode[1], nome: bruto };
  }
  return { bruto, codigo: null, nome: bruto };
}

/** Compara salas para efeito de divergência, ignorando diferenças de caixa/espaços. */
export function sameLocal(a: unknown, b: unknown): boolean {
  return localKey(a) === localKey(b);
}

export function localKey(value: unknown): string {
  return cleanText(value).toLocaleUpperCase('pt-BR');
}

export function roomLabel(local: string): string {
  const parsed = parseLocal(local);
  if (!local) return 'Sem local';
  if (parsed.codigo && parsed.nome !== local) return `${parsed.codigo} · ${parsed.nome}`;
  return local;
}
