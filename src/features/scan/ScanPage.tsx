import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Card, CardHeader, EmptyState, ProgressBar } from '../../components/Card';
import { Button, LinkButton } from '../../components/Button';
import { ResultBadge } from '../../components/ResultBadge';
import { Modal } from '../../components/Modal';
import { Icon } from '../../components/Icon';
import { useApp } from '../../app/AppContext';
import { useToast } from '../../app/ToastContext';
import { useInventoryData } from '../../hooks/useInventoryData';
import { createId, nowIso } from '../../domain/id';
import { resolveScan, type ScanResolution } from '../../domain/scan';
import { roomLabel } from '../../domain/plaqueta';
import { formatNumber, formatTime } from '../../domain/format';
import { createTransferRequest } from '../../db/transferRepository';
import {
  recordEvent,
  resolveDuplicateEvent,
  startSession,
  updateEventObservation,
} from '../../db/settingsRepository';
import { AssetFormModal } from '../assets/AssetFormModal';
import type { Asset, InventoryEvent } from '../../domain/types';

interface TransferDraft {
  event: InventoryEvent;
  asset: Asset;
}

export function ScanPage() {
  const { settings, session } = useApp();
  const { assets, events, assetsById, summary, roomList, roomForLabel } = useInventoryData();
  const { push } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const submittedRef = useRef(false);

  const [value, setValue] = useState('');
  const [resolution, setResolution] = useState<ScanResolution | null>(null);
  const [lastEvent, setLastEvent] = useState<InventoryEvent | null>(null);
  const [observacao, setObservacao] = useState('');
  const [pendingBounce, setPendingBounce] = useState<ScanResolution | null>(null);
  const [transfer, setTransfer] = useState<TransferDraft | null>(null);
  const [transferRoom, setTransferRoom] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const salaAtual = settings?.salaAtual ?? '';
  const salaAtualRoom = useMemo(() => roomForLabel(salaAtual), [roomForLabel, salaAtual]);
  const scanner = settings?.scanner;
  const som = scanner?.som ?? false;
  const janelaRepeticaoMs = scanner?.janelaRepeticaoMs ?? 1500;
  const deviceId = settings?.deviceId ?? '';

  const sessionEvents = useMemo(
    () =>
      session
        ? events
            .filter((event) => event.inventorySessionId === session.id)
            .sort((a, b) => b.dataHora.localeCompare(a.dataHora))
        : [],
    [events, session],
  );

  const recent = sessionEvents.slice(0, 10);
  const latestDuplicate = resolution?.tipo === 'duplicado_cadastro';

  const roomOptions = useMemo(() => {
    const names = new Set(roomList.map((room) => room.label).filter(Boolean));
    if (salaAtual) names.add(salaAtual);
    return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [roomList, salaAtual]);

  const focusInput = useCallback(() => {
    window.setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  const beep = useCallback(
    (tone: 'ok' | 'repeat' | 'warn' | 'error') => {
      if (!som) return;
      try {
        const AudioCtor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtor) return;
        audioRef.current ??= new AudioCtor();
        const context = audioRef.current;
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        let freq = 880;
        let duration = 0.09;
        let type: OscillatorType = 'sine';

        if (tone === 'ok') {
          freq = 880; // Sucesso
          duration = 0.09;
          type = 'sine';
        } else if (tone === 'repeat') {
          freq = 620; // Repetido / aviso
          duration = 0.12;
          type = 'square';
        } else if (tone === 'warn') {
          freq = 520; // Divergente
          duration = 0.18;
          type = 'square';
        } else {
          freq = 320; // Erro / Não cadastrado
          duration = 0.25;
          type = 'sawtooth';
        }

        oscillator.type = type;
        oscillator.frequency.value = freq;
        gain.gain.value = 0.08;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + duration);

        if ('vibrate' in navigator) {
          if (tone === 'ok') navigator.vibrate(100);
          else if (tone === 'repeat') navigator.vibrate([50, 50, 50]);
          else if (tone === 'warn') navigator.vibrate(200);
          else navigator.vibrate([100, 50, 100]);
        }
      } catch {
        // Som é opcional; falha silenciosa não pode impedir a leitura.
      }
    },
    [som],
  );

  const saveEvent = useCallback(
    async (scan: ScanResolution, confirmed: boolean) => {
      if (!session) return;
      if (!confirmed && scan.tipo === 'sem_sala') return;
      const evento: InventoryEvent = {
        id: createId(),
        plaqueta: scan.plaqueta,
        plaquetaKey: scan.plaquetaKey,
        assetId: 'asset' in scan ? scan.asset.id : null,
        candidatosAssetIds:
          scan.tipo === 'duplicado_cadastro' ? scan.candidatos.map((item) => item.id) : [],
        dataHora: nowIso(),
        localBipagem: salaAtual,
        roomId: salaAtualRoom?.id ?? null,
        resultado:
          scan.tipo === 'sem_sala' || scan.tipo === 'invalida'
            ? 'invalido'
            : scan.tipo === 'duplicado_cadastro'
              ? 'duplicado_cadastro'
              : scan.tipo,
        observacao: null,
        acaoSapiens: null,
        inventorySessionId: session.id,
        deviceId,
        source: 'scanner',
        legacyEventId: null,
        syncStatus: 'nao_aplicavel',
        resolvidoManualmente: false,
        createdAt: nowIso(),
      };

      await recordEvent(evento);
      setLastEvent(evento);
      setResolution(scan);
      setObservacao('');
      beep(
        scan.tipo === 'encontrado'
          ? 'ok'
          : scan.tipo === 'divergente'
            ? 'warn'
            : scan.tipo === 'duplicado_cadastro'
              ? 'repeat'
              : 'error',
      );
      focusInput();
    },
    [beep, deviceId, focusInput, session, salaAtual, salaAtualRoom],
  );

  const submit = useCallback(async () => {
    const raw = value.trim();
    if (!raw || busy) return;

    if (!session) {
      push('Inicie uma sessão antes de ler.', 'warning');
      focusInput();
      return;
    }
    if (!salaAtual.trim()) {
      push('Defina a sala atual nas configurações.', 'warning');
      focusInput();
      return;
    }

    setBusy(true);
    try {
      const scan = resolveScan(raw, assets, salaAtual, salaAtualRoom?.id ?? null);
      const duplicateWindow = janelaRepeticaoMs;
      const lastSame = sessionEvents.find((event) => event.plaquetaKey === scan.plaquetaKey);
      const isBounce =
        scan.tipo !== 'invalida' &&
        scan.tipo !== 'sem_sala' &&
        lastSame !== undefined &&
        Date.now() - new Date(lastSame.dataHora).getTime() <= duplicateWindow;

      setValue('');

      if (isBounce) {
        setPendingBounce(scan);
        beep('repeat');
        focusInput();
        return;
      }

      await saveEvent(scan, false);
    } catch (error) {
      push(error instanceof Error ? error.message : 'Falha ao registrar a leitura.', 'error');
      focusInput();
    } finally {
      setBusy(false);
      focusInput();
    }
  }, [assets, beep, busy, push, salaAtual, salaAtualRoom, saveEvent, janelaRepeticaoMs, session, sessionEvents, value, focusInput]);

  async function chooseCandidate(assetId: string) {
    if (!lastEvent || !session) return;
    const updated = await resolveDuplicateEvent(lastEvent.id, assetId, salaAtual);
    if (updated) {
      setLastEvent(updated);
      setResolution({
        tipo: updated.resultado === 'divergente' ? 'divergente' : 'encontrado',
        plaqueta: updated.plaqueta,
        plaquetaKey: updated.plaquetaKey,
        formato: 'atipica',
        asset: assetsById.get(assetId)!,
      });
      push('Duplicidade resolvida manualmente.', 'success');
    }
    focusInput();
  }

  async function saveObservation() {
    if (!lastEvent) return;
    await updateEventObservation(lastEvent.id, observacao);
    setLastEvent({ ...lastEvent, observacao: observacao.trim() || null });
    push('Observação salva.', 'success');
  }

  async function confirmTransfer() {
    if (!transfer || !transferRoom) return;
    await createTransferRequest({
      assetId: transfer.asset.id,
      plaqueta: transfer.asset.plaqueta,
      localOriginal: transfer.asset.localOriginal,
      localDestino: transferRoom,
      eventId: transfer.event.id,
      observacao: transferNote,
    });
    setTransfer(null);
    setTransferNote('');
    push('Solicitação de transferência registrada. O local oficial não foi alterado.', 'success');
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow={session ? session.nome : 'Sem sessão ativa'}
        title="Leitura"
        subtitle={
          salaAtual
            ? `Sala atual: ${roomLabel(salaAtual)}`
            : 'Defina a sala atual antes de começar a ler.'
        }
        actions={
          <LinkButton to="/configuracoes" icon="mapPin">
            Trocar sala
          </LinkButton>
        }
      />

      {!session ? (
        <Card>
          <EmptyState
            icon="play"
            title="Nenhuma sessão ativa"
            description="A leitura é registrada em uma sessão de inventário. Inicie uma nova sessão para começar."
            action={
              <Button
                variant="primary"
                icon="play"
                onClick={async () => {
                  await startSession(`Inventário ${new Date().toLocaleDateString('pt-BR')}`);
                  push('Sessão iniciada.', 'success');
                }}
              >
                Iniciar sessão
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="scan-layout">
          <div className="scan-main">
            <Card className="scan-card">
              <CardHeader
                title="Bipar plaqueta"
                subtitle="Use o leitor como teclado ou digite o código e confirme."
                icon="scan"
                action={
                  <span className={`conn ${settings?.deviceId ? 'is-online' : 'is-offline'}`}>
                    <Icon name="tag" size={14} /> {formatNumber(summary.eventos)} leituras
                  </span>
                }
              />

              <form
                className="scan-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  submittedRef.current = true;
                  void submit();
                }}
              >
                <label className="scan-input">
                  <span className="sr-only">Plaqueta</span>
                  <Icon name="tag" size={22} />
                  <input
                    ref={inputRef}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (scanner?.sufixo === 'Tab' && event.key === 'Tab') {
                        event.preventDefault();
                        submittedRef.current = true;
                        void submit();
                      }
                    }}
                    onBlur={() => {
                      if (scanner?.focoAutomatico && !submittedRef.current) focusInput();
                      submittedRef.current = false;
                    }}
                    inputMode="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    enterKeyHint="done"
                    placeholder="Bipe ou digite a plaqueta"
                    aria-label="Plaqueta"
                  />
                </label>
                <Button type="submit" variant="primary" size="lg" icon="scan" disabled={busy}>
                  Registrar
                </Button>
              </form>

              <p className="scan-hint">
                <Icon name="info" size={14} /> Leituras repetidas são permitidas e ficam no
                histórico. O app apenas alerta sobre possíveis repetições do leitor.
              </p>

              <div className="row-actions">
                <Button icon="plus" onClick={() => setRegisterOpen(true)} disabled={!salaAtual}>
                  Cadastrar patrimônio
                </Button>
                <span className="muted">
                  Item novo lido em campo e ausente da carga original. Fica vinculado à sala atual.
                </span>
              </div>

              {resolution ? (
                <section className={`scan-result scan-result--${resolution.tipo}`}>
                  <header className="scan-result__head">
                    <div>
                      <span className="scan-result__code">{resolution.plaqueta}</span>
                      <h3>
                        {resolution.tipo === 'encontrado'
                          ? 'Bem localizado na sala correta'
                          : resolution.tipo === 'divergente'
                            ? 'Bem lido em sala diferente'
                            : resolution.tipo === 'nao_cadastrado'
                              ? 'Plaqueta sem cadastro'
                              : resolution.tipo === 'duplicado_cadastro'
                                ? 'Plaqueta duplicada no cadastro'
                                : resolution.tipo === 'invalida'
                                  ? 'Leitura inválida'
                                  : 'Sala atual não definida'}
                      </h3>
                    </div>
                    {lastEvent ? <ResultBadge resultado={lastEvent.resultado} /> : null}
                  </header>

                  {'asset' in resolution ? (
                    <dl className="kv kv--compact">
                      <div>
                        <dt>Descrição</dt>
                        <dd>{resolution.asset.descricao || 'Sem descrição'}</dd>
                      </div>
                      <div>
                        <dt>Local no cadastro</dt>
                        <dd>{roomLabel(resolution.asset.localOriginal) || 'Sem local'}</dd>
                      </div>
                      <div>
                        <dt>Sala da leitura</dt>
                        <dd>{roomLabel(salaAtual)}</dd>
                      </div>
                    </dl>
                  ) : null}

                  {resolution.tipo === 'nao_cadastrado' ? (
                    <p className="scan-result__text">
                      A leitura foi registrada e aparece em “Não cadastrados”. Nenhum bem foi
                      criado automaticamente.
                    </p>
                  ) : null}

                  {resolution.tipo === 'divergente' && lastEvent ? (
                    <div className="scan-result__actions">
                      <Button
                        variant="warning"
                        icon="refresh"
                        onClick={() => {
                          setTransfer({
                            event: lastEvent,
                            asset: resolution.asset,
                          });
                          setTransferRoom(salaAtual);
                        }}
                      >
                        Solicitar transferência
                      </Button>
                      <span className="muted">
                        O local oficial continua sendo {roomLabel(resolution.asset.localOriginal)}.
                      </span>
                    </div>
                  ) : null}

                  {latestDuplicate && lastEvent ? (
                    <div className="scan-result__candidates">
                      <p>Escolha o bem correto. O app não escolhe automaticamente.</p>
                      {resolution.tipo === 'duplicado_cadastro'
                        ? resolution.candidatos.map((candidate) => (
                            <button
                              key={candidate.id}
                              type="button"
                              className="candidate"
                              onClick={() => void chooseCandidate(candidate.id)}
                            >
                              <strong>{candidate.plaqueta}</strong>
                              <span>{candidate.descricao || 'Sem descrição'}</span>
                              <span>{roomLabel(candidate.localOriginal)}</span>
                            </button>
                          ))
                        : null}
                    </div>
                  ) : null}

                  {lastEvent && resolution.tipo !== 'duplicado_cadastro' ? (
                    <div className="scan-result__note">
                      <label>
                        <span>Observação (opcional)</span>
                        <input
                          value={observacao}
                          onChange={(event) => setObservacao(event.target.value)}
                          placeholder="Ex.: bem danificado, etiqueta ilegível..."
                        />
                      </label>
                      <Button size="sm" variant="secondary" icon="save" onClick={saveObservation}>
                        Salvar
                      </Button>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </Card>

            <Card>
              <CardHeader
                title="Leituras desta sessão"
                subtitle="As 10 mais recentes"
                icon="history"
                action={
                  <LinkButton to="/consulta" size="sm" iconRight="chevronRight">
                    Consultar
                  </LinkButton>
                }
              />
              {recent.length === 0 ? (
                <EmptyState
                  icon="scan"
                  title="Nenhuma leitura registrada"
                  description="A primeira plaqueta bipada aparece aqui."
                />
              ) : (
                <ul className="event-list">
                  {recent.map((event) => {
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
                          <span>{formatTime(event.dataHora)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          <aside className="scan-side">
            <Card>
              <CardHeader title="Sessão atual" icon="clipboard" />
              <div className="scan-session">
                <div>
                  <span>Conferidos</span>
                  <strong>{formatNumber(summary.conferidos)}</strong>
                </div>
                <div>
                  <span>Pendentes</span>
                  <strong>{formatNumber(summary.pendentes)}</strong>
                </div>
                <div>
                  <span>Divergentes</span>
                  <strong>{formatNumber(summary.divergentes)}</strong>
                </div>
              </div>
              <ProgressBar value={summary.percentual} label="Progresso da sessão" />
              <p className="card__note">
                {formatNumber(summary.totalAssets)} bens ativos ·{' '}
                {formatNumber(summary.leiturasRepetidas)} leituras repetidas
              </p>
            </Card>

            <Card>
              <CardHeader title="Como ler" icon="info" />
              <ol className="steps">
                <li>Confirme a sala atual antes de sair para o campo.</li>
                <li>Bipe a plaqueta; o foco volta sozinho para o campo.</li>
                <li>Leituras em outra sala geram divergência, sem alterar o cadastro.</li>
                <li>Plaqueta sem cadastro fica em “Não cadastrados” para análise.</li>
              </ol>
            </Card>
          </aside>
        </div>
      )}

      <Modal
        open={pendingBounce !== null}
        onClose={() => {
          setPendingBounce(null);
          focusInput();
        }}
        title="Possível repetição do leitor"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setPendingBounce(null);
                focusInput();
              }}
            >
              Não registrar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const scan = pendingBounce;
                setPendingBounce(null);
                if (scan) void saveEvent(scan, true);
              }}
            >
              Registrar mesmo assim
            </Button>
          </>
        }
      >
        <p>
          A plaqueta <strong>{pendingBounce?.plaqueta}</strong> foi lida há menos de{' '}
          {((janelaRepeticaoMs ?? 1500) / 1000).toLocaleString('pt-BR')} s. Isso pode ser
          um disparo duplo do leitor. Nenhuma leitura é descartada sem a sua confirmação.
        </p>
      </Modal>

      <Modal
        open={transfer !== null}
        onClose={() => setTransfer(null)}
        title="Solicitar transferência"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTransfer(null)}>
              Cancelar
            </Button>
            <Button variant="primary" icon="check" disabled={!transferRoom} onClick={confirmTransfer}>
              Registrar solicitação
            </Button>
          </>
        }
      >
        {transfer ? (
          <div className="form-stack">
            <dl className="kv kv--compact">
              <div>
                <dt>Plaqueta</dt>
                <dd>{transfer.asset.plaqueta}</dd>
              </div>
              <div>
                <dt>Descrição</dt>
                <dd>{transfer.asset.descricao || 'Sem descrição'}</dd>
              </div>
              <div>
                <dt>Local no cadastro</dt>
                <dd>{roomLabel(transfer.asset.localOriginal)}</dd>
              </div>
              <div>
                <dt>Local da leitura</dt>
                <dd>{roomLabel(salaAtual)}</dd>
              </div>
            </dl>
            <label className="field">
              <span>Destino pretendido</span>
              <select value={transferRoom} onChange={(event) => setTransferRoom(event.target.value)}>
                <option value="">Selecione uma sala</option>
                {roomOptions.map((room) => (
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
                value={transferNote}
                onChange={(event) => setTransferNote(event.target.value)}
                placeholder="Informações para a equipe responsável"
              />
            </label>
            <p className="muted">
              A solicitação é apenas uma intenção registrada. O local oficial do bem não é
              alterado pelo aplicativo.
            </p>
          </div>
        ) : null}
      </Modal>

      <AssetFormModal
        open={registerOpen && session !== null}
        rooms={roomList}
        create={
          session
            ? {
                sessionId: session.id,
                deviceId,
                room: salaAtualRoom,
                defaultRoomId: salaAtualRoom?.id ?? null,
              }
            : null
        }
        onClose={() => {
          setRegisterOpen(false);
          focusInput();
        }}
        onSaved={() => focusInput()}
      />
    </div>
  );
}
