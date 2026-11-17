import { db } from './database';
import { createId, nowIso } from '../domain/id';
import { cleanText, plaquetaKey } from '../domain/plaqueta';
import type { Maintenance, MaintenanceStatus } from '../domain/types';

export interface MaintenanceInput {
  assetId?: string | null;
  plaqueta: string;
  dataSolicitacao?: string;
  manutencaoProposta: string;
  fornecedor: string;
  codigoFornecedor?: string | null;
  numeroManutencaoSenior?: string | null;
  nfPecas?: string | null;
  nfServicos?: string | null;
  valorPecas: number;
  valorServicos: number;
  valorBemNovo?: number | null;
  status?: MaintenanceStatus;
  ocServicos?: string | null;
  ocProdutos?: string | null;
  observacoes?: string | null;
}

export async function listMaintenances(): Promise<Maintenance[]> {
  const items = await db.maintenances.toArray();
  return items.sort((a, b) => b.dataSolicitacao.localeCompare(a.dataSolicitacao));
}

export async function getMaintenance(id: string): Promise<Maintenance | null> {
  return (await db.maintenances.get(id)) ?? null;
}

export async function getMaintenanceHistory(plaqueta: string): Promise<Maintenance[]> {
  const key = plaquetaKey(plaqueta);
  const items = await db.maintenances.toArray();
  return items
    .filter((m) => plaquetaKey(m.plaqueta) === key)
    .sort((a, b) => b.dataSolicitacao.localeCompare(a.dataSolicitacao));
}

export async function generateNextDocumentNumber(): Promise<string> {
  const all = await db.maintenances.toArray();
  const currentYear = new Date().getFullYear();
  const currentYearStr = String(currentYear);

  let maxSeq = 2148; // starting base if empty
  for (const item of all) {
    if (item.numeroDocumento) {
      const parts = item.numeroDocumento.split('/');
      if (parts.length === 2 && parts[1] === currentYearStr) {
        const seq = parseInt(parts[0], 10);
        if (!Number.isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const seqPadded = String(nextSeq).padStart(5, '0');
  return `${seqPadded}/${currentYearStr}`;
}

export async function createMaintenance(input: MaintenanceInput): Promise<Maintenance> {
  const plaqueta = cleanText(input.plaqueta);
  if (!plaqueta) throw new Error('Informe a plaqueta do equipamento.');
  const manutencaoProposta = cleanText(input.manutencaoProposta);
  if (!manutencaoProposta) throw new Error('Descreva a manutenção proposta.');
  const fornecedor = cleanText(input.fornecedor) || 'Não informado';

  const valorPecas = Number(input.valorPecas) || 0;
  const valorServicos = Number(input.valorServicos) || 0;
  const valorOrcado = valorPecas + valorServicos;
  const numeroDocumento = await generateNextDocumentNumber();
  const now = nowIso();

  const maintenance: Maintenance = {
    id: createId(),
    numeroDocumento,
    assetId: input.assetId ?? null,
    plaqueta,
    dataSolicitacao: input.dataSolicitacao || now,
    manutencaoProposta,
    fornecedor,
    codigoFornecedor: cleanText(input.codigoFornecedor) || null,
    numeroManutencaoSenior: cleanText(input.numeroManutencaoSenior) || null,
    nfPecas: cleanText(input.nfPecas) || null,
    nfServicos: cleanText(input.nfServicos) || null,
    valorPecas,
    valorServicos,
    valorOrcado,
    valorBemNovo: input.valorBemNovo !== undefined && input.valorBemNovo !== null ? Number(input.valorBemNovo) : null,
    status: input.status ?? 'EM_APROVACAO',
    ocServicos: cleanText(input.ocServicos) || null,
    ocProdutos: cleanText(input.ocProdutos) || null,
    observacoes: cleanText(input.observacoes) || null,
    createdAt: now,
    updatedAt: now,
  };

  await db.maintenances.add(maintenance);
  return maintenance;
}

export async function updateMaintenanceStatus(id: string, status: MaintenanceStatus, observacoes?: string | null): Promise<Maintenance> {
  return db.transaction('rw', db.maintenances, async () => {
    const item = await db.maintenances.get(id);
    if (!item) throw new Error('Solicitação de manutenção não encontrada.');
    const now = nowIso();
    const updated: Maintenance = {
      ...item,
      status,
      observacoes: observacoes !== undefined ? cleanText(observacoes) : item.observacoes,
      updatedAt: now,
    };
    await db.maintenances.put(updated);
    return updated;
  });
}

export async function updateMaintenance(id: string, input: Partial<MaintenanceInput>): Promise<Maintenance> {
  return db.transaction('rw', db.maintenances, async () => {
    const item = await db.maintenances.get(id);
    if (!item) throw new Error('Solicitação de manutenção não encontrada.');
    const now = nowIso();
    const valorPecas = input.valorPecas !== undefined ? Number(input.valorPecas) || 0 : item.valorPecas;
    const valorServicos = input.valorServicos !== undefined ? Number(input.valorServicos) || 0 : item.valorServicos;

    const updated: Maintenance = {
      ...item,
      ...input,
      plaqueta: input.plaqueta !== undefined ? cleanText(input.plaqueta) : item.plaqueta,
      manutencaoProposta: input.manutencaoProposta !== undefined ? cleanText(input.manutencaoProposta) : item.manutencaoProposta,
      fornecedor: input.fornecedor !== undefined ? cleanText(input.fornecedor) : item.fornecedor,
      valorPecas,
      valorServicos,
      valorOrcado: valorPecas + valorServicos,
      updatedAt: now,
    };
    await db.maintenances.put(updated);
    return updated;
  });
}
