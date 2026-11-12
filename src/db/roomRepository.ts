import { db } from './database';
import { createId, nowIso } from '../domain/id';
import { cleanText, parseLocal } from '../domain/plaqueta';
import {
  canonicalRoomLabel,
  normalizeRoomDisplayName,
  roomKey,
  roomKeyFromParts,
} from '../domain/rooms';
import type { Asset, Room } from '../domain/types';

export class RoomConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoomConflictError';
  }
}

export interface RoomInput {
  codigo?: string | null;
  nome?: string | null;
  responsavel?: string | null;
  filial?: string | null;
  relatorioEntregue?: boolean;
  enviadoAoResponsavel?: boolean;
}

function validateCode(value: unknown): string | null {
  const code = cleanText(value);
  if (!code) return null;
  if (!/^\d{4}$/.test(code)) {
    throw new RoomConflictError('O código da sala deve ter exatamente 4 dígitos.');
  }
  return code;
}

function buildRoomFields(input: RoomInput): {
  codigo: string | null;
  nome: string;
  label: string;
  key: string;
} {
  const codigo = validateCode(input.codigo);
  const nome = normalizeRoomDisplayName(input.nome);
  if (!codigo && !nome) {
    throw new RoomConflictError('Informe o código ou o nome da sala.');
  }
  const label = canonicalRoomLabel(codigo, nome);
  return { codigo, nome, label, key: roomKeyFromParts(codigo, nome) };
}

