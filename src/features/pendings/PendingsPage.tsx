import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Badge, Card, EmptyState } from '../../components/Card';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { useInventoryData } from '../../hooks/useInventoryData';
import { formatDateTime, formatNumber } from '../../domain/format';
import { roomLabel } from '../../domain/plaqueta';
import { exportPendingsCsv } from '../../services/export';
import { useToast } from '../../app/ToastContext';
import { AssetFormModal } from '../assets/AssetFormModal';
import type { Asset } from '../../domain/types';

const PAGE_SIZE = 40;

export function PendingsPage() {
  const { assets, states, summary, roomList, loading } = useInventoryData();
  const { push } = useToast();
  const [term, setTerm] = useState('');
  const [room, setRoom] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Asset | null>(null);

  const pending = useMemo(
    () =>
      assets
        .filter((asset) => asset.ativo && !states.get(asset.id)?.conferido)
        .sort(
          (a, b) =>
            a.localOriginal.localeCompare(b.localOriginal, 'pt-BR') ||
            a.plaqueta.localeCompare(b.plaqueta, 'pt-BR'),
        ),
    [assets, states],
  );

  const roomOptions = useMemo(() => {
    const names = new Set(pending.map((asset) => asset.localOriginal).filter(Boolean));
    return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [pending]);

  const filtered = useMemo(() => {
    const clean = term.trim().toLocaleUpperCase('pt-BR');
    return pending.filter((asset) => {
      if (room && asset.localOriginal !== room) return false;
      if (!clean) return true;
      return (
        asset.plaquetaKey.includes(clean) ||
        asset.descricao.toLocaleUpperCase('pt-BR').includes(clean)
      );
    });
  }, [pending, room, term]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const slice = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="page">
      <PageHeader
        eyebrow={`${formatNumber(summary.pendentes)} pendentes na sessão`}
        title="Pendências"
        subtitle="Bens ativos do cadastro sem leitura na sessão ativa."
        actions={
          <Button
            icon="download"
            onClick={() => {
              const filename = exportPendingsCsv(assets, states);
              push(`Arquivo ${filename} gerado.`, 'success');
            }}
            disabled={pending.length === 0}
          >
            Exportar CSV
          </Button>
        }
      />

      <Card>
        <div className="filters">
          <label className="search-input search-input--sm">
            <Icon name="search" size={18} />
            <input
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar por plaqueta ou descrição"
              autoComplete="off"
            />
          </label>
          <label className="field field--inline">
            <span>Sala</span>
            <select
              value={room}
              onChange={(event) => {
                setRoom(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas as salas</option>
              {roomOptions.map((option) => (
                <option key={option} value={option}>
                  {roomLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <span className="filters__count">{formatNumber(filtered.length)} itens</span>
        </div>

        {loading ? (
          <div className="skeleton skeleton--panel" />
        ) : slice.length === 0 ? (
          <EmptyState
            icon="check"
            title={pending.length === 0 ? 'Nenhuma pendência' : 'Nenhum item com esse filtro'}
            description={
              pending.length === 0
                ? 'Todos os bens ativos já foram conferidos nesta sessão.'
                : 'Ajuste a busca ou selecione outra sala.'
            }
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Plaqueta</th>
                    <th>Descrição</th>
                    <th>Sala</th>
                    <th>Revisão</th>
                    <th>Última leitura (legado)</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {slice.map((asset) => (
                    <tr key={asset.id}>
                      <td className="mono">{asset.plaqueta}</td>
                      <td>{asset.descricao || 'Sem descrição'}</td>
                      <td>{roomLabel(asset.localOriginal) || 'Sem local'}</td>
                      <td>
                        {asset.revisaoPendente ? (
                          <Badge tone="warning">Revisar</Badge>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="nowrap">
                        {asset.legacyUltimaConferencia
                          ? formatDateTime(asset.legacyUltimaConferencia)
                          : '—'}
                      </td>
                      <td>
                        <Button size="sm" icon="save" onClick={() => setEditing(asset)}>
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pager">
              <Button
                size="sm"
                icon="arrowLeft"
                disabled={current <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Anterior
              </Button>
              <span>
                Página {current} de {totalPages}
              </span>
              <Button
                size="sm"
                iconRight="arrowRight"
                disabled={current >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                Próxima
              </Button>
            </div>
          </>
        )}
      </Card>

      <AssetFormModal
        open={editing !== null}
        asset={editing}
        rooms={roomList}
        onClose={() => setEditing(null)}
        onSaved={(saved) => setEditing((current) => (current?.id === saved.id ? saved : current))}
      />
    </div>
  );
}
