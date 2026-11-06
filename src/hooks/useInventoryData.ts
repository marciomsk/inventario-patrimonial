import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { useApp } from '../app/AppContext';
import { roomKey } from '../domain/rooms';
import {
  computeAssetStates,
  computeRoomProgress,
  summarizeSession,
} from '../domain/status';

export function useInventoryData() {
  const { session } = useApp();
  const assets = useLiveQuery(() => db.assets.toArray(), []);
  const events = useLiveQuery(() => db.events.toArray(), []);
  const roomList = useLiveQuery(() => db.rooms.toArray(), []);
  const sessionId = session?.id ?? null;

  const assetList = useMemo(() => assets ?? [], [assets]);
  const eventList = useMemo(() => events ?? [], [events]);
  const roomRegistry = useMemo(() => roomList ?? [], [roomList]);

  const states = useMemo(
    () => computeAssetStates(assetList, eventList, sessionId),
    [assetList, eventList, sessionId],
  );

  const summary = useMemo(
    () => summarizeSession(assetList, eventList, sessionId),
    [assetList, eventList, sessionId],
  );

  const rooms = useMemo(
    () => computeRoomProgress(assetList, eventList, sessionId, roomRegistry),
    [assetList, eventList, sessionId, roomRegistry],
  );

  const assetsById = useMemo(
    () => new Map(assetList.map((asset) => [asset.id, asset])),
    [assetList],
  );

  const roomsById = useMemo(
    () => new Map(roomRegistry.map((room) => [room.id, room])),
    [roomRegistry],
  );

  const roomsByKey = useMemo(
    () => new Map(roomRegistry.map((room) => [room.key, room])),
    [roomRegistry],
  );

  const roomForLabel = useMemo(
    () => (label: string) => roomsByKey.get(roomKey(label)) ?? null,
    [roomsByKey],
  );

  return {
    assets: assetList,
    events: eventList,
    assetsById,
    states,
    summary,
    rooms,
    roomList: roomRegistry,
    roomsById,
    roomForLabel,
    loading: assets === undefined || events === undefined || roomList === undefined,
  };
}
