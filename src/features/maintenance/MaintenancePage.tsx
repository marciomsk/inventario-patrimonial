import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '../../components/PageHeader';
import { Badge, Card, EmptyState, StatCard } from '../../components/Card';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/Modal';
import { useToast } from '../../app/ToastContext';
import { useInventoryData } from '../../hooks/useInventoryData';
import { createMaintenance, updateMaintenanceStatus, getMaintenanceHistory, listMaintenances } from '../../db/maintenanceRepository';
import { writeOffAsset } from '../../db/assetsRepository';
import { generateMaintenancePdfReport } from '../../services/pdfReport';
import { formatDateTime, formatNumber } from '../../domain/format';
import type { Maintenance, MaintenanceStatus } from '../../domain/types';

const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  EM_APROVACAO: 'Em Aprovação',
  APROVADO_CONSERTO: 'Aprovado Conserto',
  APROVADO_TROCA: 'Aprovado Troca',
  CONCLUIDO: 'Concluído',
  REPROVADO: 'Reprovado',
};

const STATUS_TONES: Record<MaintenanceStatus, 'warning' | 'info' | 'danger' | 'success' | 'neutral'> = {
  EM_APROVACAO: 'warning',
  APROVADO_CONSERTO: 'info',
  APROVADO_TROCA: 'info',
  CONCLUIDO: 'success',
  REPROVADO: 'danger',
};

