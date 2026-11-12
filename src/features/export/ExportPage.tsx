import { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '../../components/PageHeader';
import { Card, CardHeader, StatCard } from '../../components/Card';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { useApp } from '../../app/AppContext';
import { useToast } from '../../app/ToastContext';
import { useInventoryData } from '../../hooks/useInventoryData';
import { getSetting } from '../../db/settingsRepository';
import { downloadBackup } from '../../services/backup';
import { updateRoom, setRoomRelatorioEntregue } from '../../db/roomRepository';
import {
  exportAssetsCsv,
  exportAuditCsv,
  exportEventsCsv,
  exportManualAssetsCsv,
  exportPendingsCsv,
  exportSessionEventsCsv,
  exportSobrasCsv,
  exportTransfersCsv,
} from '../../services/export';
import {
  exportAuditXlsx,
  exportPendingsXlsx,
  exportSobrasXlsx,
  exportTransfersXlsx,
} from '../../services/exportXlsx';
import { generateRoomPdfReport, generateResponsiblePdfReport, generateFilialPdfReport } from '../../services/pdfReport';
import { listTransferRequests } from '../../db/transferRepository';
import { formatDateTime, formatNumber } from '../../domain/format';

export function ExportPage() {
  const { session } = useApp();
  const { assets, events, assetsById, states, roomList, summary } = useInventoryData();
  const { push } = useToast();
  const lastBackupAt = useLiveQuery(() => getSetting('lastBackupAt'), []);
  const transfers = useLiveQuery(() => listTransferRequests(), []);

  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [roomSearchTerm, setRoomSearchTerm] = useState('');
  const [roomResponsavelInput, setRoomResponsavelInput] = useState('');
  const [roomFilialInput, setRoomFilialInput] = useState('Filial 1');
  const [roomEntregueInput, setRoomEntregueInput] = useState(false);
  const [selectedResponsible, setSelectedResponsible] = useState('');
  const [selectedFilial, setSelectedFilial] = useState('Filial 1');

  const sessionId = session?.id ?? null;

  const selectedRoom = useMemo(
    () => roomList.find((r) => r.id === selectedRoomId) ?? null,
    [roomList, selectedRoomId],
  );

  useEffect(() => {
    if (selectedRoom) {
      setRoomResponsavelInput(selectedRoom.responsavel ?? '');
      setRoomFilialInput(selectedRoom.filial ?? 'Filial 1');
      setRoomEntregueInput(Boolean(selectedRoom.relatorioEntregue));
    } else {
      setRoomResponsavelInput('');
      setRoomFilialInput('Filial 1');
      setRoomEntregueInput(false);
    }
  }, [selectedRoom]);

  const sortedRooms = useMemo(() => {
    return [...roomList].sort((a, b) => {
      const codeA = a.codigo ?? '9999';
      const codeB = b.codigo ?? '9999';
      return codeA.localeCompare(codeB, 'pt-BR') || a.label.localeCompare(b.label, 'pt-BR');
    });
  }, [roomList]);

  const filteredRooms = useMemo(() => {
    const term = roomSearchTerm.trim().toLowerCase();
    if (!term) return sortedRooms;
    return sortedRooms.filter(
      (r) =>
        r.label.toLowerCase().includes(term) ||
        (r.codigo && r.codigo.toLowerCase().includes(term)) ||
        (r.responsavel && r.responsavel.toLowerCase().includes(term)),
    );
  }, [sortedRooms, roomSearchTerm]);

  const responsibles = useMemo(() => {
    const set = new Set<string>();
    for (const r of roomList) {
      if (r.responsavel?.trim()) set.add(r.responsavel.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [roomList]);

  function notify(filename: string) {
    push(`Arquivo ${filename} gerado.`, 'success');
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Dados"
        title="Exportar"
        subtitle="Backup completo e relatórios em CSV compatíveis com Excel pt-BR."
      />

      <div className="stats-grid stats-grid--compact">
        <StatCard label="Bens" value={formatNumber(assets.length)} icon="box" />
        <StatCard label="Leituras" value={formatNumber(events.length)} icon="history" tone="info" />
        <StatCard
          label="Último backup"
          value={lastBackupAt ? formatDateTime(lastBackupAt) : 'Nunca'}
          icon="save"
          tone={lastBackupAt ? 'success' : 'warning'}
        />
      </div>

      <div className="export-grid">
        <Card className="export-card export-card--primary">
          <CardHeader
            title="Backup completo (JSON)"
            subtitle="Bens, leituras, sessões, configurações, lotes e solicitações."
            icon="save"
          />
          <p>
            Guarde este arquivo antes de limpar a base ou trocar de dispositivo. O backup preserva
            todo o histórico de leituras, inclusive as repetidas.
          </p>
          <Button
            variant="primary"
            size="lg"
            icon="download"
            onClick={async () => {
              const filename = await downloadBackup();
              notify(filename);
            }}
          >
            Baixar backup
          </Button>
          <p className="card__note">
            <Icon name="info" size={14} /> Nunca afirmamos que o backup foi feito sem gerar o
            arquivo. Após o download, a data fica registrada.
          </p>
        </Card>

        <Card className="export-card">
          <CardHeader title="Bens do cadastro" subtitle="CSV com revisão e origem" icon="box" />
          <Button
            icon="download"
            disabled={assets.length === 0}
            onClick={() => notify(exportAssetsCsv(assets))}
          >
            Exportar bens
          </Button>
        </Card>

        <Card className="export-card">
          <CardHeader
            title="Itens novos (cadastro manual)"
            subtitle="Bens cadastrados em campo, fora da carga original"
            icon="plus"
          />
          <Button
            icon="download"
            disabled={!assets.some((asset) => asset.isManualRegister)}
            onClick={() => notify(exportManualAssetsCsv(assets, events, sessionId))}
          >
            Exportar itens novos
          </Button>
        </Card>

        <Card className="export-card">
          <CardHeader
            title="Leituras da sessão"
            subtitle="CSV do histórico da sessão ativa"
            icon="history"
          />
          <Button
            icon="download"
            disabled={!sessionId}
            onClick={() => {
              if (!sessionId) return;
              notify(exportSessionEventsCsv(events, assetsById, sessionId));
            }}
          >
            Exportar leituras
          </Button>
        </Card>

        <Card className="export-card">
          <CardHeader
            title="Todas as leituras"
            subtitle="Histórico completo, todas as sessões"
            icon="history"
          />
          <Button
            icon="download"
            disabled={events.length === 0}
            onClick={() => notify(exportEventsCsv(events, assetsById))}
          >
            Exportar histórico
          </Button>
        </Card>

        <Card className="export-card export-card--primary">
          <CardHeader
            title="Relatório Geral de Auditoria"
            subtitle="Todos os bens com status, sala encontrada e data na sessão ativa"
            icon="clipboard"
          />
          <p>
            Visão completa do inventário reunindo o cadastro base e o resultado da conferência atual.
          </p>
          <div className="row-actions">
            <Button
              variant="primary"
              icon="download"
              disabled={!sessionId || assets.length === 0}
              onClick={() => {
                if (!sessionId) return;
                notify(exportAuditCsv(assets, states, events, sessionId));
              }}
            >
              Exportar CSV
            </Button>
            <Button
              variant="secondary"
              icon="download"
              disabled={!sessionId || assets.length === 0}
              onClick={() => {
                if (!sessionId) return;
                notify(exportAuditXlsx(assets, states, events, sessionId));
              }}
            >
              Exportar XLSX
            </Button>
          </div>
        </Card>

        <Card className="export-card">
          <CardHeader
            title="Pendências (Faltas)"
            subtitle="Bens sem leitura na sessão ativa"
            icon="clipboard"
          />
          <div className="row-actions">
            <Button
              icon="download"
              disabled={!sessionId || summary.pendentes === 0}
              onClick={() => notify(exportPendingsCsv(assets, states))}
            >
              CSV
            </Button>
            <Button
              icon="download"
              disabled={!sessionId || summary.pendentes === 0}
              onClick={() => notify(exportPendingsXlsx(assets, states))}
            >
              XLSX
            </Button>
          </div>
        </Card>

        <Card className="export-card">
          <CardHeader
            title="Sobras e Divergências"
            subtitle="Itens em sala divergente ou não cadastrados"
            icon="alert"
          />
          <div className="row-actions">
            <Button
              icon="download"
              disabled={!sessionId}
              onClick={() => notify(exportSobrasCsv(events, sessionId ?? ''))}
            >
              CSV
            </Button>
            <Button
              icon="download"
              disabled={!sessionId}
              onClick={() => notify(exportSobrasXlsx(events, sessionId ?? ''))}
            >
              XLSX
            </Button>
          </div>
        </Card>

        <Card className="export-card">
          <CardHeader
            title="Relatório PDF por Sala (Setor)"
            subtitle="Laudo detalhado com bens, status e bloco de assinatura"
            icon="building"
          />
          <div className="form-stack">
            <label className="field">
              <span>Buscar sala (código ou nome)</span>
              <input
                value={roomSearchTerm}
                onChange={(e) => setRoomSearchTerm(e.target.value)}
                placeholder="Ex.: 0589, Praia..."
                autoComplete="off"
              />
            </label>

            <label className="field">
              <span>Selecione a sala ({filteredRooms.length} encontradas)</span>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
              >
                <option value="">Selecione uma sala...</option>
                {filteredRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label} {r.responsavel ? `[Resp: ${r.responsavel}]` : ''} {r.relatorioEntregue ? '✓ [Entregue]' : ''}
                  </option>
                ))}
              </select>
            </label>

            {selectedRoom ? (
              <div className="box" style={{ background: '#f7faf8', padding: '12px', borderRadius: '8px', border: '1px solid #e0e8e3' }}>
                <label className="field" style={{ marginBottom: '10px' }}>
                  <span>Filial da Sala</span>
                  <select
                    value={roomFilialInput}
                    onChange={async (e) => {
                      const val = e.target.value;
                      setRoomFilialInput(val);
                      try {
                        await updateRoom(selectedRoom.id, {
                          codigo: selectedRoom.codigo,
                          nome: selectedRoom.nome,
                          responsavel: roomResponsavelInput,
                          filial: val,
                        });
                        push('Filial atualizada com sucesso.', 'success');
                      } catch (err) {
                        push('Erro ao atualizar filial.', 'error');
                      }
                    }}
                  >
                    <option value="Filial 1">Filial 1</option>
                    <option value="Filial 2">Filial 2</option>
                  </select>
                </label>

                <label className="field" style={{ marginBottom: '10px' }}>
                  <span>Vincular / Alterar Responsável</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      value={roomResponsavelInput}
                      onChange={(e) => setRoomResponsavelInput(e.target.value)}
                      placeholder="Nome do responsável do setor"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        try {
                          await updateRoom(selectedRoom.id, {
                            codigo: selectedRoom.codigo,
                            nome: selectedRoom.nome,
                            responsavel: roomResponsavelInput,
                            filial: roomFilialInput,
                          });
                          push('Responsável atualizado com sucesso.', 'success');
                        } catch (err) {
                          push(err instanceof Error ? err.message : 'Erro ao atualizar responsável.', 'error');
                        }
                      }}
                    >
                      Salvar
                    </Button>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#0f5132' }}>
                  <input
                    type="checkbox"
                    checked={roomEntregueInput}
                    onChange={async (e) => {
                      const val = e.target.checked;
                      setRoomEntregueInput(val);
                      try {
                        await setRoomRelatorioEntregue(selectedRoom.id, val);
                        push(val ? 'Marcado como relatório entregue.' : 'Marcado como relatório não entregue.', 'success');
                      } catch (err) {
                        push('Erro ao atualizar status de entrega.', 'error');
                      }
                    }}
                  />
                  Relatório entregue ao responsável
                </label>
              </div>
            ) : null}

            <Button
              variant="primary"
              icon="download"
              disabled={!selectedRoomId}
              onClick={() => {
                const room = roomList.find((r) => r.id === selectedRoomId);
                if (!room) return;
                generateRoomPdfReport({ room, assets, states, events, sessionId });
                push(`Relatório PDF da sala ${room.label} aberto para impressão.`, 'success');
              }}
            >
              Gerar PDF da sala
            </Button>
          </div>
        </Card>

        <Card className="export-card">
          <CardHeader
            title="Relatório PDF por Filial"
            subtitle="Consolidado de todas as salas pertencentes à filial"
            icon="building"
          />
          <div className="form-stack">
            <select
              value={selectedFilial}
              onChange={(e) => setSelectedFilial(e.target.value)}
              className="field"
            >
              <option value="Filial 1">Filial 1</option>
              <option value="Filial 2">Filial 2</option>
              <option value="Todas">Todas as Filiais</option>
            </select>
            <Button
              variant="primary"
              icon="download"
              onClick={() => {
                generateFilialPdfReport({
                  filial: selectedFilial,
                  rooms: roomList,
                  assets,
                  states,
                  events,
                  sessionId,
                });
                push(`Relatório consolidado da ${selectedFilial} aberto para impressão.`, 'success');
              }}
            >
              Gerar PDF por filial
            </Button>
          </div>
        </Card>

        <Card className="export-card">
          <CardHeader
            title="Relatório PDF por Responsável"
            subtitle="Consolidado de todas as salas atribuídas ao responsável"
            icon="clipboard"
          />
          <div className="form-stack">
            <select
              value={selectedResponsible}
              onChange={(e) => setSelectedResponsible(e.target.value)}
              className="field"
            >
              <option value="">Selecione um responsável...</option>
              {responsibles.map((resp) => (
                <option key={resp} value={resp}>
                  {resp}
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              icon="download"
              disabled={!selectedResponsible}
              onClick={() => {
                if (!selectedResponsible) return;
                generateResponsiblePdfReport({
                  responsavel: selectedResponsible,
                  rooms: roomList,
                  assets,
                  states,
                  events,
                  sessionId,
                });
                push(`Relatório consolidado para ${selectedResponsible} aberto para impressão.`, 'success');
              }}
            >
              Gerar PDF por responsável
            </Button>
          </div>
        </Card>

        <Card className="export-card">
          <CardHeader
            title="Solicitações de transferência"
            subtitle="Intenções e efetivações para atualizar o Senior"
            icon="refresh"
          />
          <div className="row-actions">
            <Button
              icon="download"
              disabled={!transfers || transfers.length === 0}
              onClick={() => {
                if (!transfers) return;
                notify(exportTransfersCsv(transfers));
              }}
            >
              Exportar CSV
            </Button>
            <Button
              icon="download"
              disabled={!transfers || transfers.length === 0}
              onClick={() => {
                if (!transfers) return;
                notify(exportTransfersXlsx(transfers));
              }}
            >
              Exportar XLSX
            </Button>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Sobre os arquivos" icon="info" />
        <ul className="bullet-list">
          <li>CSV em UTF-8 com BOM, separador ponto e vírgula e plaquetas entre aspas.</li>
          <li>Exportar não altera nenhum dado local.</li>
          <li>Pendências e divergências refletem sempre a sessão ativa.</li>
          <li>O backup JSON contém a versão do schema para futuras migrações.</li>
        </ul>
      </Card>
    </div>
  );
}