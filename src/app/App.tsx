import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './AppContext';
import { ToastProvider } from './ToastContext';
import { AppShell } from './AppShell';
import { DashboardPage } from '../features/dashboard/DashboardPage';

const ScanPage = lazy(() =>
  import('../features/scan/ScanPage').then((module) => ({ default: module.ScanPage })),
);
const SearchPage = lazy(() =>
  import('../features/assets/SearchPage').then((module) => ({ default: module.SearchPage })),
);
const PendingsPage = lazy(() =>
  import('../features/pendings/PendingsPage').then((module) => ({ default: module.PendingsPage })),
);
const DivergencesPage = lazy(() =>
  import('../features/divergences/DivergencesPage').then((module) => ({
    default: module.DivergencesPage,
  })),
);
const UnknownPage = lazy(() =>
  import('../features/unknown/UnknownPage').then((module) => ({ default: module.UnknownPage })),
);
const RoomsPage = lazy(() =>
  import('../features/rooms/RoomsPage').then((module) => ({ default: module.RoomsPage })),
);
const ImportPage = lazy(() =>
  import('../features/import/ImportPage').then((module) => ({ default: module.ImportPage })),
);
const ExportPage = lazy(() =>
  import('../features/export/ExportPage').then((module) => ({ default: module.ExportPage })),
);
const SettingsPage = lazy(() =>
  import('../features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })),
);

function RouteFallback() {
  return (
    <div className="page" aria-busy="true">
      <div className="skeleton skeleton--panel" />
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <HashRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<DashboardPage />} />
                <Route path="leitura" element={<ScanPage />} />
                <Route path="consulta" element={<SearchPage />} />
                <Route path="pendencias" element={<PendingsPage />} />
                <Route path="divergencias" element={<DivergencesPage />} />
                <Route path="nao-cadastrados" element={<UnknownPage />} />
                <Route path="salas" element={<RoomsPage />} />
                <Route path="importar" element={<ImportPage />} />
                <Route path="exportar" element={<ExportPage />} />
                <Route path="configuracoes" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </HashRouter>
      </AppProvider>
    </ToastProvider>
  );
}