export function MaintenancePage() {
  const { assets, assetsById, roomList } = useInventoryData();
  const { push } = useToast();
  const maintenances = useLiveQuery(() => listMaintenances(), []) ?? [];

  const [term, setTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [statusModalItem, setStatusModalItem] = useState<Maintenance | null>(null);
  const [newStatus, setNewStatus] = useState<MaintenanceStatus>('APROVADO_CONSERTO');
  const [statusObs, setStatusObs] = useState('');

  // Form states for new maintenance request
  const [plaqueta, setPlaqueta] = useState('');
  const [manutencaoProposta, setManutencaoProposta] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [codigoFornecedor, setCodigoFornecedor] = useState('');
  const [valorPecas, setValorPecas] = useState('');
  const [valorServicos, setValorServicos] = useState('');
  const [valorBemNovo, setValorBemNovo] = useState('');
  const [ocServicos, setOcServicos] = useState('');
  const [ocProdutos, setOcProdutos] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const selectedAsset = useMemo(() => {
    const clean = plaqueta.trim().toLowerCase();
    if (!clean) return null;
    return assets.find(
      (a) => a.plaqueta.toLowerCase() === clean || a.plaquetaKey === clean,
    );
  }, [assets, plaqueta]);

  const assetHistory = useLiveQuery(
    async () => (selectedAsset ? getMaintenanceHistory(selectedAsset.plaqueta) : []),
    [selectedAsset],
  ) ?? [];

  const totalPastSpent = useMemo(() => {
    return assetHistory.reduce((sum, m) => sum + m.valorOrcado, 0);
  }, [assetHistory]);

  const currentQuote = (parseFloat(valorPecas) || 0) + (parseFloat(valorServicos) || 0);
  const totalAccumulated = totalPastSpent + currentQuote;
  const newAssetCost = parseFloat(valorBemNovo) || 0;
  const inviabilityRatio = newAssetCost > 0 ? (totalAccumulated / newAssetCost) * 100 : 0;

  // Summary metrics
  const emAprovacaoCount = maintenances.filter((m) => m.status === 'EM_APROVACAO').length;
  const emConsertoCount = maintenances.filter((m) => m.status === 'APROVADO_CONSERTO').length;
  
  const currentYearStr = String(new Date().getFullYear());
  const gastoAcumuladoAno = maintenances
    .filter((m) => m.dataSolicitacao.includes(currentYearStr) && m.status !== 'REPROVADO')
    .reduce((sum, m) => sum + m.valorOrcado, 0);

  // Alertas de inviabilidade: manutenções ou bens onde gasto acumulado ultrapassa 60% do bem novo
  const totalInviabilidadeAlerts = maintenances.filter((m) => {
    if (!m.valorBemNovo || m.valorBemNovo <= 0) return false;
    return m.valorOrcado / m.valorBemNovo >= 0.6;
  }).length;

  const filteredMaintenances = useMemo(() => {
    const clean = term.trim().toLowerCase();
    if (!clean) return maintenances;
    return maintenances.filter(
      (m) =>
        m.plaqueta.toLowerCase().includes(clean) ||
        m.numeroDocumento.toLowerCase().includes(clean) ||
        m.fornecedor.toLowerCase().includes(clean) ||
        m.manutencaoProposta.toLowerCase().includes(clean),
    );
  }, [maintenances, term]);

  async function handleCreateMaintenance(e: React.FormEvent) {
    e.preventDefault();
    if (!plaqueta.trim()) {
      push('Informe a plaqueta do equipamento.', 'warning');
      return;
    }
    if (!manutencaoProposta.trim()) {
      push('Descreva a manutenção proposta.', 'warning');
      return;
    }

    try {
      await createMaintenance({
        assetId: selectedAsset?.id ?? null,
        plaqueta: plaqueta.trim(),
        manutencaoProposta,
        fornecedor: fornecedor.trim() || 'Fornecedor padrão',
        codigoFornecedor: codigoFornecedor.trim() || null,
        valorPecas: parseFloat(valorPecas) || 0,
        valorServicos: parseFloat(valorServicos) || 0,
        valorBemNovo: valorBemNovo ? parseFloat(valorBemNovo) : null,
        ocServicos: ocServicos.trim() || null,
        ocProdutos: ocProdutos.trim() || null,
        observacoes: observacoes.trim() || null,
        status: 'EM_APROVACAO',
      });
      push('Solicitação de manutenção criada com sucesso.', 'success');
      setModalOpen(false);
      resetForm();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Falha ao criar solicitação.', 'error');
    }
  }

  function resetForm() {
    setPlaqueta('');
    setManutencaoProposta('');
    setFornecedor('');
    setCodigoFornecedor('');
    setValorPecas('');
    setValorServicos('');
    setValorBemNovo('');
    setOcServicos('');
    setOcProdutos('');
    setObservacoes('');
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Gestão"
        title="Manutenção e Viabilidade"
        subtitle="Controle de ordens de serviço, orçamentos, histórico de consertos e análise de viabilidade (VMME110)."
        actions={
          <Button variant="primary" icon="plus" onClick={() => setModalOpen(true)}>
            Nova solicitação
          </Button>
        }
      />

      <div className="stats-grid stats-grid--compact">
        <StatCard
          label="Em Aprovação"
          value={formatNumber(emAprovacaoCount)}
          icon="clipboard"
          tone="warning"
        />
        <StatCard
          label="Em Conserto"
          value={formatNumber(emConsertoCount)}
          icon="refresh"
          tone="info"
        />
        <StatCard
          label="Gasto no Ano"
          value={`R$ ${gastoAcumuladoAno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon="dashboard"
          tone="success"
        />
        <StatCard
          label="Alertas Inviabilidade"
          value={formatNumber(totalInviabilidadeAlerts)}
          icon="alert"
          tone={totalInviabilidadeAlerts > 0 ? 'danger' : 'success'}
        />
      </div>

      <Card>
        <div className="filters">
          <label className="search-input search-input--sm">
            <Icon name="search" size={18} />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar por plaqueta, documento, fornecedor ou descrição..."
              autoComplete="off"
            />
          </label>
          <span className="filters__count">{formatNumber(filteredMaintenances.length)} solicitações</span>
        </div>

        {filteredMaintenances.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title="Nenhuma manutenção encontrada"
            description="Cadastre uma nova solicitação ou importe o relatório VMME110.CSV na aba Importar."
            action={
              <Button variant="primary" icon="plus" onClick={() => setModalOpen(true)}>
                Nova solicitação
              </Button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Documento / Data</th>
                  <th>Plaqueta / Equipamento</th>
                  <th>Manutenção Proposta</th>
                  <th>Fornecedor</th>
                  <th>Valor Orçado</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaintenances.map((item) => {
                  const asset = assetsById.get(item.assetId ?? '') ?? assets.find((a) => a.plaqueta === item.plaqueta);
                  const room = asset ? roomList.find((r) => r.id === asset.roomId) : null;
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.numeroDocumento}</strong>
                        <div className="muted" style={{ fontSize: '11px' }}>
                          {formatDateTime(item.dataSolicitacao)}
                        </div>
                      </td>
                      <td>
                        <span className="mono" style={{ fontWeight: 'bold' }}>{item.plaqueta}</span>
                        <div style={{ fontSize: '12px', color: '#4d6057' }}>
                          {asset?.descricao || 'Equipamento externo'}
                        </div>
                      </td>
                      <td>{item.manutencaoProposta}</td>
                      <td>
                        {item.fornecedor}
                        {item.numeroManutencaoSenior ? (
                          <div className="muted" style={{ fontSize: '11px' }}>Mnt: {item.numeroManutencaoSenior}</div>
                        ) : null}
                      </td>
                      <td>
                        <strong>R$ {item.valorOrcado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      </td>
                      <td>
                        <Badge tone={STATUS_TONES[item.status]}>
                          {STATUS_LABELS[item.status]}
                        </Badge>
                      </td>
                      <td>
                        <div className="row-actions" style={{ gap: '6px' }}>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon="file"
                            onClick={async () => {
                              const history = await getMaintenanceHistory(item.plaqueta);
                              const pastItems = history.filter(
                                (m) => m.id !== item.id && m.dataSolicitacao <= item.dataSolicitacao && m.status === 'CONCLUIDO',
                              );
                              const pastCount = pastItems.length;
                              const totalPastSpent = pastItems.reduce((sum, m) => sum + m.valorOrcado, 0);

                              generateMaintenancePdfReport({
                                maintenance: item,
                                asset,
                                room,
                                pastCount,
                                totalPastSpent,
                              });
                            }}
                            title="Gerar PDF para Comissão"
                          >
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setStatusModalItem(item);
                              setNewStatus(item.status);
                              setStatusObs(item.observacoes ?? '');
                            }}
                          >
                            Status
                          </Button>
                          {item.status === 'APROVADO_TROCA' && asset && !asset.baixado ? (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={async () => {
                                if (confirm(`Deseja efetuar a baixa patrimonial do bem ${asset.plaqueta} por motivo de troca/substituição?`)) {
                                  await writeOffAsset(asset.id, `Substituído por troca aprovada (Doc ${item.numeroDocumento})`);
                                  push('Baixa patrimonial efetuada com sucesso.', 'success');
                                }
                              }}
                            >
                              Dar baixa
                            </Button>
                          ) : null}
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

      {/* Modal Nova Solicitação */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        wide
        title="Nova Solicitação de Conserto ou Troca"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" icon="save" onClick={handleCreateMaintenance}>
              Salvar solicitação
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateMaintenance} className="form-stack">
          <p className="muted">
            Preencha os dados do equipamento e orçamento. O sistema avalia a viabilidade financeira comparando o acumulado com o valor de um bem novo.
          </p>

          <div className="field-row">
            <label className="field">
              <span>Plaqueta do Patrimônio</span>
              <input
                value={plaqueta}
                onChange={(e) => setPlaqueta(e.target.value)}
                placeholder="Ex.: 022308"
                autoComplete="off"
                required
              />
            </label>
            <label className="field">
              <span>Valor de um Bem Novo (R$)</span>
              <input
                type="number"
                step="0.01"
                value={valorBemNovo}
                onChange={(e) => setValorBemNovo(e.target.value)}
                placeholder="Ex.: 3500.00"
              />
            </label>
          </div>

          {selectedAsset ? (
            <div className="box" style={{ background: '#f7faf8', padding: '12px', borderRadius: '8px', border: '1px solid #e0e8e3' }}>
              <p><strong>Equipamento:</strong> {selectedAsset.descricao || 'Sem descrição'}</p>
              <p><strong>Setor / Sala:</strong> {selectedAsset.localOriginal || 'Não informado'}</p>
              <p><strong>Data de Aquisição:</strong> {selectedAsset.dataAquisicao || 'Não informada'}</p>
              <p><strong>Histórico anterior:</strong> {assetHistory.length} conserto(s) — Total já gasto: <strong>R$ {totalPastSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
            </div>
          ) : plaqueta.trim() ? (
            <p className="muted" style={{ color: '#b7791f' }}>⚠️ Plaqueta não encontrada no cadastro base. A solicitação será registrada como equipamento externo.</p>
          ) : null}

          <label className="field">
            <span>Manutenção Proposta / Descrição do Serviço</span>
            <textarea
              rows={3}
              value={manutencaoProposta}
              onChange={(e) => setManutencaoProposta(e.target.value)}
              placeholder="Descreva detalhadamente o problema e o serviço necessário..."
              required
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Fornecedor / Oficina</span>
              <input
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                placeholder="Ex.: Assistência Técnica Autorizada"
              />
            </label>
            <label className="field">
              <span>Código Fornecedor (Senior)</span>
              <input
                value={codigoFornecedor}
                onChange={(e) => setCodigoFornecedor(e.target.value)}
                placeholder="Ex.: 1294"
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Valor Peças (R$)</span>
              <input
                type="number"
                step="0.01"
                value={valorPecas}
                onChange={(e) => setValorPecas(e.target.value)}
                placeholder="0.00"
              />
            </label>
            <label className="field">
              <span>Valor Serviços (R$)</span>
              <input
                type="number"
                step="0.01"
                value={valorServicos}
                onChange={(e) => setValorServicos(e.target.value)}
                placeholder="0.00"
              />
            </label>
          </div>

          <div style={{ background: '#eef3ef', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Valor Total Orçado: <strong>R$ {currentQuote.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
            <span>Gasto Acumulado (Anterior + Atual): <strong>R$ {totalAccumulated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
          </div>

          {newAssetCost > 0 && inviabilityRatio >= 50 ? (
            <div style={{ background: inviabilityRatio >= 70 ? '#fdeaea' : '#fdf3dc', border: `1px solid ${inviabilityRatio >= 70 ? '#f5c6cb' : '#ffeeba'}`, padding: '12px', borderRadius: '8px', color: inviabilityRatio >= 70 ? '#9b1c1c' : '#92610a' }}>
              <p><strong>⚠️ Alerta de Viabilidade Financeira:</strong> O custo acumulado de conserto representa <strong>{inviabilityRatio.toFixed(1)}%</strong> do valor de um equipamento novo equivalente ({inviabilityRatio >= 70 ? 'Inviabilidade alta recomendando troca/substituição' : 'Recomenda-se cautela na aprovação do conserto'}).</p>
            </div>
          ) : null}

          <div className="field-row">
            <label className="field">
              <span>OC Serviços</span>
              <input
                value={ocServicos}
                onChange={(e) => setOcServicos(e.target.value)}
                placeholder="Nº OC Serviços"
              />
            </label>
            <label className="field">
              <span>OC Produtos</span>
              <input
                value={ocProdutos}
                onChange={(e) => setOcProdutos(e.target.value)}
                placeholder="Nº OC Produtos"
              />
            </label>
          </div>

          <label className="field">
            <span>Observações / Justificativa</span>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais para a Comissão..."
            />
          </label>
        </form>
      </Modal>

      {/* Modal Atualizar Status */}
      {statusModalItem ? (
        <Modal
          open={statusModalItem !== null}
          onClose={() => setStatusModalItem(null)}
          title={`Atualizar Status — ${statusModalItem.numeroDocumento}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setStatusModalItem(null)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  try {
                    await updateMaintenanceStatus(statusModalItem.id, newStatus, statusObs);
                    push('Status atualizado com sucesso.', 'success');
                    setStatusModalItem(null);
                  } catch (err) {
                    push('Erro ao atualizar status.', 'error');
                  }
                }}
              >
                Salvar status
              </Button>
            </>
          }
        >
          <div className="form-stack">
            <label className="field">
              <span>Novo Status</span>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as MaintenanceStatus)}
              >
                {Object.entries(STATUS_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Observações / Parecer</span>
              <textarea
                rows={3}
                value={statusObs}
                onChange={(e) => setStatusObs(e.target.value)}
                placeholder="Observações da comissão ou justificativa..."
              />
            </label>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
