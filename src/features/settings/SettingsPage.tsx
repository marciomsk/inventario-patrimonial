import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '../../components/PageHeader';
import { Badge, Card, CardHeader, EmptyState } from '../../components/Card';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { useApp } from '../../app/AppContext';
import { useToast } from '../../app/ToastContext';
import { useInventoryData } from '../../hooks/useInventoryData';
import { formatDateTime, formatNumber } from '../../domain/format';
import { ensureRoom } from '../../db/roomRepository';
import {
  closeActiveSession,
  listSessions,
  saveScannerSettings,
  setSetting,
  startSession,
} from '../../db/settingsRepository';
import { clearAllData, downloadBackup } from '../../services/backup';
import type { Room, ScannerSettings } from '../../domain/types';

export function SettingsPage() {
  const { settings, session } = useApp();
  const { assets, roomList } = useInventoryData();
  const { push } = useToast();
  const sessions = useLiveQuery(() => listSessions(), []);

  const [newSessionName, setNewSessionName] = useState('');
  const [startOpen, setStartOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearConfirm, setClearConfirm] = useState('');

  if (!settings) {
    return (
      <div className="page">
        <PageHeader title="Configurações" subtitle="Carregando configurações locais..." />
        <div className="skeleton skeleton--panel" />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Aplicativo"
        title="Configurações"
        subtitle="Sala atual, leitor, sessões e dados locais deste dispositivo."
      />

      <div className="settings-grid">
        <SalaSettingsCard initial={settings.salaAtual} rooms={roomList} />

        <ScannerSettingsCard initial={settings.scanner} />

        <Card>
          <CardHeader title="Sessão de inventário" subtitle="Apenas uma sessão ativa" icon="clipboard" />
          {session ? (
            <div className="form-stack">
              <dl className="kv kv--compact">
                <div>
                  <dt>Nome</dt>
                  <dd>{session.nome}</dd>
                </div>
                <div>
                  <dt>Início</dt>
                  <dd>{formatDateTime(session.createdAt)}</dd>
                </div>
                {session.legacyFirstReadAt ? (
                  <div>
                    <dt>Leitura mais antiga</dt>
                    <dd>{formatDateTime(session.legacyFirstReadAt)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Origem</dt>
                  <dd>{session.source}</dd>
                </div>
              </dl>
              <Button variant="secondary" icon="play" onClick={() => setStartOpen(true)}>
                Iniciar nova sessão
              </Button>
              <Button
                variant="danger"
                icon="x"
                onClick={async () => {
                  await closeActiveSession();
                  push('Sessão encerrada. O histórico permanece consultável.', 'success');
                }}
              >
                Encerrar sessão ativa
              </Button>
              <p className="card__note">
                Encerrar não apaga leituras. A nova sessão começa com todos os bens pendentes, mas o
                histórico anterior continua disponível.
              </p>
            </div>
          ) : (
            <EmptyState
              icon="play"
              title="Nenhuma sessão ativa"
              description="Inicie uma sessão para começar a conferir."
              action={
                <Button variant="primary" icon="play" onClick={() => setStartOpen(true)}>
                  Iniciar sessão
                </Button>
              }
            />
          )}
        </Card>

        <Card>
          <CardHeader title="Histórico de sessões" icon="history" />
          {!sessions || sessions.length === 0 ? (
            <EmptyState icon="history" title="Nenhuma sessão registrada" />
          ) : (
            <ul className="session-list">
              {sessions.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.nome}</strong>
                    <span>
                      {formatDateTime(item.startedAt)}
                      {item.endedAt ? ` → ${formatDateTime(item.endedAt)}` : ''}
                    </span>
                  </div>
                  <Badge tone={item.status === 'ativa' ? 'success' : 'neutral'}>
                    {item.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Dispositivo" subtitle="Identificação local" icon="tag" />
          <dl className="kv">
            <div>
              <dt>ID do dispositivo</dt>
              <dd className="mono">{settings?.deviceId || 'Gerando...'}</dd>
            </div>
            <div>
              <dt>Versão do app</dt>
              <dd>0.1.0</dd>
            </div>
            <div>
              <dt>Armazenamento</dt>
              <dd>{formatNumber(assets.length)} bens no IndexedDB</dd>
            </div>
            <div>
              <dt>Modo offline</dt>
              <dd>
                <Badge tone="success">Ativo</Badge>
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="card--danger">
          <CardHeader title="Dados locais" subtitle="Backup e limpeza" icon="trash" />
          <div className="form-stack">
            <Button
              icon="download"
              onClick={async () => {
                const filename = await downloadBackup();
                push(`Backup ${filename} gerado.`, 'success');
              }}
            >
              Baixar backup completo
            </Button>
            <Button variant="danger" icon="trash" onClick={() => setClearOpen(true)}>
              Limpar dados deste dispositivo
            </Button>
            <p className="card__note">
              A limpeza exige confirmação textual. A planilha original e o Senior nunca são
              alterados.
            </p>
          </div>
        </Card>
      </div>

      <Modal
        open={startOpen}
        onClose={() => setStartOpen(false)}
        title="Iniciar nova sessão"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStartOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              icon="play"
              onClick={async () => {
                await startSession(newSessionName || `Inventário ${new Date().toLocaleDateString('pt-BR')}`);
                setNewSessionName('');
                setStartOpen(false);
                push('Nova sessão iniciada.', 'success');
              }}
            >
              Iniciar
            </Button>
          </>
        }
      >
        <div className="form-stack">
          <p>
            A sessão ativa atual será encerrada. As leituras existentes permanecem no histórico, mas
            os status correntes passam a considerar apenas a nova sessão.
          </p>
          <label className="field">
            <span>Nome da sessão</span>
            <input
              value={newSessionName}
              onChange={(event) => setNewSessionName(event.target.value)}
              placeholder="Ex.: Inventário novembro 2026"
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={clearOpen}
        onClose={() => {
          setClearOpen(false);
          setClearConfirm('');
        }}
        title="Limpar dados deste dispositivo"
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
                push('Dados locais apagados.', 'success');
              }}
            >
              Apagar tudo
            </Button>
          </>
        }
      >
        <div className="form-stack">
          <p>
            Serão apagados bens, leituras, sessões, solicitações e configurações. Gere um backup
            antes de continuar.
          </p>
          <Button
            icon="download"
            onClick={async () => {
              const filename = await downloadBackup();
              push(`Backup ${filename} gerado.`, 'success');
            }}
          >
            Baixar backup agora
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

function SalaSettingsCard({ initial, rooms }: { initial: string; rooms: Room[] }) {
  const { push } = useToast();
  const [sala, setSala] = useState(initial);
  const [saving, setSaving] = useState(false);

  const options = useMemo(
    () =>
      [...rooms].sort((a, b) => {
        const codeA = a.codigo ?? '9999';
        const codeB = b.codigo ?? '9999';
        return codeA.localeCompare(codeB, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR');
      }),
    [rooms],
  );
  const selectedId = options.find((room) => room.label === sala)?.id ?? '';

  return (
    <Card>
      <CardHeader title="Sala atual" subtitle="Usada em cada leitura" icon="mapPin" />
      <div className="form-stack">
        <label className="field">
          <span>Sala selecionada</span>
          <select
            value={selectedId}
            onChange={(event) => {
              const room = options.find((item) => item.id === event.target.value);
              setSala(room?.label ?? '');
            }}
          >
            <option value="">Selecione uma sala do cadastro</option>
            {options.map((room) => (
              <option key={room.id} value={room.id}>
                {room.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Ou informe o texto da sala</span>
          <input
            value={sala}
            onChange={(event) => setSala(event.target.value)}
            placeholder="Ex.: 0589 - PRAIA PARK - CASCATAS"
          />
        </label>
        <Button
          variant="primary"
          icon="save"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              const text = sala.trim();
              if (!text) {
                await setSetting('salaAtual', '');
                push('Sala atual removida.', 'success');
                return;
              }
              const room = await ensureRoom(text);
              await setSetting('salaAtual', room.label);
              setSala(room.label);
              push('Sala atual salva.', 'success');
            } catch (error) {
              push(error instanceof Error ? error.message : 'Falha ao salvar a sala.', 'error');
            } finally {
              setSaving(false);
            }
          }}
        >
          Salvar sala
        </Button>
        <p className="card__note">
          A sala atual aparece no topo de todas as telas. Sem ela, a leitura é bloqueada para não
          registrar divergências falsas. Um texto novo cria a sala no cadastro local.
        </p>
      </div>
    </Card>
  );
}

function ScannerSettingsCard({ initial }: { initial: ScannerSettings }) {
  const { push } = useToast();
  const [scanner, setScanner] = useState<ScannerSettings>(initial);

  return (
    <Card>
      <CardHeader title="Leitor" subtitle="Comportamento do campo de leitura" icon="scan" />
      <div className="form-stack">
        <div className="field-row">
          <label className="field">
            <span>Tecla de confirmação</span>
            <select
              value={scanner.sufixo}
              onChange={(event) =>
                setScanner({ ...scanner, sufixo: event.target.value as ScannerSettings['sufixo'] })
              }
            >
              <option value="Enter">Enter</option>
              <option value="Tab">Tab</option>
            </select>
          </label>
          <label className="field">
            <span>Debounce (ms)</span>
            <input
              type="number"
              min={0}
              max={2000}
              value={scanner.debounceMs}
              onChange={(event) =>
                setScanner({ ...scanner, debounceMs: Number(event.target.value) })
              }
            />
          </label>
        </div>
        <label className="field">
          <span>Janela de repetição (ms)</span>
          <input
            type="number"
            min={0}
            max={10000}
            step={100}
            value={scanner.janelaRepeticaoMs}
            onChange={(event) =>
              setScanner({ ...scanner, janelaRepeticaoMs: Number(event.target.value) })
            }
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={scanner.som}
            onChange={(event) => setScanner({ ...scanner, som: event.target.checked })}
          />
          <span>Som ao registrar leitura</span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={scanner.focoAutomatico}
            onChange={(event) => setScanner({ ...scanner, focoAutomatico: event.target.checked })}
          />
          <span>Manter foco automático no campo de leitura</span>
        </label>
        <Button
          variant="primary"
          icon="save"
          onClick={async () => {
            await saveScannerSettings(scanner);
            push('Configurações do leitor salvas.', 'success');
          }}
        >
          Salvar leitor
        </Button>
      </div>
    </Card>
  );
}
