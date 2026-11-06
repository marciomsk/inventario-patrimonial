import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { useApp } from './AppContext';
import { roomLabel } from '../domain/plaqueta';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

const groups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Operação',
    items: [
      { to: '/', label: 'Painel', icon: 'dashboard' },
      { to: '/leitura', label: 'Leitura', icon: 'scan' },
      { to: '/consulta', label: 'Consulta', icon: 'search' },
    ],
  },
  {
    title: 'Gestão',
    items: [
      { to: '/pendencias', label: 'Pendências', icon: 'clipboard' },
      { to: '/divergencias', label: 'Divergências', icon: 'alert' },
      { to: '/nao-cadastrados', label: 'Não cadastrados', icon: 'tag' },
      { to: '/salas', label: 'Salas', icon: 'building' },
    ],
  },
  {
    title: 'Dados',
    items: [
      { to: '/importar', label: 'Importar', icon: 'upload' },
      { to: '/exportar', label: 'Exportar', icon: 'download' },
      { to: '/configuracoes', label: 'Configurações', icon: 'settings' },
    ],
  },
];

const titles: Record<string, string> = {
  '/': 'Painel',
  '/leitura': 'Leitura',
  '/consulta': 'Consulta',
  '/pendencias': 'Pendências',
  '/divergencias': 'Divergências',
  '/nao-cadastrados': 'Não cadastrados',
  '/salas': 'Salas',
  '/importar': 'Importar dados',
  '/exportar': 'Exportar',
  '/configuracoes': 'Configurações',
};

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Inventário Patrimonial — início">
      <span className="brand__mark">
        <Icon name="scan" size={22} />
      </span>
      <span className="brand__text">
        <strong>Inventário</strong>
        <small>Patrimonial</small>
      </span>
    </Link>
  );
}

export function AppShell() {
  const { settings, session, online } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const title = titles[location.pathname] ?? 'Inventário';

  useEffect(() => {
    const closeDrawer = () => setDrawerOpen(false);
    window.addEventListener('hashchange', closeDrawer);
    return () => window.removeEventListener('hashchange', closeDrawer);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  const nav = (
    <nav className="nav" aria-label="Navegação principal">
      {groups.map((group) => (
        <div className="nav__group" key={group.title}>
          <span className="nav__title">{group.title}</span>
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav__link ${isActive ? 'is-active' : ''}`}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="app">
      <aside className={`sidebar ${drawerOpen ? 'is-open' : ''}`}>
        <Brand />
        {nav}
        <div className="sidebar__foot">
          <span className={`conn ${online ? 'is-online' : 'is-offline'}`}>
            <Icon name={online ? 'wifi' : 'wifiOff'} size={15} />
            {online ? 'Conectado' : 'Sem conexão'}
          </span>
          <span className="sidebar__version">v0.1.0 · dados locais</span>
        </div>
        <button
          type="button"
          className="sidebar__close"
          onClick={() => setDrawerOpen(false)}
          aria-label="Fechar menu"
        >
          <Icon name="close" size={20} />
        </button>
      </aside>

      {drawerOpen ? (
        <button
          type="button"
          className="drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-label="Fechar menu"
        />
      ) : null}

      <div className="app__body">
        <header className="topbar">
          <button
            type="button"
            className="topbar__menu"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
          >
            <Icon name="menu" size={22} />
          </button>
          <div className="topbar__title">
            <strong>{title}</strong>
            <span>{session ? session.nome : 'Sem sessão ativa'}</span>
          </div>
          <div className="topbar__right">
            <Link to="/configuracoes" className="topbar__pill" title="Sala atual">
              <Icon name="mapPin" size={15} />
              <span>{settings?.salaAtual ? roomLabel(settings.salaAtual) : 'Sala não definida'}</span>
            </Link>
            <span
              className={`topbar__conn ${online ? 'is-online' : 'is-offline'}`}
              title={online ? 'Conectado' : 'Sem conexão'}
            >
              <Icon name={online ? 'wifi' : 'wifiOff'} size={16} />
            </span>
          </div>
        </header>

        <main className="main">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Acesso rápido">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'is-active' : '')}>
          <Icon name="dashboard" size={21} />
          <span>Painel</span>
        </NavLink>
        <NavLink to="/leitura" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          <Icon name="scan" size={21} />
          <span>Leitura</span>
        </NavLink>
        <NavLink to="/consulta" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          <Icon name="search" size={21} />
          <span>Consulta</span>
        </NavLink>
        <NavLink to="/salas" className={({ isActive }) => (isActive ? 'is-active' : '')}>
          <Icon name="building" size={21} />
          <span>Salas</span>
        </NavLink>
        <button type="button" onClick={() => setDrawerOpen(true)}>
          <Icon name="menu" size={21} />
          <span>Mais</span>
        </button>
      </nav>
    </div>
  );
}
