import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Badge, Card, CardHeader, EmptyState } from '../../components/Card';
import { Button } from '../../components/Button';
import { ResultBadge } from '../../components/ResultBadge';
import { Icon } from '../../components/Icon';
import { useInventoryData } from '../../hooks/useInventoryData';
import { plaquetaKey, roomLabel } from '../../domain/plaqueta';
import { formatDateTime, formatNumber } from '../../domain/format';
import { REVIEW_REASON_LABELS } from '../../domain/constants';
import { AssetFormModal } from './AssetFormModal';
import type { Asset } from '../../domain/types';

export function SearchPage() {
  const { assets, events, assetsById, states, roomList, loading } = useInventoryData();
  const [term, setTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const results = useMemo(() => {
    const clean = term.trim();
    if (clean.length < 1) return [];
    const key = plaquetaKey(clean);
    const upper = clean.toLocaleUpperCase('pt-BR');

    return assets
      .filter(
        (asset) =>
          asset.plaquetaKey.startsWith(key) ||
          asset.descricao.toLocaleUpperCase('pt-BR').includes(upper) ||
          asset.localOriginal.toLocaleUpperCase('pt-BR').includes(upper),
      )
      .sort((a, b) => a.plaqueta.localeCompare(b.plaqueta, 'pt-BR'))
      .slice(0, 80);
  }, [assets, term]);

  const selected = selectedId ? assetsById.get(selectedId) : undefined;
  const selectedEvents = useMemo(() => {
    if (!selected) return [];
    return events
      .filter((event) => event.assetId === selected.id)
      .sort((a, b) => b.dataHora.localeCompare(a.dataHora))
      .slice(0, 12);
  }, [events, selected]);

  const duplicateGroups = useMemo(() => {
    if (!selected) return [] as Asset[];
    return assets.filter((asset) => asset.plaquetaKey === selected.plaquetaKey);
  }, [assets, selected]);

  return (
    <div className="page">
      <PageHeader
        title="Consulta"
        subtitle="Pesquise por plaqueta, descrição ou sala. O histórico de leituras é preservado."
      />

      <Card className="search-card">
        <label className="search-input">
          <Icon name="search" size={20} />
          <input
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setSelectedId(null);
            }}
            placeholder="Ex.: 022308, CON000010-001, cozinha..."
            autoComplete="off"
          />
          {term ? (
            <Button
              variant="ghost"
              size="sm"
              icon="close"
              onClick={() => {
                setTerm('');
                setSelectedId(null);
              }}
              aria-label="Limpar busca"
            />
          ) : null}
        </label>
        <div className="search-meta">
          <span>
            {term.trim()
              ? `${formatNumber(results.length)} resultado(s) para “${term.trim()}”`
              : 'Digite ao menos um caractere para buscar.'}
          </span>
        </div>
      </Card>

      {loading ? (
        <div className="skeleton skeleton--panel" />
      ) : term.trim() && results.length === 0 ? (
        <Card>
          <EmptyState
            icon="search"
            title="Nenhum bem encontrado"
            description="Verifique a plaqueta ou consulte a lista de itens não cadastrados."
          />
        </Card>
      ) : (
        <div className="split">
          <Card className="split__list">
            <CardHeader
              title="Bens"
              subtitle={results.length ? 'Até 80 resultados' : undefined}
              icon="box"
            />
            <ul className="result-list">
              {results.map((asset) => {
                const state = states.get(asset.id);
                return (
                  <li key={asset.id}>
                    <button
                      type="button"
                      className={`result-item ${selectedId === asset.id ? 'is-selected' : ''}`}
                      onClick={() => setSelectedId(asset.id)}
                    >
                      <span className="result-item__code">{asset.plaqueta}</span>
                      <span className="result-item__desc">{asset.descricao || 'Sem descrição'}</span>
                      <span className="result-item__meta">
                        <span>{roomLabel(asset.localOriginal) || 'Sem local'}</span>
                        {state?.conferido ? (
                          <Badge tone={state.divergente ? 'warning' : 'success'}>
                            {state.divergente ? 'Divergente' : 'Conferido'}
                          </Badge>
                        ) : (
                          <Badge tone="neutral">Pendente</Badge>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="split__detail">
            <CardHeader
              title="Detalhe do bem"
              icon="eye"
              action={
                selected ? (
                  <Button size="sm" icon="save" onClick={() => setEditOpen(true)}>
                    Editar bem
                  </Button>
                ) : undefined
              }
            />
            {!selected ? (
              <EmptyState
                icon="box"
                title="Selecione um bem"
                description="O histórico de leituras e os alertas de cadastro aparecem aqui."
              />
            ) : (
              <div className="detail">
                <div className="detail__title">
                  <div>
                    <span className="detail__code">{selected.plaqueta}</span>
                    <h3>{selected.descricao || 'Sem descrição'}</h3>
                  </div>
                  {selected.revisaoPendente ? <Badge tone="warning">Revisão</Badge> : null}
                  {selected.isManualRegister ? <Badge tone="info">Item novo</Badge> : null}
                </div>

                <dl className="kv">
                  <div>
                    <dt>Local no cadastro</dt>
                    <dd>{roomLabel(selected.localOriginal) || 'Sem local'}</dd>
                  </div>
                  <div>
                    <dt>Status legado</dt>
                    <dd>{selected.legacyStatus}</dd>
                  </div>
                  <div>
                    <dt>ID Patrimônio</dt>
                    <dd>{selected.idPatrimonio ?? 'Não informado'}</dd>
                  </div>
                  <div>
                    <dt>Situação</dt>
                    <dd>{selected.statusCadastro || 'Não informada'}</dd>
                  </div>
                  <div>
                    <dt>Observações</dt>
                    <dd>{selected.observacao || 'Sem observações'}</dd>
                  </div>
                  <div>
                    <dt>Origem</dt>
                    <dd>{selected.source}</dd>
                  </div>
                  <div>
                    <dt>Última leitura (sessão)</dt>
                    <dd>
                      {states.get(selected.id)?.ultimoEvento
                        ? formatDateTime(states.get(selected.id)?.ultimoEvento?.dataHora)
                        : 'Sem leitura nesta sessão'}
                    </dd>
                  </div>
                </dl>

                {selected.revisaoMotivos.length ? (
                  <div className="tag-row">
                    {selected.revisaoMotivos.map((reason) => (
                      <Badge key={reason} tone="warning">
                        {REVIEW_REASON_LABELS[reason]}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {duplicateGroups.length > 1 ? (
                  <section className="detail__section">
                    <h4>Duplicidade de cadastro</h4>
                    <p className="muted">
                      Existem {duplicateGroups.length} registros com esta plaqueta. A leitura exige
                      escolha manual e nunca seleciona um bem sozinha.
                    </p>
                    <ul className="mini-list">
                      {duplicateGroups.map((asset) => (
                        <li key={asset.id}>
                          <span>{asset.descricao || 'Sem descrição'}</span>
                          <span>{roomLabel(asset.localOriginal) || 'Sem local'}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section className="detail__section">
                  <h4>Histórico de leituras</h4>
                  {selectedEvents.length === 0 ? (
                    <p className="muted">Nenhuma leitura registrada para este bem.</p>
                  ) : (
                    <ul className="timeline">
                      {selectedEvents.map((event) => (
                        <li key={event.id}>
                          <span className="timeline__time">{formatDateTime(event.dataHora)}</span>
                          <span className="timeline__body">
                            <strong>{roomLabel(event.localBipagem)}</strong>
                            {event.observacao ? <em>{event.observacao}</em> : null}
                          </span>
                          <ResultBadge resultado={event.resultado} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </Card>
        </div>
      )}

      <AssetFormModal
        open={editOpen && selected !== undefined}
        asset={selected ?? null}
        rooms={roomList}
        onClose={() => setEditOpen(false)}
        onSaved={(saved) => setSelectedId(saved.id)}
      />
    </div>
  );
}
