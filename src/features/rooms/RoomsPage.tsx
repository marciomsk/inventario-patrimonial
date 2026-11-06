import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Badge, Card, CardHeader, EmptyState, ProgressBar, StatCard } from '../../components/Card';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { useInventoryData } from '../../hooks/useInventoryData';
import { useToast } from '../../app/ToastContext';
import { formatNumber, formatPercent } from '../../domain/format';
import { roomLabel } from '../../domain/plaqueta';
import { normalizeRoomName } from '../../domain/rooms';
import { exportRoomsCsv } from '../../services/export';
import { CARGA_INICIAL, SEM_LOCAL } from '../../domain/constants';
import { RoomFormModal } from './RoomFormModal';
import type { Room } from '../../domain/types';

export function RoomsPage() {
  const { assets, rooms, roomList, states, summary, loading } = useInventoryData();
  const { push } = useToast();
  const [term, setTerm] = useState('');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);

  const filtered = useMemo(() => {
    const clean = normalizeRoomName(term);
    if (!clean) return rooms;
    return rooms.filter(
      (room) =>
        normalizeRoomName(room.local).includes(clean) ||
        normalizeRoomName(room.nome).includes(clean) ||
        (room.codigo ?? '').includes(term.trim()) ||
        room.aliases.some((alias) => normalizeRoomName(alias).includes(clean)),
    );
  }, [rooms, term]);

  const selectedRoom = rooms.find(
    (room) => (room.roomId ?? `local:${room.local}`) === selectedKey,
  );

  const selectedRegistryRoom = selectedRoom?.roomId
    ? roomList.find((room) => room.id === selectedRoom.roomId) ?? null
    : null;

  const selectedAssets = useMemo(() => {
    if (!selectedRoom) return [];
    const roomId = selectedRoom.roomId;
    return assets
      .filter((asset) => {
        if (roomId) return asset.roomId === roomId;
        if (selectedRoom.local === SEM_LOCAL) return !asset.localOriginal.trim();
        return asset.localOriginal === selectedRoom.local;
      })
      .sort((a, b) => a.plaqueta.localeCompare(b.plaqueta, 'pt-BR'));
  }, [assets, selectedRoom]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit() {
    if (!selectedRegistryRoom) return;
    setEditing(selectedRegistryRoom);
    setFormOpen(true);
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow={`${formatNumber(rooms.length)} salas consolidadas`}
        title="Salas"
        subtitle="Grafias do mesmo código são somadas em uma única sala. O progresso usa a sessão ativa."
        actions={
          <>
            <Button icon="plus" onClick={openCreate}>
              Nova sala
            </Button>
            <Button
              icon="download"
              disabled={rooms.length === 0}
              onClick={() => {
                const filename = exportRoomsCsv(rooms);
                push(`Arquivo ${filename} gerado.`, 'success');
              }}
            >
              Exportar resumo
            </Button>
          </>
        }
      />

      <div className="stats-grid stats-grid--compact">
        <StatCard
          label="Salas com pendências"
          value={formatNumber(rooms.filter((room) => room.pendentes > 0).length)}
          icon="building"
          tone="warning"
        />
        <StatCard
          label="Salas concluídas"
          value={formatNumber(rooms.filter((room) => room.pendentes === 0 && room.total > 0).length)}
          icon="check"
          tone="success"
        />
        <StatCard
          label="Grafias unificadas"
          value={formatNumber(
            rooms.reduce((total, room) => total + Math.max(0, room.aliases.length - 1), 0),
          )}
          icon="refresh"
          tone="info"
        />
        <StatCard
          label="Progresso geral"
          value={formatPercent(summary.percentual)}
          icon="dashboard"
          tone="info"
        />
      </div>

      <Card>
        <div className="filters">
          <label className="search-input search-input--sm">
            <Icon name="search" size={18} />
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Buscar sala por código, nome ou grafia antiga"
              autoComplete="off"
            />
          </label>
          <span className="filters__count">{formatNumber(filtered.length)} salas</span>
        </div>

        {loading ? (
          <div className="skeleton skeleton--panel" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="building"
            title="Nenhuma sala encontrada"
            description={term ? 'Ajuste a busca.' : 'Cadastre a primeira sala.'}
            action={
              !term ? (
                <Button variant="primary" icon="plus" onClick={openCreate}>
                  Nova sala
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table table--rooms">
              <thead>
                <tr>
                  <th>Sala</th>
                  <th>Total</th>
                  <th>Conferidos</th>
                  <th>Pendentes</th>
                  <th>Divergentes</th>
                  <th>Progresso</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((room) => {
                  const key = room.roomId ?? `local:${room.local}`;
                  return (
                    <tr
                      key={key}
                      className={selectedKey === key ? 'is-selected' : ''}
                      onClick={() => setSelectedKey(key === selectedKey ? null : key)}
                    >
                      <td>
                        <div className="room-cell">
                          <strong>{room.codigo ?? '—'}</strong>
                          <span>{room.nome}</span>
                          {room.local === CARGA_INICIAL ? <Badge tone="legacy">Legado</Badge> : null}
                          {room.local === SEM_LOCAL ? <Badge tone="neutral">Sem sala</Badge> : null}
                          {room.aliases.length > 1 ? (
                            <Badge tone="info">{room.aliases.length} grafias</Badge>
                          ) : null}
                          {room.total === 0 ? <Badge tone="neutral">Sem bens</Badge> : null}
                        </div>
                      </td>
                      <td>{formatNumber(room.total)}</td>
                      <td>{formatNumber(room.conferidos)}</td>
                      <td>{formatNumber(room.pendentes)}</td>
                      <td>{formatNumber(room.divergentes)}</td>
                      <td>
                        <div className="progress-cell">
                          <ProgressBar value={room.percentual} />
                          <span>{formatPercent(room.percentual, 0)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selectedRoom ? (
        <Card>
          <CardHeader
            title={roomLabel(selectedRoom.local)}
            subtitle={`${formatNumber(selectedRoom.conferidos)} conferidos de ${formatNumber(
              selectedRoom.total,
            )} bens · ${formatNumber(selectedRoom.pendentes)} pendentes`}
            icon="building"
            action={
              <div className="row-actions">
                {selectedRegistryRoom ? (
                  <Button variant="secondary" size="sm" icon="save" onClick={openEdit}>
                    Editar sala
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" icon="close" onClick={() => setSelectedKey(null)}>
                  Fechar
                </Button>
              </div>
            }
          />

          {selectedRoom.aliases.length > 1 || selectedRegistryRoom?.responsavel ? (
            <div className="card__note">
              {selectedRegistryRoom?.responsavel ? (
                <p><strong>Responsável do setor:</strong> {selectedRegistryRoom.responsavel}</p>
              ) : null}
              {selectedRoom.aliases.length > 1 ? (
                <p>Grafias consolidadas: {selectedRoom.aliases.join(' · ')}</p>
              ) : null}
            </div>
          ) : null}

          {selectedAssets.length === 0 ? (
            <EmptyState icon="box" title="Nenhum bem nesta sala" />
          ) : (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Plaqueta</th>
                      <th>Descrição</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAssets.slice(0, 100).map((asset) => {
                      const state = states.get(asset.id);
                      return (
                        <tr key={asset.id}>
                          <td className="mono">{asset.plaqueta}</td>
                          <td>{asset.descricao || 'Sem descrição'}</td>
                          <td>
                            {state?.conferido ? (
                              <Badge tone={state.divergente ? 'warning' : 'success'}>
                                {state.divergente ? 'Divergente' : 'Conferido'}
                              </Badge>
                            ) : (
                              <Badge tone="neutral">Pendente</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {selectedAssets.length > 100 ? (
                <p className="card__note">
                  Exibindo os primeiros 100 de {formatNumber(selectedAssets.length)} bens. Use as
                  exportações para a lista completa.
                </p>
              ) : null}
            </>
          )}
        </Card>
      ) : null}

      <RoomFormModal
        open={formOpen}
        room={editing}
        onClose={() => setFormOpen(false)}
        onSaved={(room) => {
          setEditing(null);
          setSelectedKey(room.id);
        }}
      />
    </div>
  );
}
