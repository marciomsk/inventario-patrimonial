import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '../../components/PageHeader';
import { Badge, Card, CardHeader, EmptyState, StatCard } from '../../components/Card';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Icon } from '../../components/Icon';
import { useApp } from '../../app/AppContext';
import { useToast } from '../../app/ToastContext';
import { useInventoryData } from '../../hooks/useInventoryData';
import { formatDateTime, formatNumber } from '../../domain/format';
import { roomLabel } from '../../domain/plaqueta';
import { exportDivergencesCsv, exportTransfersCsv } from '../../services/export';
import {
  createTransferRequest,
  effectivateTransfer,
  effectivateTransfers,
  listTransferRequests,
  updateTransferStatus,
} from '../../db/transferRepository';
import type { Asset, InventoryEvent, TransferStatus } from '../../domain/types';

interface DivergenceRow {
  asset: Asset;
  event: InventoryEvent;
}

const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  pendente: 'Pendente',
  enviada: 'Enviada',
  cancelada: 'Cancelada',
  efetivada: 'Efetivada',
};

function transferTone(status: TransferStatus): 'warning' | 'success' | 'neutral' {
  if (status === 'pendente') return 'warning';
  if (status === 'enviada' || status === 'efetivada') return 'success';
  return 'neutral';
}

export function DivergencesPage() {
  const { session } = useApp();
  const { assets, events, states, summary, loading } = useInventoryData();
  const { push } = useToast();
  const transfers = useLiveQuery(() => listTransferRequests(), []);
  const [target, setTarget] = useState<DivergenceRow | null>(null);
  const [destination, setDestination] = useState('');
  const [note, setNote] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<DivergenceRow | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    if (!session) return [] as DivergenceRow[];
    const list: DivergenceRow[] = [];
    for (const asset of assets) {
      const state = states.get(asset.id);
      if (state?.conferido && state.divergente && state.ultimoEvento) {
        list.push({ asset, event: state.ultimoEvento });
      }
    }
    return list.sort((a, b) => b.event.dataHora.localeCompare(a.event.dataHora));
  }, [assets, states, session]);

  const rooms = useMemo(
    () =>
      [...new Set(assets.map((asset) => asset.localOriginal).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'pt-BR'),
      ),
    [assets],
  );

  const pendingTransfers = (transfers ?? []).filter((item) => item.status === 'pendente');

  async function submitTransfer() {
    if (!target || !destination) return;
    await createTransferRequest({
      assetId: target.asset.id,
      plaqueta: target.asset.plaqueta,
      localOriginal: target.asset.localOriginal,
      localDestino: destination,
      eventId: target.event.id,
      observacao: note,
    });
    setTarget(null);
    setDestination('');
    setNote('');
    push('Solicitação de transferência registrada.', 'success');
  }

  async function confirmEffectivation() {
    if (!confirmTarget) return;
    setBusy(true);
    try {
      await effectivateTransfer({
        assetId: confirmTarget.asset.id,
        localDestino: confirmTarget.event.localBipagem,
        eventId: confirmTarget.event.id,
      });
      push('Transferência efetivada no cadastro local. O Senior não foi alterado.', 'success');
      setConfirmTarget(null);
    } catch (error) {
      push(
        error instanceof Error ? error.message : 'Falha ao efetivar a transferência.',
        'error',
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmEffectivationAll() {
    setBusy(true);
    try {
      const total = await effectivateTransfers(
        rows.map(({ asset, event }) => ({
          assetId: asset.id,
          localDestino: event.localBipagem,
          eventId: event.id,
        })),
      );
      push(
        `${formatNumber(total)} ${total === 1 ? 'transferência efetivada' : 'transferências efetivadas'} no cadastro local. O Senior não foi alterado.`,
        'success',
      );
      setConfirmAll(false);
    } catch (error) {
      push(
        error instanceof Error ? error.message : 'Falha ao efetivar as transferências.',
        'error',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow={session ? session.nome : 'Sem sessão ativa'}
        title="Divergências"
        subtitle="Bens cuja última leitura foi em sala diferente do local oficial. Efetivar altera apenas o cadastro local; o Senior não é alterado."
        actions={
          <>
            <Button
              icon="download"
              disabled={!session || rows.length === 0}
              onClick={() => {
                if (!session) return;
                const filename = exportDivergencesCsv(assets, events, session.id);
                push(`Arquivo ${filename} gerado.`, 'success');
              }}
            >
              Exportar CSV
            </Button>
            <Button
              variant="success"
              icon="check"
              disabled={!session || rows.length === 0 || busy}
              onClick={() => setConfirmAll(true)}
            >
              Efetivar todas as solicitações
            </Button>
          </>
        }
      />

      <div className="stats-grid stats-grid--compact">
        <StatCard
          label="Divergências na sessão"
          value={formatNumber(summary.divergentes)}
          icon="alert"
          tone="danger"
        />
        <StatCard
          label="Solicitações pendentes"
          value={formatNumber(pendingTransfers.length)}
          icon="refresh"
          tone="warning"
        />
        <StatCard
          label="Solicitações registradas"
          value={formatNumber(transfers?.length ?? 0)}
          icon="clipboard"
          tone="info"
        />
      </div>

      <Card>
        <CardHeader
          title="Bens divergentes"
          subtitle="Última leitura de cada bem na sessão ativa"
          icon="alert"
        />
        {loading ? (
          <div className="skeleton skeleton--panel" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="check"
            title="Nenhuma divergência pendente"
            description="Quando a última leitura de um bem for em sala diferente do cadastro, ele aparece aqui."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Plaqueta</th>
                  <th>Descrição</th>
                  <th>Local no cadastro</th>
                  <th>Local da leitura</th>
                  <th>Data</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ asset, event }) => (
                  <tr key={asset.id}>
                    <td className="mono">{asset.plaqueta}</td>
                    <td>{asset.descricao || 'Sem descrição'}</td>
                    <td>{roomLabel(asset.localOriginal)}</td>
                    <td>
                      <Badge tone="warning">{roomLabel(event.localBipagem)}</Badge>
                    </td>
                    <td className="nowrap">{formatDateTime(event.dataHora)}</td>
                    <td>
                      <div className="row-actions">
                        <Button
                          size="sm"
                          icon="refresh"
                          onClick={() => {
                            setTarget({ asset, event });
                            setDestination(event.localBipagem);
                          }}
                        >
                          Solicitar
                        </Button>
                        <Button
                          size="sm"
                          variant="success"
                          icon="check"
                          title="Efetivar transferência"
                          aria-label={`Efetivar transferência da plaqueta ${asset.plaqueta}`}
                          onClick={() => setConfirmTarget({ asset, event })}
                        >
                          Efetivar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Solicitações de transferência"
          subtitle="Histórico de intenções e efetivações. O Senior continua sendo a fonte oficial."
          icon="clipboard"
          action={
            <Button
              size="sm"
              icon="download"
              disabled={!transfers || transfers.length === 0}
              onClick={() => {
                if (!transfers) return;
                const filename = exportTransfersCsv(transfers);
                push(`Arquivo ${filename} gerado.`, 'success');
              }}
            >
              Exportar
            </Button>
          }
        />
        {!transfers || transfers.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title="Nenhuma solicitação"
            description="Use “Solicitar” ou “Efetivar” em uma divergência para registrar a mudança."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Plaqueta</th>
                  <th>Destino</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Observação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {transfers.map((item) => (
                  <tr key={item.id}>
                    <td className="mono">{item.plaqueta}</td>
                    <td>{roomLabel(item.localDestino)}</td>
                    <td className="nowrap">{formatDateTime(item.dataHora)}</td>
                    <td>
                      <Badge tone={transferTone(item.status)}>
                        {TRANSFER_STATUS_LABELS[item.status]}
                      </Badge>
                    </td>
                    <td>{item.observacao ?? '—'}</td>
                    <td>
                      {item.status === 'pendente' ? (
                        <div className="row-actions">
                          <Button
                            size="sm"
                            variant="success"
                            icon="check"
                            onClick={() => void updateTransferStatus(item.id, 'enviada')}
                          >
                            Enviada
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon="x"
                            onClick={() => void updateTransferStatus(item.id, 'cancelada')}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : item.status === 'efetivada' ? (
                        <span
                          className="muted"
                          title={
                            item.resolvedAt
                              ? `Efetivada em ${formatDateTime(item.resolvedAt)}`
                              : 'Efetivada'
                          }
                        >
                          <Icon name="check" size={16} />
                        </span>
                      ) : (
                        <Icon name="check" size={16} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        title="Solicitar transferência"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>
              Cancelar
            </Button>
            <Button variant="primary" icon="check" disabled={!destination} onClick={submitTransfer}>
              Registrar
            </Button>
          </>
        }
      >
        {target ? (
          <div className="form-stack">
            <dl className="kv kv--compact">
              <div>
                <dt>Plaqueta</dt>
                <dd>{target.asset.plaqueta}</dd>
              </div>
              <div>
                <dt>Descrição</dt>
                <dd>{target.asset.descricao || 'Sem descrição'}</dd>
              </div>
              <div>
                <dt>Local no cadastro</dt>
                <dd>{roomLabel(target.asset.localOriginal)}</dd>
              </div>
              <div>
                <dt>Encontrado em</dt>
                <dd>{roomLabel(target.event.localBipagem)}</dd>
              </div>
            </dl>
            <label className="field">
              <span>Destino pretendido</span>
              <select value={destination} onChange={(event) => setDestination(event.target.value)}>
                <option value="">Selecione uma sala</option>
                {rooms.map((room) => (
                  <option key={room} value={room}>
                    {roomLabel(room)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Observação</span>
              <textarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Informações para a equipe responsável"
              />
            </label>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        title="Efetivar transferência"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmTarget(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              variant="success"
              icon="check"
              disabled={busy}
              onClick={() => void confirmEffectivation()}
            >
              Efetivar no cadastro local
            </Button>
          </>
        }
      >
        {confirmTarget ? (
          <div className="form-stack">
            <p>
              O local oficial do bem neste aplicativo passará a ser a sala onde ele foi lido. O
              histórico de leituras é preservado e o Senior não é alterado.
            </p>
            <dl className="kv kv--compact">
              <div>
                <dt>Plaqueta</dt>
                <dd className="mono">{confirmTarget.asset.plaqueta}</dd>
              </div>
              <div>
                <dt>Local atual</dt>
                <dd>{roomLabel(confirmTarget.asset.localOriginal)}</dd>
              </div>
              <div>
                <dt>Novo local</dt>
                <dd>
                  <Badge tone="success">{roomLabel(confirmTarget.event.localBipagem)}</Badge>
                </dd>
              </div>
            </dl>
            <p className="muted">
              A mudança fica registrada em “Solicitações de transferência” e no relatório de
              exportação para atualização do Senior.
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        title="Efetivar todas as solicitações"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmAll(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button
              variant="success"
              icon="check"
              disabled={busy || rows.length === 0}
              onClick={() => void confirmEffectivationAll()}
            >
              Efetivar {formatNumber(rows.length)} no cadastro local
            </Button>
          </>
        }
      >
        <div className="form-stack">
          <p>
            Os {formatNumber(rows.length)} bens divergentes terão o local oficial atualizado para a
            sala da última leitura. Todo o histórico é mantido e o Senior não é alterado.
          </p>
          <ul className="bullet-list">
            {rows.slice(0, 8).map(({ asset, event }) => (
              <li key={asset.id}>
                <span className="mono">{asset.plaqueta}</span> · {roomLabel(asset.localOriginal)} →{' '}
                {roomLabel(event.localBipagem)}
              </li>
            ))}
            {rows.length > 8 ? <li>… e mais {formatNumber(rows.length - 8)} bens.</li> : null}
          </ul>
        </div>
      </Modal>
    </div>
  );
}
