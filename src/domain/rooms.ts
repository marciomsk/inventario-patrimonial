import { cleanText, parseLocal, sameLocal } from './plaqueta';
import type { Asset, InventoryEvent } from './types';

const DIACRITICS = /[\u0300-\u036f]/g;
const NON_ALPHANUMERIC = /[^A-Z0-9]+/g;

/**
 * Normaliza o nome da sala para comparação: remove acentos, ignora caixa,
 * pontuação e espaços repetidos. Não altera o texto exibido.
 */
export function normalizeRoomName(value: unknown): string {
  return cleanText(value)
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLocaleUpperCase('pt-BR')
    .replace(NON_ALPHANUMERIC, ' ')
    .trim();
}

/**
 * Padroniza o nome exibido sem mudar o significado: travessões viram hífen
 * simples e espaços ao redor do separador são colapsados.
 */
export function normalizeRoomDisplayName(value: unknown): string {
  return cleanText(value)
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Identidade da sala. Código tem prioridade: mesmo código = mesma sala,
 * independentemente do nome. Sem código, agrupa pelo nome normalizado.
 */
export function roomKey(value: unknown): string {
  const parsed = parseLocal(value);
  if (parsed.codigo) return `C:${parsed.codigo}`;
  const normalized = normalizeRoomName(parsed.nome);
  return normalized ? `N:${normalized}` : 'N:';
}

export function roomKeyFromParts(codigo: string | null | undefined, nome: unknown): string {
  const code = cleanText(codigo);
  if (code) return `C:${code}`;
  const normalized = normalizeRoomName(nome);
  return normalized ? `N:${normalized}` : 'N:';
}

/** Rótulo canônico usado no cadastro: `código - nome` ou apenas o nome. */
export function canonicalRoomLabel(codigo: string | null | undefined, nome: unknown): string {
  const code = cleanText(codigo);
  const cleanName = normalizeRoomDisplayName(nome);
  if (!code) return cleanName;
  if (!cleanName || cleanName === code) return code;
  return `${code} - ${cleanName}`;
}

export interface RoomLabelCount {
  label: string;
  count: number;
}

export interface RoomDraft {
  key: string;
  codigo: string | null;
  nome: string;
  label: string;
  aliases: string[];
  count: number;
}

function chooseCanonicalName(
  codigo: string | null,
  entries: Array<{ label: string; count: number }>,
): string {
  const candidates = new Map<
    string,
    { nome: string; count: number; descriptive: boolean; firstSeen: number }
  >();

  entries.forEach((entry, index) => {
    const parsed = parseLocal(entry.label);
    const nome = normalizeRoomDisplayName(parsed.nome);
    if (!nome) return;
    const normalized = normalizeRoomName(nome);
    const descriptive = codigo === null || normalized !== normalizeRoomName(codigo);
    const current = candidates.get(normalized);
    if (current) {
      current.count += entry.count;
      if (descriptive && !current.descriptive) {
        current.nome = nome;
        current.descriptive = true;
      }
    } else {
      candidates.set(normalized, {
        nome,
        count: entry.count,
        descriptive,
        firstSeen: index,
      });
    }
  });

  const ordered = [...candidates.values()].sort((a, b) => {
    if (a.descriptive !== b.descriptive) return a.descriptive ? -1 : 1;
    if (a.count !== b.count) return b.count - a.count;
    if (a.nome.length !== b.nome.length) return b.nome.length - a.nome.length;
    return a.nome.localeCompare(b.nome, 'pt-BR') || a.firstSeen - b.firstSeen;
  });

  return ordered[0]?.nome ?? '';
}

/**
 * Agrupa rótulos de local em salas consolidadas. É a mesma rotina usada na
 * importação, na migração do banco e na auditoria da planilha.
 */
export function buildRoomDrafts(labels: Iterable<RoomLabelCount>): RoomDraft[] {
  const groups = new Map<
    string,
    { codigo: string | null; entries: Array<{ label: string; count: number }> }
  >();

  for (const item of labels) {
    const label = cleanText(item.label);
    if (!label) continue;
    const key = roomKey(label);
    const parsed = parseLocal(label);
    let group = groups.get(key);
    if (!group) {
      group = { codigo: parsed.codigo, entries: [] };
      groups.set(key, group);
    }
    group.entries.push({ label, count: Math.max(1, Math.trunc(item.count)) });
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const nome = chooseCanonicalName(group.codigo, group.entries);
      const aliases = [...new Set(group.entries.map((entry) => entry.label))].sort((a, b) =>
        a.localeCompare(b, 'pt-BR'),
      );
      return {
        key,
        codigo: group.codigo,
        nome,
        label: canonicalRoomLabel(group.codigo, nome),
        aliases,
        count: group.entries.reduce((total, entry) => total + entry.count, 0),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

export function countRoomLabels(labels: Iterable<string>): RoomLabelCount[] {
  const counts = new Map<string, number>();
  for (const value of labels) {
    const label = cleanText(value);
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

/**
 * Compara a sala do cadastro com a sala da leitura. Quando ambos os lados
 * possuem `roomId`, a identidade consolidada decide; o texto é apenas
 * fallback para registros antigos.
 */
export function sameRoom(
  asset: Pick<Asset, 'roomId' | 'localOriginal'>,
  event: Pick<InventoryEvent, 'roomId' | 'localBipagem'>,
): boolean {
  if (asset.roomId && event.roomId) return asset.roomId === event.roomId;
  return sameLocal(asset.localOriginal, event.localBipagem);
}