export async function listRooms(): Promise<Room[]> {
  const rooms = await db.rooms.toArray();
  return rooms.sort((a, b) => {
    const codeA = a.codigo ?? '9999';
    const codeB = b.codigo ?? '9999';
    return codeA.localeCompare(codeB, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

export async function getRoom(id: string): Promise<Room | null> {
  return (await db.rooms.get(id)) ?? null;
}

export async function findRoomByKey(key: string): Promise<Room | null> {
  return (await db.rooms.where('key').equals(key).first()) ?? null;
}

export async function findRoomByLabel(label: string): Promise<Room | null> {
  const clean = cleanText(label);
  if (!clean) return null;
  const byKey = await findRoomByKey(roomKey(clean));
  if (byKey) return byKey;
  const rooms = await db.rooms.toArray();
  return (
    rooms.find(
      (room) =>
        room.label === clean ||
        room.aliases.includes(clean) ||
        canonicalRoomLabel(room.codigo, room.nome) === clean,
    ) ?? null
  );
}

/**
 * Garante uma sala consolidada para um rótulo de local. Usado ao definir a
 * sala atual e ao cadastrar um bem em campo. Se o local não existir, cria
 * uma sala com o código/nome interpretados do próprio texto.
 */
export async function ensureRoom(label: string): Promise<Room> {
  const clean = cleanText(label);
  if (!clean) throw new RoomConflictError('Informe a sala.');

  return db.transaction('rw', db.rooms, async () => {
    const key = roomKey(clean);
    const existing = await db.rooms.where('key').equals(key).first();
    if (existing) {
      // Preserva a grafia original como alias para auditoria e busca.
      if (!existing.aliases.includes(clean)) {
        await db.rooms.update(existing.id, {
          aliases: [...existing.aliases, clean].sort((a, b) => a.localeCompare(b, 'pt-BR')),
          updatedAt: nowIso(),
        });
      }
      return (await db.rooms.get(existing.id)) ?? existing;
    }

    const parsed = parseLocal(clean);
    const codigo = validateCode(parsed.codigo);
    const nome = normalizeRoomDisplayName(parsed.nome);
    const now = nowIso();
    const room: Room = {
      id: createId(),
      key,
      codigo,
      nome,
      label: canonicalRoomLabel(codigo, nome),
      aliases: [clean],
      createdAt: now,
      updatedAt: now,
    };
    await db.rooms.add(room);
    return room;
  });
}

export async function createRoom(input: RoomInput): Promise<Room> {
  const fields = buildRoomFields(input);
  const responsavel = cleanText(input.responsavel) || null;
  const filial = cleanText(input.filial) || 'Filial 1';
  const entregue = Boolean(input.relatorioEntregue || input.enviadoAoResponsavel);
  const now = nowIso();

  return db.transaction('rw', db.rooms, async () => {
    const existing = await db.rooms.where('key').equals(fields.key).first();
    if (existing) {
      throw new RoomConflictError(`Já existe uma sala com essa identidade: ${existing.label}.`);
    }
    const room: Room = {
      id: createId(),
      key: fields.key,
      codigo: fields.codigo,
      nome: fields.nome,
      label: fields.label,
      aliases: [fields.label],
      responsavel,
      filial,
      relatorioEntregue: entregue,
      enviadoAoResponsavel: entregue,
      dataEnvio: entregue ? now : null,
      createdAt: now,
      updatedAt: now,
    };
    await db.rooms.add(room);
    return room;
  });
}

export async function setRoomRelatorioEntregue(id: string, relatorioEntregue: boolean): Promise<Room> {
  return db.transaction('rw', db.rooms, async () => {
    const room = await db.rooms.get(id);
    if (!room) throw new RoomConflictError('Sala não encontrada.');
    const now = nowIso();
    const updated: Room = {
      ...room,
      relatorioEntregue,
      enviadoAoResponsavel: relatorioEntregue,
      dataEnvio: relatorioEntregue ? (room.dataEnvio ?? now) : null,
      updatedAt: now,
    };
    await db.rooms.put(updated);
    return updated;
  });
}

function assetRoomFields(room: Room): Pick<
  Asset,
  'localOriginal' | 'localCodigo' | 'localNome' | 'roomId'
> {
  return {
    localOriginal: room.label,
    localCodigo: room.codigo,
    localNome: room.nome,
    roomId: room.id,
  };
}

/**
 * Renomeia/recodifica uma sala e atualiza em cascata o local de origem dos
 * bens vinculados. O histórico de eventos permanece intacto; as leituras
 * antigas continuam ligadas pelo `roomId`.
 */
export async function updateRoom(id: string, input: RoomInput): Promise<Room> {
  const fields = buildRoomFields(input);
  const responsavel = cleanText(input.responsavel) || null;

  return db.transaction('rw', db.rooms, db.assets, db.settings, async () => {
    const room = await db.rooms.get(id);
    if (!room) throw new RoomConflictError('Sala não encontrada no cadastro local.');

    if (fields.key !== room.key) {
      const conflict = await db.rooms.where('key').equals(fields.key).first();
      if (conflict && conflict.id !== id) {
        throw new RoomConflictError(`Já existe uma sala com essa identidade: ${conflict.label}.`);
      }
    }

    const now = nowIso();
    const filial = cleanText(input.filial) || room.filial || 'Filial 1';
    const nextEntregue =
      input.relatorioEntregue !== undefined
        ? Boolean(input.relatorioEntregue)
        : input.enviadoAoResponsavel !== undefined
          ? Boolean(input.enviadoAoResponsavel)
          : room.relatorioEntregue;

    const next: Room = {
      ...room,
      codigo: fields.codigo,
      nome: fields.nome,
      label: fields.label,
      key: fields.key,
      aliases: [...new Set([...room.aliases, room.label, fields.label])].sort((a, b) =>
        a.localeCompare(b, 'pt-BR'),
      ),
      responsavel,
      filial,
      relatorioEntregue: nextEntregue,
      enviadoAoResponsavel: nextEntregue,
      dataEnvio: nextEntregue ? (room.dataEnvio ?? now) : null,
      updatedAt: now,
    };
    await db.rooms.put(next);

    const byRoomId = await db.assets.where('roomId').equals(id).toArray();
    const byOldLabel = await db.assets.where('localOriginal').equals(room.label).toArray();
    const affected = new Map<string, Asset>();
    for (const asset of [...byRoomId, ...byOldLabel]) affected.set(asset.id, asset);

    const campos = assetRoomFields(next);
    await db.assets.bulkPut(
      [...affected.values()].map((asset) => ({
        ...asset,
        ...campos,
        updatedAt: now,
      })),
    );

    const setting = await db.settings.get('salaAtual');
    if (typeof setting?.value === 'string' && setting.value.trim() === room.label) {
      await db.settings.put({ key: 'salaAtual', value: next.label, updatedAt: now });
    }

    return next;
  });
}
