import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { Badge, Card, EmptyState, StatCard } from '../../components/Card';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/Modal';
import { useToast } from '../../app/ToastContext';
import { useInventoryData } from '../../hooks/useInventoryData';
import { db } from '../../db/database';
import { listMovements, createMovement, updateMovement, generateNextCmbNumber } from '../../db/movementRepository';
import { generateMovementPdfReport } from '../../services/pdfReport';
import { formatNumber } from '../../domain/format';
import type { MovementType, MovementItem, TransferType, BaixaReason } from '../../domain/types';

const TYPE_LABELS: Record<MovementType, string> = {
  AQUISICAO: 'Aquisição',
  TRANSFERENCIA: 'Transferência',
  REMESSA_CONSERTO: 'Remessa Conserto',
  BAIXA: 'Baixa Patrimonial',
};

const TYPE_TONES: Record<MovementType, 'success' | 'info' | 'warning' | 'danger'> = {
  AQUISICAO: 'success',
  TRANSFERENCIA: 'info',
  REMESSA_CONSERTO: 'warning',
  BAIXA: 'danger',
};

export function MovementPage() {
  const { assets } = useInventoryData();
  const { push } = useToast();
  const location = useLocation();
  const stateParam = (location.state as { prefillMaintenance?: any } | null);

  const movements = useLiveQuery(() => listMovements(), []) ?? [];

  const [term, setTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form states
  const [numeroCmb, setNumeroCmb] = useState('1054');
  const [dataEmissao, setDataEmissao] = useState(new Date().toLocaleDateString('pt-BR'));
  const [localOrigem, setLocalOrigem] = useState('Sede Principal');
  const [predioOrigem, setPredioOrigem] = useState('Prédio Administrativo');
  const [salaOrigem, setSalaOrigem] = useState('');
  const [tipoMovimentacao, setTipoMovimentacao] = useState<MovementType>(
    stateParam?.prefillMaintenance ? 'REMESSA_CONSERTO' : 'TRANSFERENCIA',
  );

  // Transferência
  const [localDestino, setLocalDestino] = useState('');
  const [predioDestino, setPredioDestino] = useState('');
  const [salaDestino, setSalaDestino] = useState('');
  const [tipoTransferencia, setTipoTransferencia] = useState<TransferType>('DEFINITIVA');
  const [dataRetornoTemporaria, setDataRetornoTemporaria] = useState('');

  // Conserto
  const [fornecedor, setFornecedor] = useState(stateParam?.prefillMaintenance?.fornecedor ?? '');
  const [contatoFornecedor, setContatoFornecedor] = useState('');
  const [cnpjCpfFornecedor, setCnpjCpfFornecedor] = useState('');
  const [dataRetornoConserto, setDataRetornoConserto] = useState('');
  const [justificativaConserto, setJustificativaConserto] = useState(
    stateParam?.prefillMaintenance ? `Remessa para conserto - Doc ${stateParam.prefillMaintenance.numeroDocumento}` : '',
  );

  // Baixa
  const [motivoBaixa, setMotivoBaixa] = useState<BaixaReason>('SUCATEAMENTO');
  const [justificativaDestinoBaixa, setJustificativaDestinoBaixa] = useState('');

  // Itens
  const [plaquetaInput, setPlaquetaInput] = useState(stateParam?.prefillMaintenance?.plaqueta ?? '');
  const [serieInput, setSerieInput] = useState('');
  const [dataAqInput, setDataAqInput] = useState('');
  const [valAqInput, setValAqInput] = useState(stateParam?.prefillMaintenance ? String(stateParam.prefillMaintenance.valorOrcado) : '');
  const [itens, setItens] = useState<MovementItem[]>(
    stateParam?.prefillMaintenance
      ? [
          {
            plaqueta: stateParam.prefillMaintenance.plaqueta,
            quantidade: 1,
            descricao: stateParam.prefillMaintenance.manutencaoProposta,
            numeroSerie: '',
            dataAquisicao: '',
            valorAquisicao: stateParam.prefillMaintenance.valorOrcado,
            valorResidual: 0,
            salaOrigem: 'Setor de Manutenção',
          },
        ]
      : [],
  );

  const [cedenteNome, setCedenteNome] = useState('');
  const [receptorNome, setReceptorNome] = useState('');
  const [aplicadoNoInventario, setAplicadoNoInventario] = useState(true);

  // Fiscais
  const [naturezaOperacao, setNaturezaOperacao] = useState('Remessa para Conserto / Transferência');
  const [valorTotal, setValorTotal] = useState('');
  const [cfop, setCfop] = useState('5.949');

  async function openNew() {
    setEditingItem(null);
    resetForm();
    const nextNum = await generateNextCmbNumber();
    setNumeroCmb(nextNum);
    setDataEmissao(new Date().toLocaleDateString('pt-BR'));
    setModalOpen(true);
  }

  function openEdit(item: any) {
    setEditingItem(item);
    setNumeroCmb(item.numeroCmb);
    setDataEmissao(item.dataEmissao);
    setLocalOrigem(item.localOrigem);
    setPredioOrigem(item.predioOrigem ?? '');
    setSalaOrigem(item.salaOrigem);
    setTipoMovimentacao(item.tipoMovimentacao);

    setLocalDestino(item.localDestino ?? '');
    setPredioDestino(item.predioDestino ?? '');
    setSalaDestino(item.salaDestino ?? '');
    setTipoTransferencia(item.tipoTransferencia ?? 'DEFINITIVA');
    setDataRetornoTemporaria(item.dataRetornoTemporaria ?? '');

    setFornecedor(item.fornecedor ?? '');
    setContatoFornecedor(item.contatoFornecedor ?? '');
    setCnpjCpfFornecedor(item.cnpjCpfFornecedor ?? '');
    setDataRetornoConserto(item.dataRetornoConserto ?? '');
    setJustificativaConserto(item.justificativaConserto ?? '');

    setMotivoBaixa(item.motivoBaixa ?? 'SUCATEAMENTO');
    setJustificativaDestinoBaixa(item.justificativaDestinoBaixa ?? '');

    setItens(item.itens ?? []);
    setCedenteNome(item.cedenteNome ?? '');
    setReceptorNome(item.receptorNome ?? '');
    setAplicadoNoInventario(item.aplicadoNoInventario ?? true);

    setNaturezaOperacao(item.naturezaOperacao ?? '');
    setValorTotal(item.valorTotal ? String(item.valorTotal) : '');
    setCfop(item.cfop ?? '');

    setModalOpen(true);
  }

  function resetForm() {
    setLocalOrigem('Sede Principal');
    setPredioOrigem('Prédio Administrativo');
    setSalaOrigem('');
    setLocalDestino('');
    setPredioDestino('');
    setSalaDestino('');
    setFornecedor('');
    setContatoFornecedor('');
    setCnpjCpfFornecedor('');
    setDataRetornoConserto('');
    setJustificativaConserto('');
    setJustificativaDestinoBaixa('');
    setItens([]);
    setPlaquetaInput('');
    setSerieInput('');
    setDataAqInput('');
    setValAqInput('');
    setCedenteNome('');
    setReceptorNome('');
  }

  function handlePlaquetaChange(val: string) {
    setPlaquetaInput(val);
    const clean = val.trim().toLowerCase();
    if (!clean) return;
    const found = assets.find((a) => a.plaqueta.toLowerCase() === clean || a.plaquetaKey === clean);
    if (found) {
      if (found.dataAquisicao) setDataAqInput(found.dataAquisicao);
      if (found.localOriginal && !salaOrigem) setSalaOrigem(found.localOriginal);
    }
  }

  function handleAddItem() {
    const p = plaquetaInput.trim();
    if (!p) {
      push('Informe a plaqueta para adicionar o item.', 'warning');
      return;
    }
    const found = assets.find((a) => a.plaqueta === p || a.plaquetaKey === p.toUpperCase());
    const desc = found?.descricao || 'Equipamento Patrimonial';
    const dtAq = dataAqInput.trim() || found?.dataAquisicao || '';
    const originRoom = found?.localOriginal || salaOrigem || 'Setor Padrão';

    setItens((prev) => [
      ...prev,
      {
        plaqueta: p,
        quantidade: 1,
        descricao: desc,
        numeroSerie: serieInput.trim() || null,
        dataAquisicao: dtAq || null,
        valorAquisicao: valAqInput ? parseFloat(valAqInput) : null,
        valorResidual: 0,
        salaOrigem: originRoom,
      },
    ]);
    setPlaquetaInput('');
    setSerieInput('');
    setDataAqInput('');
    setValAqInput('');
  }

  function handleRemoveItem(index: number) {
    setItens((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (itens.length === 0) {
      push('Adicione pelo menos um bem ao comunicado.', 'warning');
      return;
    }

    try {
      // Atualiza data de aquisição permanente no cadastro dos bens
      for (const item of itens) {
        if (item.dataAquisicao) {
          const found = assets.find((a) => a.plaqueta === item.plaqueta || a.plaquetaKey === plaquetaKey(item.plaqueta));
          if (found) {
            await db.assets.update(found.id, { dataAquisicao: item.dataAquisicao });
          }
        }
      }

      const effectiveSalaOrigem = salaOrigem.trim() || (itens.length > 0 && itens[0].salaOrigem) || 'Setor Padrão';

      const payload = {
        numeroCmb,
        dataEmissao,
        localOrigem,
        predioOrigem,
        salaOrigem: effectiveSalaOrigem,
        tipoMovimentacao,
        localDestino: localDestino || null,
        predioDestino: predioDestino || null,
        salaDestino: salaDestino || null,
        tipoTransferencia: tipoTransferencia || null,
        dataRetornoTemporaria: dataRetornoTemporaria || null,
        fornecedor: fornecedor || null,
        contatoFornecedor: contatoFornecedor || null,
        cnpjCpfFornecedor: cnpjCpfFornecedor || null,
        dataRetornoConserto: dataRetornoConserto || null,
        justificativaConserto: justificativaConserto || null,
        motivoBaixa: motivoBaixa || null,
        justificativaDestinoBaixa: justificativaDestinoBaixa || null,
        itens,
        cedenteNome: cedenteNome || null,
        receptorNome: receptorNome || null,
        naturezaOperacao: naturezaOperacao || null,
        valorTotal: valorTotal ? parseFloat(valorTotal) : null,
        cfop: cfop || null,
        aplicadoNoInventario,
      };

      if (editingItem) {
        await updateMovement(editingItem.id, payload);
        push(`CMB Nº ${numeroCmb} atualizado com sucesso.`, 'success');
      } else {
        await createMovement(payload);
        push(`CMB Nº ${numeroCmb} emitido com sucesso.`, 'success');
      }

      setModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      push(err instanceof Error ? err.message : 'Falha ao salvar CMB.', 'error');
    }
  }

  const filtered = useMemo(() => {
    const clean = term.trim().toLowerCase();
    if (!clean) return movements;
    return movements.filter(
      (m) =>
        m.numeroCmb.toLowerCase().includes(clean) ||
        m.tipoMovimentacao.toLowerCase().includes(clean) ||
        m.itens.some((i) => i.plaqueta.toLowerCase().includes(clean) || i.descricao.toLowerCase().includes(clean)),
    );
  }, [movements, term]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Gestão"
        title="Comunicado de Movimentação de Bens (CMB)"
        subtitle="Controle digital de aquisições, transferências, remessas para conserto e baixas patrimoniais (Clube Recreativo Dores)."
        actions={
          <Button variant="primary" icon="plus" onClick={openNew}>
            Novo CMB
          </Button>
        }
      />

      <div className="stats-grid stats-grid--compact">
        <StatCard
          label="Total de CMBs"
          value={formatNumber(movements.length)}
          icon="clipboard"
          tone="info"
        />
        <StatCard
          label="Transferências"
          value={formatNumber(movements.filter((m) => m.tipoMovimentacao === 'TRANSFERENCIA').length)}
          icon="building"
          tone="success"
        />
        <StatCard
          label="Remessas Conserto"
          value={formatNumber(movements.filter((m) => m.tipoMovimentacao === 'REMESSA_CONSERTO').length)}
          icon="refresh"
          tone="warning"
        />
        <StatCard
          label="Baixas"
          value={formatNumber(movements.filter((m) => m.tipoMovimentacao === 'BAIXA').length)}
          icon="alert"
          tone="danger"
        />
      </div>

      <Card>
        <div className="filters">
          <label className="search-input search-input--sm">
            <Icon name="search" size={18} />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar por número CMB, plaqueta ou descrição..."
              autoComplete="off"
            />
          </label>
          <span className="filters__count">{formatNumber(filtered.length)} comunicados</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title="Nenhum CMB encontrado"
            description="Emita o primeiro comunicado de movimentação digital."
            action={
              <Button variant="primary" icon="plus" onClick={openNew}>
                Novo CMB
              </Button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nº CMB</th>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Origem → Destino / Fornecedor</th>
                  <th>Itens</th>
                  <th>Inventário</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td><strong>Nº {item.numeroCmb}</strong></td>
                    <td>{item.dataEmissao}</td>
                    <td>
                      <Badge tone={TYPE_TONES[item.tipoMovimentacao]}>
                        {TYPE_LABELS[item.tipoMovimentacao]}
                      </Badge>
                    </td>
                    <td>
                      {item.tipoMovimentacao === 'TRANSFERENCIA' ? `${item.salaOrigem} ➔ ${item.salaDestino || 'Externa'}` : item.fornecedor || item.motivoBaixa || item.salaOrigem}
                    </td>
                    <td>{item.itens.length} bem(ns)</td>
                    <td>
                      {item.aplicadoNoInventario ? (
                        <Badge tone="success">Aplicado</Badge>
                      ) : (
                        <Badge tone="neutral">Pendente</Badge>
                      )}
                    </td>
                    <td>
                      <div className="row-actions" style={{ gap: '6px' }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon="file"
                          onClick={() => generateMovementPdfReport({ notice: item })}
                        >
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openEdit(item)}
                        >
                          Editar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Novo/Editar CMB */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        wide
        title={editingItem ? `Editar CMB — Nº ${editingItem.numeroCmb}` : 'Novo Comunicado de Movimentação de Bens (CMB)'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" icon="save" onClick={handleSave}>
              Salvar e gerar PDF
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="form-stack">
          <div className="field-row">
            <label className="field">
              <span>Número do CMB</span>
              <input
                value={numeroCmb}
                onChange={(e) => setNumeroCmb(e.target.value)}
                placeholder="Ex.: 1054"
                required
              />
            </label>
            <label className="field">
              <span>Data de Emissão</span>
              <input
                value={dataEmissao}
                onChange={(e) => setDataEmissao(e.target.value)}
                placeholder="DD/MM/AAAA"
                required
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Tipo de Movimentação</span>
              <select
                value={tipoMovimentacao}
                onChange={(e) => setTipoMovimentacao(e.target.value as MovementType)}
              >
                {Object.entries(TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Sala / Área de Origem</span>
              <input
                value={salaOrigem}
                onChange={(e) => setSalaOrigem(e.target.value)}
                placeholder="Automático conforme itens ou digite uma geral"
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Local / Sede Origem</span>
              <input
                value={localOrigem}
                onChange={(e) => setLocalOrigem(e.target.value)}
                placeholder="Ex.: Sede Principal"
                required
              />
            </label>
            <label className="field">
              <span>Prédio Origem</span>
              <input
                value={predioOrigem}
                onChange={(e) => setPredioOrigem(e.target.value)}
                placeholder="Ex.: Prédio Administrativo"
              />
            </label>
          </div>

          {tipoMovimentacao === 'TRANSFERENCIA' ? (
            <div className="box" style={{ background: '#f7faf8', padding: '12px', borderRadius: '8px' }}>
              <h4>Dados da Transferência</h4>
              <div className="field-row" style={{ marginTop: '8px' }}>
                <label className="field">
                  <span>Local Destino</span>
                  <input
                    value={localDestino}
                    onChange={(e) => setLocalDestino(e.target.value)}
                    placeholder="Ex.: Sede Principal"
                  />
                </label>
                <label className="field">
                  <span>Prédio Destino</span>
                  <input
                    value={predioDestino}
                    onChange={(e) => setPredioDestino(e.target.value)}
                    placeholder="Ex.: Anexo"
                  />
                </label>
              </div>
              <div className="field-row" style={{ marginTop: '8px' }}>
                <label className="field">
                  <span>Sala / Local de Destino</span>
                  <input
                    value={salaDestino}
                    onChange={(e) => setSalaDestino(e.target.value)}
                    placeholder="Ex.: Recepção / Tesouraria"
                  />
                </label>
                <label className="field">
                  <span>Tipo de Transferência</span>
                  <select
                    value={tipoTransferencia}
                    onChange={(e) => setTipoTransferencia(e.target.value as TransferType)}
                  >
                    <option value="DEFINITIVA">Definitiva</option>
                    <option value="TEMPORARIA">Temporária</option>
                  </select>
                </label>
              </div>
              {tipoTransferencia === 'TEMPORARIA' ? (
                <label className="field" style={{ marginTop: '8px' }}>
                  <span>Data Prevista de Retorno</span>
                  <input
                    value={dataRetornoTemporaria}
                    onChange={(e) => setDataRetornoTemporaria(e.target.value)}
                    placeholder="DD/MM/AAAA"
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          {tipoMovimentacao === 'REMESSA_CONSERTO' ? (
            <div className="box" style={{ background: '#fdf3dc', padding: '12px', borderRadius: '8px' }}>
              <h4>Dados da Remessa para Conserto</h4>
              <div className="field-row" style={{ marginTop: '8px' }}>
                <label className="field">
                  <span>Fornecedor / Oficina</span>
                  <input
                    value={fornecedor}
                    onChange={(e) => setFornecedor(e.target.value)}
                    placeholder="Nome da assistência técnica"
                  />
                </label>
                <label className="field">
                  <span>Contato do Fornecedor</span>
                  <input
                    value={contatoFornecedor}
                    onChange={(e) => setContatoFornecedor(e.target.value)}
                    placeholder="Telefone / Nome do contato"
                  />
                </label>
              </div>
              <div className="field-row" style={{ marginTop: '8px' }}>
                <label className="field">
                  <span>CNPJ / CPF do Fornecedor</span>
                  <input
                    value={cnpjCpfFornecedor}
                    onChange={(e) => setCnpjCpfFornecedor(e.target.value)}
                    placeholder="00.000.000/0001-00"
                  />
                </label>
                <label className="field">
                  <span>Previsão de Retorno</span>
                  <input
                    value={dataRetornoConserto}
                    onChange={(e) => setDataRetornoConserto(e.target.value)}
                    placeholder="DD/MM/AAAA"
                  />
                </label>
              </div>
              <label className="field" style={{ marginTop: '8px' }}>
                <span>Justificativa</span>
                <input
                  value={justificativaConserto}
                  onChange={(e) => setJustificativaConserto(e.target.value)}
                  placeholder="Motivo do conserto..."
                />
              </label>
            </div>
          ) : null}

          {tipoMovimentacao === 'BAIXA' ? (
            <div className="box" style={{ background: '#fdeaea', padding: '12px', borderRadius: '8px' }}>
              <h4>Dados da Baixa Patrimonial</h4>
              <div className="field-row" style={{ marginTop: '8px' }}>
                <label className="field">
                  <span>Motivo da Baixa</span>
                  <select
                    value={motivoBaixa}
                    onChange={(e) => setMotivoBaixa(e.target.value as BaixaReason)}
                  >
                    <option value="VENDA">Venda</option>
                    <option value="TERCEIROS">Terceiros</option>
                    <option value="LEILAO">Leilão</option>
                    <option value="SUCATEAMENTO">Sucateamento</option>
                    <option value="BAIXA_BENFEITORIAS">Baixa de Benfeitorias</option>
                    <option value="DOACAO">Doação</option>
                  </select>
                </label>
                <label className="field">
                  <span>Justificativa e Destino</span>
                  <input
                    value={justificativaDestinoBaixa}
                    onChange={(e) => setJustificativaDestinoBaixa(e.target.value)}
                    placeholder="Destino final e justificativa..."
                  />
                </label>
              </div>
            </div>
          ) : null}

          {/* Adição de Itens */}
          <div className="section-box" style={{ border: '1px solid #cdd9d2', padding: '12px', borderRadius: '8px' }}>
            <h4>Itens / Bens do Comunicado ({itens.length})</h4>
            <div className="field-row" style={{ marginTop: '8px' }}>
              <label className="field">
                <span>Plaqueta do Bem</span>
                <input
                  value={plaquetaInput}
                  onChange={(e) => handlePlaquetaChange(e.target.value)}
                  placeholder="Ex.: 022308"
                />
              </label>
              <label className="field">
                <span>Nº de Série (Opcional)</span>
                <input
                  value={serieInput}
                  onChange={(e) => setSerieInput(e.target.value)}
                  placeholder="Número de série"
                />
              </label>
              <label className="field">
                <span>Data de Aquisição</span>
                <input
                  value={dataAqInput}
                  onChange={(e) => setDataAqInput(e.target.value)}
                  placeholder="DD/MM/AAAA"
                />
              </label>
              <label className="field">
                <span>Valor Aquisição (R$)</span>
                <input
                  type="number"
                  step="0.01"
                  value={valAqInput}
                  onChange={(e) => setValAqInput(e.target.value)}
                  placeholder="0.00"
                />
              </label>
            </div>
            <div style={{ marginTop: '8px' }}>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddItem}>
                Adicionar bem à lista
              </Button>
            </div>

            {itens.length > 0 ? (
              <table className="table" style={{ marginTop: '10px' }}>
                <thead>
                  <tr>
                    <th>Plaqueta</th>
                    <th>Descrição</th>
                    <th>Origem</th>
                    <th>Série</th>
                    <th>Aquisição</th>
                    <th>Valor (R$)</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((it, idx) => (
                    <tr key={idx}>
                      <td className="mono"><strong>{it.plaqueta}</strong></td>
                      <td>{it.descricao}</td>
                      <td>{it.salaOrigem || '—'}</td>
                      <td>{it.numeroSerie || '—'}</td>
                      <td>{it.dataAquisicao || '—'}</td>
                      <td>{it.valorAquisicao ? `R$ ${it.valorAquisicao.toFixed(2)}` : '—'}</td>
                      <td>
                        <Button type="button" variant="danger" size="sm" onClick={() => handleRemoveItem(idx)}>
                          Remover
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>

          <div className="field-row">
            <label className="field">
              <span>Cedente / Emitente</span>
              <input
                value={cedenteNome}
                onChange={(e) => setCedenteNome(e.target.value)}
                placeholder="Nome do responsável que cede/emite"
              />
            </label>
            <label className="field">
              <span>Receptor / Recebedor</span>
              <input
                value={receptorNome}
                onChange={(e) => setReceptorNome(e.target.value)}
                placeholder="Nome do responsável que recebe"
              />
            </label>
          </div>

          {/* Seção Fiscal (Opcional) */}
          <div className="box" style={{ background: '#f7faf8', padding: '12px', borderRadius: '8px' }}>
            <h4>Informações Fiscais (Opcional)</h4>
            <div className="field-row" style={{ marginTop: '8px' }}>
              <label className="field">
                <span>Natureza da Operação</span>
                <input
                  value={naturezaOperacao}
                  onChange={(e) => setNaturezaOperacao(e.target.value)}
                  placeholder="Ex.: Remessa para Conserto"
                />
              </label>
              <label className="field">
                <span>CFOP</span>
                <input
                  value={cfop}
                  onChange={(e) => setCfop(e.target.value)}
                  placeholder="Ex.: 5.949"
                />
              </label>
              <label className="field">
                <span>Valor Total (R$)</span>
                <input
                  type="number"
                  step="0.01"
                  value={valorTotal}
                  onChange={(e) => setValorTotal(e.target.value)}
                  placeholder="0.00"
                />
              </label>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#0f5132', marginTop: '6px' }}>
            <input
              type="checkbox"
              checked={aplicadoNoInventario}
              onChange={(e) => setAplicadoNoInventario(e.target.checked)}
            />
            Aplicar movimentação automaticamente no inventário (atualizar salas / efetuar baixa)
          </label>
        </form>
      </Modal>
    </div>
  );
}
