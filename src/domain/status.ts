import { parseLocal } from './plaqueta';
import { sameRoom } from './rooms';
import { SEM_LOCAL } from './constants';
import type {
  Asset,
  AssetSessionState,
  InventoryEvent,
  Room,
  RoomProgress,
  SessionSummary,
} from './types';

const CONFERIDO_RESULTS = new Set(['encontrado', 'divergente']);

export function isConferidoResult(resultado: InventoryEvent['resultado']): boolean {
  return CONFERIDO_RESULTS.has(resultado);
}

/**
 * Estado de cada bem na sessão. Um bem é conferido se possui evento vinculado
 * com resultado encontrado ou divergente. Eventos de duplicidade de cadastro
 * ficam sem vínculo até a resolução manual.
 *
 * O estado "divergente" considera a **última** leitura de conferência do bem:
 * se ele foi lido em sala errada e depois na sala correta (ou teve a
 * transferência efetivada), deixa de ser divergente. Todo o histórico
 * continua armazenado.
 */
export function computeAssetStates(
  assets: Asset[],
  events: InventoryEvent[],
  sessionId: string | null,
): Map<string, AssetSessionState> {
  const states = new Map<string, AssetSessionState>();
  for (const asset of assets) {
    states.set(asset.id, { conferido: false, divergente: false, ultimoEvento: null });
  }

  if (!sessionId) return states;

  for (const event of events) {
    if (event.inventorySessionId !== sessionId) continue;
    if (!event.assetId || !isConferidoResult(event.resultado)) continue;
    const state = states.get(event.assetId);
    if (!state) continue;

    state.conferido = true;
    if (!state.ultimoEvento || event.dataHora > state.ultimoEvento.dataHora) {
      state.ultimoEvento = event;
    }
  }

  for (const asset of assets) {
    const state = states.get(asset.id);
    if (!state) continue;
    state.divergente =
      state.ultimoEvento !== null && !sameRoom(asset, state.ultimoEvento);
  }

  return states;
}

export function summarizeSession(
  assets: Asset[],
  events: InventoryEvent[],
  sessionId: string | null,
): SessionSummary {
  const activeAssets = assets.filter((asset) => asset.ativo);
  const states = computeAssetStates(activeAssets, events, sessionId);

  let conferidos = 0;
  let divergentes = 0;
  for (const asset of activeAssets) {
    const state = states.get(asset.id);
    if (state?.conferido) conferidos += 1;
    if (state?.divergente) divergentes += 1;
  }

  const sessionEvents = sessionId
    ? events.filter((event) => event.inventorySessionId === sessionId)
    : [];
  const unknown = new Set<string>();
  const duplicated = new Set<string>();
  const readsPerKey = new Map<string, number>();
  let leiturasRepetidas = 0;

  for (const event of sessionEvents) {
    if (event.resultado === 'nao_cadastrado') unknown.add(event.plaquetaKey);
    if (event.resultado === 'duplicado_cadastro') duplicated.add(event.plaquetaKey);
    const count = (readsPerKey.get(event.plaquetaKey) ?? 0) + 1;
    readsPerKey.set(event.plaquetaKey, count);
    if (count > 1) leiturasRepetidas += 1;
  }

  const totalAssets = activeAssets.length;
  const pendentes = Math.max(0, totalAssets - conferidos);

  return {
    totalAssets,
    conferidos,
    pendentes,
    divergentes,
    naoCadastrados: unknown.size,
    cadastroDuplicado: duplicated.size,
    revisaoPendente: activeAssets.filter((asset) => asset.revisaoPendente).length,
    eventos: sessionEvents.length,
    leiturasRepetidas,
    percentual: totalAssets === 0 ? 0 : conferidos / totalAssets,
  };
}

export function computeRoomProgress(
  assets: Asset[],
  events: InventoryEvent[],
  sessionId: string | null,
  roomRegistry: Room[] = [],
): RoomProgress[] {
  const activeAssets = assets.filter((asset) => asset.ativo);
  const states = computeAssetStates(activeAssets, events, sessionId);
  const rooms = new Map<string, RoomProgress>();
  const registry = new Map(roomRegistry.map((room) => [room.id, room]));

  // Salas cadastradas aparecem mesmo sem bens, para permitir conferir salas
  // recém-criadas e manter os totais estáveis após renomeações.
  for (const room of roomRegistry) {
    rooms.set(`id:${room.id}`, {
      roomId: room.id,
      local: room.label,
      codigo: room.codigo,
      nome: room.nome,
      aliases: room.aliases,
      total: 0,
      conferidos: 0,
      pendentes: 0,
      divergentes: 0,
      percentual: 0,
    });
  }

  for (const asset of activeAssets) {
    const local = asset.localOriginal.trim();
    const registryRoom = asset.roomId ? registry.get(asset.roomId) : undefined;
    const key = asset.roomId ? `id:${asset.roomId}` : `local:${local || SEM_LOCAL}`;
    let room = rooms.get(key);
    if (!room) {
      const parsed = parseLocal(local);
      room = {
        roomId: asset.roomId ?? null,
        local: registryRoom?.label ?? (local || SEM_LOCAL),
        codigo: registryRoom?.codigo ?? (local ? parsed.codigo : null),
        nome: registryRoom?.nome ?? (local ? parsed.nome : SEM_LOCAL),
        aliases: registryRoom?.aliases ?? [],
        total: 0,
        conferidos: 0,
        pendentes: 0,
        divergentes: 0,
        percentual: 0,
      };
      rooms.set(key, room);
    }

    room.total += 1;
    const state = states.get(asset.id);
    if (state?.conferido) {
      room.conferidos += 1;
      if (state.divergente) room.divergentes += 1;
    }
  }

  for (const room of rooms.values()) {
    room.pendentes = Math.max(0, room.total - room.conferidos);
    room.percentual = room.total === 0 ? 0 : room.conferidos / room.total;
  }

  return [...rooms.values()].sort((a, b) => {
    if (a.local === SEM_LOCAL) return 1;
    if (b.local === SEM_LOCAL) return -1;
    const codeA = a.codigo ?? '9999';
    const codeB = b.codigo ?? '9999';
    return codeA.localeCompare(codeB, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

export function countRepeatedReads(events: InventoryEvent[], sessionId: string): number {
  const counts = new Map<string, number>();
  let repeated = 0;
  for (const event of events) {
    if (event.inventorySessionId !== sessionId) continue;
    const count = (counts.get(event.plaquetaKey) ?? 0) + 1;
    counts.set(event.plaquetaKey, count);
    if (count > 1) repeated += 1;
  }
  return repeated;
}
