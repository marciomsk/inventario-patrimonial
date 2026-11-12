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
import { setRoomRelatorioEntregue } from '../../db/roomRepository';
import { RoomFormModal } from './RoomFormModal';
import type { Room } from '../../domain/types';

export function RoomsPage() {
  const { assets, rooms, roomList, states, loading } = useInventoryData();
  const { push } = useToast();
  const [term, setTerm] = useState('');
  const [filialFilter, setFilialFilter] = useState<'Todas' | 'Filial 1' | 'Filial 2'>('Todas');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);

  const roomsWithFilial = useMemo(() => {
    return rooms.map((r) => {
      const reg = r.roomId
        ? roomList.find((item) => item.id === r.roomId)
        : roomList.find((item) => item.label === r.local);
      const filial = reg?.filial ?? 'Filial 1';
      return { ...r, registryRoom: reg ?? null, filial };
    });
  }, [rooms, roomList]);

  const filteredByFilial = useMemo(() => {
    if (filialFilter === 'Todas') return roomsWithFilial;
    return roomsWithFilial.filter((r) => r.filial === filialFilter);
  }, [roomsWithFilial, filialFilter]);

  const filtered = useMemo(() => {
    const clean = normalizeRoomName(term);
    if (!clean) return filteredByFilial;
    return filteredByFilial.filter(
      (room) =>
        normalizeRoomName(room.local).includes(clean) ||
        normalizeRoomName(room.nome).includes(clean) ||
        (room.codigo ?? '').includes(term.trim()) ||
        room.aliases.some((alias) => normalizeRoomName(alias).includes(clean)),
    );
  }, [filteredByFilial, term]);

  const summaryRooms = filteredByFilial;
  const pendentesCount = summaryRooms.filter((room) => room.pendentes > 0).length;
  const concluidasCount = summaryRooms.filter((room) => room.pendentes === 0 && room.total > 0).length;
  const totalItensSum = summaryRooms.reduce((acc, r) => acc + r.total, 0);
  const confItensSum = summaryRooms.reduce((acc, r) => acc + r.conferidos, 0);
  const filialPercent = totalItensSum === 0 ? 0 : confItensSum / totalItensSum;

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
          value={formatNumber(pendentesCount)}
          icon="building"
          tone="warning"
        />
        <StatCard
          label="Salas concluídas"
          value={formatNumber(concluidasCount)}
          icon="check"
          tone="success"
        />
        <StatCard
          label="Grafias unificadas"
          value={formatNumber(
            summaryRooms.reduce((total, room) => total + Math.max(0, room.aliases.length - 1), 0),
          )}
          icon="refresh"
          tone="info"
        />
        <StatCard
          label="Progresso geral"
          value={formatPercent(filialPercent)}
          icon="dashboard"
          tone="info"
        />
      </div>

      <Card>
        <div className="filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {(['Todas', 'Filial 1', 'Filial 2'] as const).map((fil) => (
              <button
                key={fil}
                type="button"
                className={`btn btn--sm ${filialFilter === fil ? 'btn--primary' : 'btn--secondary'}`}
                style={{
                  background: filialFilter === fil ? '#0f5132' : '#eef3ef',
                  color: filialFilter === fil ? '#fff' : '#14211b',
                  border: '1px solid #cdd9d2',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
                onClick={() => setFilialFilter(fil)}
              >
                {fil}
              </button>
            ))}
          </div>

          <label className="search-input search-input--sm" style={{ flex: 1, minWidth: '220px' }}>
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
                  <th>Sala / Responsável</th>
                  <th>Total</th>
                  <th>Conferidos</th>
                  <th>Pendentes</th>
                  <th>Divergentes</th>
                  <th>Progresso</th>
                  <th>Envio Responsável</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((room) => {
                  const key = room.roomId ?? `local:${room.local}`;
                  const registryRoom = room.roomId
                    ? roomList.find((r) => r.id === room.roomId) ?? null
                    : roomList.find((r) => r.label === room.local) ?? null;
                  const entregue = Boolean(registryRoom?.relatorioEntregue);
                  const isConcluida = room.pendentes === 0 && room.total > 0;

                  return (
                    <tr
                      key={key}
                      className={selectedKey === key ? 'is-selected' : ''}
                      style={{
                        backgroundColor: isConcluida ? 'rgba(220, 239, 227, 0.7)' : undefined,
                      }}
                      onClick={() => setSelectedKey(key === selectedKey ? null : key)}
                    >
                      <td>
                        <div className="room-cell">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong>{room.codigo ?? '—'}</strong>
                            {room.filial === 'Filial 2' ? (
                              <Badge tone="info">Filial 2</Badge>
                            ) : (
                              <Badge tone="neutral">Filial 1</Badge>
                            )}
                          </div>
                          <span>{room.nome}</span>
                          {registryRoom?.responsavel ? (
                            <span style={{ fontSize: '12px', color: '#166941', fontWeight: 600 }}>
                              Resp: {registryRoom.responsavel}
                            </span>
                          ) : null}
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
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className={`badge ${entregue ? 'badge-success' : 'badge-neutral'}`}
                          style={{
                            cursor: 'pointer',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            backgroundColor: entregue ? '#dcefe3' : '#eef3ef',
                            color: entregue ? '#0f5132' : '#6c7d74',
                          }}
                          onClick={async () => {
                            if (!registryRoom) {
                              push('Sala não encontrada no cadastro de registro.', 'warning');
                              return;
                            }
                            try {
                              const nextVal = !entregue;
                              await setRoomRelatorioEntregue(registryRoom.id, nextVal);
                              push(
                                nextVal
                                  ? `Relatório da sala ${room.codigo ?? room.nome} marcado como enviado.`
                                  : `Relatório marcado como pendente.`,
                                'success',
                              );
                            } catch (err) {
                              push('Erro ao atualizar status de envio.', 'error');
                            }
                          }}
                        >
                          {entregue ? '✓ Enviado' : 'Pendente'}
                        </button>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {registryRoom ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon="save"
                            onClick={() => {
                              setEditing(registryRoom);
                              setFormOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                        ) : (
                          <span className="muted">—</span>
                        )}
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
