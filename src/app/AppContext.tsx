/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ensureDeviceId, getAllSettings, getActiveSession } from '../db/settingsRepository';
import type { AppSettingsMap, InventorySession } from '../domain/types';

interface AppContextValue {
  settings: AppSettingsMap | null;
  session: InventorySession | null;
  loading: boolean;
  online: boolean;
  deviceId: string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const settings = useLiveQuery(() => getAllSettings(), []);
  const session = useLiveQuery(() => getActiveSession(), []);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    void ensureDeviceId();
    // Pede armazenamento persistente para reduzir o risco de o navegador
    // descartar o IndexedDB sob pressão de espaço. Não depende de rede.
    void navigator.storage?.persist?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      settings: settings ?? null,
      session: session ?? null,
      loading: settings === undefined || session === undefined,
      online,
      deviceId: settings?.deviceId ?? '',
    }),
    [settings, session, online],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp deve ser usado dentro de AppProvider.');
  return value;
}
