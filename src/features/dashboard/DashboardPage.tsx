import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '../../components/PageHeader';
import { Card, CardHeader, EmptyState, ProgressBar, StatCard, Badge } from '../../components/Card';
import { LinkButton } from '../../components/Button';
import { ResultBadge } from '../../components/ResultBadge';
import { Icon } from '../../components/Icon';
import { useApp } from '../../app/AppContext';
import { useInventoryData } from '../../hooks/useInventoryData';
import { getLastImportBatch } from '../../db/settingsRepository';
import { formatDate, formatDateTime, formatNumber, formatPercent, isFutureDateTime } from '../../domain/format';
import { roomLabel } from '../../domain/plaqueta';
import { REVIEW_REASON_LABELS } from '../../domain/constants';
import type { ReviewReason } from '../../domain/types';

export function DashboardPage() {
  const { settings, session, loading: appLoading } = useApp();
  const { assets, events, assetsById, summary, rooms, loading } = useInventoryData();
  const lastImport = useLiveQuery(() => getLastImportBatch(), []);

  const recentEvents = useMemo(
    () =>
      [...events]
        .sort((a, b) => b.dataHora.localeCompare(a.dataHora))
        .slice(0, 8),
    [events],
  );

  const roomsToShow = useMemo(
    () =>
      [...rooms]
        .sort((a, b) => {
          if (a.local === 'CARGA INICIAL') return 1;
          if (b.local === 'CARGA INICIAL') return -1;
          return b.pendentes - a.pendentes || b.total - a.total;
        })
        .slice(0, 6),
    [rooms],
  );

  const reviewCounts = useMemo(() => {
    const counts = new Map<ReviewReason, number>();
    for (const asset of assets) {
      if (!asset.ativo) continue;
      for (const reason of asset.revisaoMotivos) {
        counts.set(reason, (counts.get(reason) ?? 0) + 1);
      }
    }
    return counts;
  }, [assets]);

  if (appLoading || loading) {
    return (
      <div className="page">
        <PageHeader title="Painel" subtitle="Carregando dados locais..." />
        <div className="stats-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="skeleton skeleton--stat" key={index} />
          ))}
        </div>
        <div className="skeleton skeleton--panel" />
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Primeiro acesso"
          title="Vamos preparar o inventário"
          subtitle="O aplicativo funciona offline e guarda tudo neste dispositivo."
        />
        <Card className="welcome">
          <div className="welcome__hero">
            <span className="welcome__icon">
              <Icon name="box" size={34} />
            </span>
            <div>
              <h2>Nenhum dado importado ainda</h2>
              <p>
                Importe a planilha de referência para carregar os bens, o histórico de leituras
                e a sala atual. A planilha original não será alterada.
              </p>
            </div>
          </div>
          <ol className="welcome__steps">
            <li>
              <strong>Importe</strong>
              <span>XLSX com as abas Patrimonio, Conferencia e Config.</span>
            </li>
            <li>
              <strong>Confira a prévia</strong>
              <span>Duplicidades, placas de sala e leituras sem data ficam visíveis.</span>
            </li>
            <li>
              <strong>Comece a ler</strong>
              <span>Escolha a sala atual e use o leitor como teclado.</span>
            </li>
          </ol>
          <div className="welcome__actions">
            <LinkButton to="/importar" variant="primary" icon="upload" size="lg">
              Importar planilha
            </LinkButton>
            <LinkButton to="/configuracoes" icon="settings" size="lg">
              Configurar dispositivo
            </LinkButton>
          </div>
          <p className="welcome__hint">
            Dica: instale o app na tela inicial do Android depois de abrir por HTTPS.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow={session ? session.nome : 'Sem sessão ativa'}
        title="Painel"
        subtitle={
          session
            ? `${
                session.source === 'xlsx-legado' ? 'Importada em' : 'Sessão iniciada em'
              } ${formatDate(session.createdAt)} · sala atual ${
                settings?.salaAtual ? roomLabel(settings.salaAtual) : 'não definida'
              }`
            : 'Nenhuma sessão ativa. Inicie uma sessão para conferir.'
        }
        actions={
          <>
            <LinkButton to="/leitura" variant="primary" icon="scan">
              Abrir leitura
            </LinkButton>
            <LinkButton to="/importar" icon="upload">
              Importar
            </LinkButton>
          </>
        }
      />

      <section className="hero-progress">
        <div className="hero-progress__text">
          <span className="hero-progress__eyebrow">Progresso da sessão</span>
          <strong>{formatPercent(summary.percentual)}</strong>
          <span>
            {formatNumber(summary.conferidos)} de {formatNumber(summary.totalAssets)} bens
            conferidos
          </span>
        </div>
        <div className="hero-progress__bar">
          <ProgressBar value={summary.percentual} label="Progresso da sessão" />
          <div className="hero-progress__legend">
            <span>
              <i className="dot dot--success" /> {formatNumber(summary.conferidos)} conferidos
            </span>
            <span>
              <i className="dot dot--neutral" /> {formatNumber(summary.pendentes)} pendentes
            </span>
            <span>
              <i className="dot dot--warning" /> {formatNumber(summary.divergentes)} divergentes
            </span>
          </div>
        </div>
        <div className="hero-progress__side">
          <span className="hero-progress__eyebrow">Leituras na sessão</span>
          <strong>{formatNumber(summary.eventos)}</strong>
          <span>{formatNumber(summary.leiturasRepetidas)} repetidas (histórico preservado)</span>
        </div>
      </section>

      <div className="stats-grid">
        <StatCard
          label="Bens ativos"
          value={formatNumber(summary.totalAssets)}
          hint={`${formatNumber(assets.length)} registros no cadastro`}
          icon="box"
        />
        <StatCard
          label="Conferidos"
          value={formatNumber(summary.conferidos)}
          hint={formatPercent(summary.percentual)}
          icon="check"
          tone="success"
        />
        <StatCard
          label="Pendentes"
          value={formatNumber(summary.pendentes)}
          hint="Ainda não lidos nesta sessão"
          icon="clipboard"
          tone="warning"
        />
        <StatCard
          label="Divergências"
          value={formatNumber(summary.divergentes)}
          hint="Bens lidos em outra sala"
          icon="alert"
          tone="danger"
        />
        <StatCard
          label="Não cadastrados"
          value={formatNumber(summary.naoCadastrados)}
          hint="Plaquetas lidas sem bem"
          icon="tag"
          tone="danger"
        />
        <StatCard
          label="Revisão de cadastro"
          value={formatNumber(summary.revisaoPendente)}
          hint="Duplicidades e placas de sala"
          icon="eye"
          tone="info"
        />
      </div>

      <div className="dashboard-grid">
        <Card className="dashboard-grid__main">
          <CardHeader
            title="Últimas leituras"
            subtitle="Histórico da sessão ativa"
            icon="history"
            action={
              <Link to="/consulta" className="text-link">
                Consultar <Icon name="chevronRight" size={14} />
              </Link>
            }
          />
          {recentEvents.length === 0 ? (
            <EmptyState
              icon="scan"
              title="Nenhuma leitura ainda"
              description="Abra a tela de leitura e bipe a primeira plaqueta."
              action={<LinkButton to="/leitura" variant="primary" icon="scan">Começar leitura</LinkButton>}
            />
          ) : (
            <ul className="event-list">
              {recentEvents.map((event) => {
                const asset = event.assetId ? assetsById.get(event.assetId) : undefined;
                return (
                  <li key={event.id} className="event-list__item">
                    <span className="event-list__icon">
                      <Icon name={event.resultado === 'divergente' ? 'alert' : 'tag'} size={16} />
                    </span>
                    <div className="event-list__body">
                      <strong>{event.plaqueta}</strong>
                      <span>{asset?.descricao || 'Sem cadastro'}</span>
                    </div>
                    <div className="event-list__meta">
                      <ResultBadge resultado={event.resultado} />
                      {isFutureDateTime(event.dataHora) ? (
                        <Badge tone="warning">Data futura</Badge>
                      ) : null}
                      <span>{formatDateTime(event.dataHora)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="dashboard-grid__side">
          <CardHeader title="Salas com mais pendências" icon="building" />
          <ul className="room-mini">
            {roomsToShow.map((room) => (
              <li key={room.local}>
                <div className="room-mini__head">
                  <span title={room.local}>{room.codigo ? `${room.codigo} · ` : ''}{room.nome}</span>
                  <strong>{formatPercent(room.percentual, 0)}</strong>
                </div>
                <ProgressBar value={room.percentual} />
                <span className="room-mini__hint">
                  {formatNumber(room.conferidos)}/{formatNumber(room.total)} ·{' '}
                  {formatNumber(room.pendentes)} pendentes
                </span>
              </li>
            ))}
          </ul>
          <Link to="/salas" className="text-link text-link--block">
            Ver todas as salas <Icon name="arrowRight" size={14} />
          </Link>
        </Card>
      </div>

      <div className="dashboard-grid">
        <Card>
          <CardHeader title="Qualidade do cadastro" subtitle="Alertas para revisão manual" icon="eye" />
          <div className="quality-list">
            {[...reviewCounts.entries()].length === 0 ? (
              <p className="muted">Nenhum alerta de cadastro.</p>
            ) : (
              [...reviewCounts.entries()].map(([reason, count]) => (
                <div className="quality-list__row" key={reason}>
                  <span>{REVIEW_REASON_LABELS[reason]}</span>
                  <Badge tone={reason === 'plaqueta_duplicada' ? 'danger' : 'warning'}>
                    {formatNumber(count)}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Origem dos dados" icon="file" />
          {lastImport ? (
            <dl className="kv">
              <div>
                <dt>Arquivo</dt>
                <dd>{lastImport.fileName}</dd>
              </div>
              <div>
                <dt>Importado em</dt>
                <dd>{formatDateTime(lastImport.finishedAt ?? lastImport.startedAt)}</dd>
              </div>
              <div>
                <dt>Bens / leituras</dt>
                <dd>
                  {formatNumber(lastImport.importedAssets)} /{' '}
                  {formatNumber(lastImport.importedEvents)}
                </dd>
              </div>
              <div>
                <dt>Ignorados</dt>
                <dd>{formatNumber(lastImport.ignored)}</dd>
              </div>
            </dl>
          ) : (
            <p className="muted">Nenhuma importação registrada.</p>
          )}
          <p className="card__note">
            O Senior continua sendo o sistema oficial. Este app não altera o cadastro oficial.
          </p>
        </Card>

        <Card>
          <CardHeader title="Ações rápidas" icon="bolt" />
          <div className="quick-actions">
            <LinkButton to="/pendencias" icon="clipboard">
              Ver pendências
            </LinkButton>
            <LinkButton to="/divergencias" icon="alert">
              Ver divergências
            </LinkButton>
            <LinkButton to="/exportar" icon="download">
              Exportar backup
            </LinkButton>
            <LinkButton to="/configuracoes" icon="settings">
              Configurações
            </LinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}
