import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { Badge, Card, CardHeader, EmptyState } from '../../components/Card';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Icon } from '../../components/Icon';
import { useToast } from '../../app/ToastContext';
import { db } from '../../db/database';
import { downloadBackup, clearAllData } from '../../services/backup';
import {
  inspectLegacyWorkbook,
  isLegacyWorkbookFile,
  type LegacyImportPreview,
} from '../../services/import/legacyImport';
import { applyLegacyImport, type ImportProgress } from '../../services/import/applyLegacyImport';
import { formatFileSize, formatNumber } from '../../domain/format';
import { roomLabel } from '../../domain/plaqueta';

const ISSUE_LABELS: Record<string, string> = {
  asset_sem_plaqueta: 'Bem sem plaqueta (ignorado)',
  evento_sem_data: 'Leitura sem data (ignorada)',
  evento_sem_local: 'Leitura sem sala (ignorada)',
  evento_sem_plaqueta: 'Leitura sem plaqueta (ignorada)',
  plaqueta_duplicada: 'Plaqueta duplicada no cadastro',
  leitura_nao_cadastrada: 'Leitura sem bem correspondente',
};

export function ImportPage() {
  const { push } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<LegacyImportPreview | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ assets: number; events: number } | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearConfirm, setClearConfirm] = useState('');

  const stored = useLiveQuery(
    async () => ({
      assets: await db.assets.count(),
      events: await db.events.count(),
    }),
    [],
  );
  const hasData = (stored?.assets ?? 0) > 0 || (stored?.events ?? 0) > 0;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setDone(null);
    setPreview(null);
    if (!isLegacyWorkbookFile(file)) {
      setError('Selecione um arquivo .xlsx ou .xls.');
      return;
    }
    setFileName(file.name);
    setInspecting(true);
    try {
      const result = await inspectLegacyWorkbook(file);
      setPreview(result);
      push('Prévia gerada. Revise os números antes de aplicar.', 'info');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao ler a planilha.');
    } finally {
      setInspecting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function apply() {
    if (!preview) return;
    setApplying(true);
    setError(null);
    try {
      const result = await applyLegacyImport(preview, setProgress);
      setDone({ assets: result.assets, events: result.events });
      setPreview(null);
      push('Importação concluída com sucesso.', 'success');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao aplicar a importação.');
    } finally {
      setApplying(false);
      setProgress(null);
    }
  }

  const summary = preview?.summary;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Dados"
        title="Importar"
        subtitle="Leitura somente leitura da planilha. O arquivo original nunca é alterado."
      />

      <div className="import-grid">
        <Card className="import-grid__main">
          <CardHeader title="1. Selecionar planilha" icon="upload" />
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.xlsm"
            className="sr-only"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <button
            type="button"
            className="dropzone"
            onClick={() => inputRef.current?.click()}
            disabled={inspecting || applying}
          >
            <span className="dropzone__icon">
              <Icon name="file" size={28} />
            </span>
            <strong>{fileName ?? 'Escolher arquivo XLSX'}</strong>
            <span>
              {fileName
                ? 'Clique para escolher outro arquivo'
                : 'Abas esperadas: Patrimonio, Conferencia e Config'}
            </span>
          </button>

          {inspecting ? (
            <div className="inline-status">
              <span className="spinner" /> Lendo a planilha e calculando a prévia...
            </div>
          ) : null}

          {error ? (
            <div className="alert alert--danger" role="alert">
              <Icon name="alert" size={18} />
              <span>{error}</span>
            </div>
          ) : null}

          {done ? (
            <div className="alert alert--success" role="status">
              <Icon name="check" size={18} />
              <div>
                <strong>Importação concluída</strong>
                <span>
                  {formatNumber(done.assets)} bens e {formatNumber(done.events)} leituras foram
                  gravados neste dispositivo.
                </span>
                <Link to="/" className="text-link">
                  Ir para o painel <Icon name="arrowRight" size={14} />
                </Link>
              </div>
            </div>
          ) : null}

          {summary ? (
            <>
              <section className="preview-summary">
                <div>
                  <span>Bens</span>
                  <strong>{formatNumber(summary.assetsToImport)}</strong>
                </div>
                <div>
                  <span>Leituras</span>
                  <strong>{formatNumber(summary.eventsToImport)}</strong>
                </div>
                <div>
                  <span>Ignorados</span>
                  <strong>{formatNumber(summary.ignored)}</strong>
                </div>
                <div>
                  <span>Duplicidades</span>
                  <strong>{formatNumber(summary.duplicateGroups)}</strong>
                </div>
                <div>
                  <span>Salas consolidadas</span>
                  <strong>{formatNumber(summary.roomsToCreate)}</strong>
                </div>
                <div>
                  <span>Grafias unificadas</span>
                  <strong>{formatNumber(summary.mergedRoomLabels)}</strong>
                </div>
                <div>
                  <span>Placas de sala</span>
                  <strong>{formatNumber(summary.roomLikeAssets)}</strong>
                </div>
                <div>
                  <span>Não cadastrados</span>
                  <strong>{formatNumber(summary.notInCadastro)}</strong>
                </div>
                <div>
                  <span>Divergências</span>
                  <strong>{formatNumber(summary.divergenceEvents)}</strong>
                </div>
                <div>
                  <span>Datas futuras</span>
                  <strong>{formatNumber(summary.futureEvents)}</strong>
                </div>
              </section>

              <div className="preview-meta">
                <span>
                  <Icon name="file" size={14} /> {preview.fileName}
                </span>
                <span>
                  <Icon name="save" size={14} /> {formatFileSize(preview.fileSize)}
                </span>
                <span>
                  <Icon name="mapPin" size={14} /> Sala atual:{' '}
                  {preview.configSalaAtual ? roomLabel(preview.configSalaAtual) : 'não informada'}
                </span>
              </div>

              <section className="preview-warnings">
                <h3>Alertas da prévia</h3>
                <div className="tag-row">
                  <Badge tone="warning">
                    {formatNumber(summary.assetsWithoutDescription)} sem descrição
                  </Badge>
                  <Badge tone="warning">{formatNumber(summary.assetsWithoutLocal)} sem local</Badge>
                  <Badge tone="info">
                    {formatNumber(summary.atypicalPlaquetas)} plaquetas atípicas
                  </Badge>
                  <Badge tone="neutral">
                    {formatNumber(summary.eventDuplicateIds)} IDs de leitura repetidos
                  </Badge>
                  <Badge tone="neutral">
                    {formatNumber(summary.eventsMissingDate)} leituras sem data
                  </Badge>
                  <Badge tone="neutral">
                    {formatNumber(summary.eventsMissingLocal)} leituras sem sala
                  </Badge>
                  <Badge tone="info">
                    {formatNumber(summary.repeatedReadRows)} leituras repetidas preservadas
                  </Badge>
                </div>
              </section>

              {preview.issues.length > 0 ? (
                <details className="issues">
                  <summary>Ver amostra de ocorrências ({preview.issues.length})</summary>
                  <ul>
                    {preview.issues.slice(0, 60).map((issue, index) => (
                      <li key={`${issue.tipo}-${issue.linha ?? index}-${index}`}>
                        <Badge tone="neutral">{ISSUE_LABELS[issue.tipo] ?? issue.tipo}</Badge>
                        <span>
                          {issue.linha ? `Linha ${issue.linha}` : ''}
                          {issue.plaqueta ? ` · ${issue.plaqueta}` : ''} — {issue.mensagem}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </>
          ) : null}
        </Card>

        <aside className="import-grid__side">
          <Card>
            <CardHeader title="2. Aplicar" icon="save" />
            {hasData ? (
              <>
                <div className="alert alert--warning">
                  <Icon name="alert" size={18} />
                  <div>
                    <strong>Já existem dados neste dispositivo</strong>
                    <span>
                      A importação inicial exige um backup exportado e a limpeza da base. A
                      atualização incremental será implementada em etapa futura.
                    </span>
                  </div>
                </div>
                <div className="form-stack">
                  <Button
                    icon="download"
                    block
                    onClick={async () => {
                      const name = await downloadBackup();
                      push(`Backup ${name} gerado.`, 'success');
                    }}
                  >
                    Baixar backup completo
                  </Button>
                  <Button
                    variant="danger"
                    icon="trash"
                    block
                    onClick={() => setClearOpen(true)}
                  >
                    Limpar base local
                  </Button>
                </div>
              </>
            ) : (
              <div className="form-stack">
                <p className="muted">
                  A importação cria uma sessão ativa “Inventário importado” com as leituras da
                  planilha. Nada é enviado para a internet.
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  icon="upload"
                  block
                  disabled={!preview || applying}
                  onClick={apply}
                >
                  {applying ? 'Aplicando...' : 'Aplicar importação'}
                </Button>
              </div>
            )}

            {progress ? (
              <div className="import-progress">
                <div className="import-progress__head">
                  <span>
                    {progress.phase === 'assets'
                      ? 'Gravando bens'
                      : progress.phase === 'events'
                        ? 'Gravando leituras'
                        : 'Finalizando'}
                  </span>
                  <strong>
                    {formatNumber(progress.done)} / {formatNumber(progress.total)}
                  </strong>
                </div>
                <div className="progress">
                  <span
                    style={{
                      width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </Card>

          <Card>
            <CardHeader title="O que acontece na importação" icon="info" />
            <ul className="bullet-list">
              <li>Plaquetas são lidas como texto, preservando zeros à esquerda.</li>
              <li>Duplicidades de cadastro ficam marcadas para revisão manual.</li>
              <li>Leituras sem data ou sala são ignoradas e contabilizadas.</li>
              <li>Divergências são recalculadas pela sala, não pela coluna legada.</li>
              <li>A planilha original não é alterada e nada é gravado no Senior.</li>
            </ul>
          </Card>
        </aside>
      </div>

      <Card>
        <EmptyState
          icon="file"
          title="Formato esperado"
          description="Patrimonio: Plaqueta, Descricao, Local_Original, Status, Ultima_Conferencia. Conferencia: ID, Plaqueta, Data_Hora, Local_Bipagem. Config: Sala_Atual."
        />
      </Card>

      <Modal
        open={clearOpen}
        onClose={() => {
          setClearOpen(false);
          setClearConfirm('');
        }}
        title="Limpar base local"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setClearOpen(false);
                setClearConfirm('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              icon="trash"
              disabled={clearConfirm.trim().toLocaleUpperCase('pt-BR') !== 'APAGAR'}
              onClick={async () => {
                await clearAllData();
                setClearOpen(false);
                setClearConfirm('');
                push('Base local limpa. Você já pode importar novamente.', 'success');
              }}
            >
              Apagar dados
            </Button>
          </>
        }
      >
        <div className="form-stack">
          <p>
            Esta ação apaga bens, leituras, sessões e configurações <strong>deste dispositivo</strong>.
            A planilha original não é afetada.
          </p>
          <Button
            icon="download"
            onClick={async () => {
              const name = await downloadBackup();
              push(`Backup ${name} gerado.`, 'success');
            }}
          >
            Baixar backup antes de apagar
          </Button>
          <label className="field">
            <span>Digite APAGAR para confirmar</span>
            <input value={clearConfirm} onChange={(event) => setClearConfirm(event.target.value)} />
          </label>
        </div>
      </Modal>
    </div>
  );
}
