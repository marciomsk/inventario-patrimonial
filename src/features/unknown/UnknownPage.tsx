import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Badge, Card, EmptyState } from '../../components/Card';
import { Button } from '../../components/Button';
import { useApp } from '../../app/AppContext';
import { useToast } from '../../app/ToastContext';
import { useInventoryData } from '../../hooks/useInventoryData';
import { formatDateTime, formatNumber } from '../../domain/format';
import { roomLabel } from '../../domain/plaqueta';
import { exportUnknownCsv } from '../../services/export';
import type { InventoryEvent } from '../../domain/types';

type Tab = 'nao_cadastrado' | 'duplicado_cadastro';

interface Group {
  key: string;
  plaqueta: string;
  events: InventoryEvent[];
  last: InventoryEvent;
}

export function UnknownPage() {
  const { session } = useApp();
  const { events, summary, loading } = useInventoryData();
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('nao_cadastrado');

  const groups = useMemo(() => {
    if (!session) return [] as Group[];
    const map = new Map<string, Group>();
    for (const event of events) {
      if (event.inventorySessionId !== session.id || event.resultado !== tab) continue;
      const current = map.get(event.plaquetaKey);
      if (!current) {
        map.set(event.plaquetaKey, {
          key: event.plaquetaKey,
          plaqueta: event.plaqueta,
          events: [event],
          last: event,
        });
      } else {
        current.events.push(event);
        if (event.dataHora > current.last.dataHora) current.last = event;
      }
    }
    return [...map.values()].sort((a, b) => b.last.dataHora.localeCompare(a.last.dataHora));
  }, [events, session, tab]);

  return (
    <div className="page">
      <PageHeader
        eyebrow={`${formatNumber(summary.naoCadastrados)} plaquetas sem cadastro · ${formatNumber(
          summary.cadastroDuplicado,
        )} com cadastro duplicado`}
        title="Não cadastrados"
        subtitle="Leituras que não puderam ser vinculadas automaticamente a um único bem."
        actions={
          <Button
            icon="download"
            disabled={!session}
            onClick={() => {
              if (!session) return;
              const filename = exportUnknownCsv(events, session.id);
              push(`Arquivo ${filename} gerado.`, 'success');
            }}
          >
            Exportar CSV
          </Button>
        }
      />

      <Card>
        <div className="tabs" role="tablist" aria-label="Tipos de leitura">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'nao_cadastrado'}
            className={tab === 'nao_cadastrado' ? 'is-active' : ''}
            onClick={() => setTab('nao_cadastrado')}
          >
            Sem cadastro
            <Badge tone="danger">{formatNumber(summary.naoCadastrados)}</Badge>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'duplicado_cadastro'}
            className={tab === 'duplicado_cadastro' ? 'is-active' : ''}
            onClick={() => setTab('duplicado_cadastro')}
          >
            Cadastro duplicado
            <Badge tone="info">{formatNumber(summary.cadastroDuplicado)}</Badge>
          </button>
        </div>

        {loading ? (
          <div className="skeleton skeleton--panel" />
        ) : groups.length === 0 ? (
          <EmptyState
            icon="check"
            title={
              tab === 'nao_cadastrado'
                ? 'Nenhuma plaqueta sem cadastro'
                : 'Nenhuma leitura com cadastro duplicado'
            }
            description={
              tab === 'nao_cadastrado'
                ? 'Leituras de plaquetas que não existem no cadastro aparecem aqui.'
                : 'Leituras de plaquetas com mais de um bem no cadastro ficam aqui até a resolução manual.'
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Plaqueta</th>
                  <th>Leituras</th>
                  <th>Última sala</th>
                  <th>Última leitura</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.key}>
                    <td className="mono">{group.plaqueta}</td>
                    <td>{formatNumber(group.events.length)}</td>
                    <td>{roomLabel(group.last.localBipagem)}</td>
                    <td className="nowrap">{formatDateTime(group.last.dataHora)}</td>
                    <td>{group.last.observacao ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="card__note">
          Nenhum bem é criado automaticamente a partir de uma leitura. Use a consulta ao Senior
          para decidir o cadastro correto.
        </p>
      </Card>
    </div>
  );
}
