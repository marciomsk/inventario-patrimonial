import { useMemo, useState } from 'react';
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
import { generateRoomPdfReport, generateResponsiblePdfReport } from '../../services/pdfReport';
import { listTransferRequests } from '../../db/transferRepository';
import { formatDateTime, formatNumber } from '../../domain/format';

export function ExportPage() {
  const { session } = useApp();
  const { assets, events, assetsById, states, roomList, summary } = useInventoryData();
  const { push } = useToast();
  const lastBackupAt = useLiveQuery(() => getSetting('lastBackupAt'), []);
  const transfers = useLiveQuery(() => listTransferRequests(), []);

  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedResponsible, setSelectedResponsible] = useState('');

  const sessionId = session?.id ?? null;

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
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="field"
            >
              <option value="">Selecione uma sala...</option>
              {roomList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} {r.responsavel ? `(Resp: ${r.responsavel})` : ''}
                </option>
              ))}
            </select>
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