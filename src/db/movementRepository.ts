import { db } from './database';
import { createId, nowIso } from '../domain/id';
import { cleanText, plaquetaKey } from '../domain/plaqueta';
import { findRoomByLabel } from './roomRepository';
import { writeOffAsset } from './assetsRepository';
import type { MovementNotice, MovementItem, MovementType } from '../domain/types';

export interface MovementNoticeInput {
  numeroCmb?: string;
  dataEmissao?: string;
  localOrigem: string;
  predioOrigem?: string | null;
  salaOrigem: string;
  tipoMovimentacao: MovementType;

  localDestino?: string | null;
  predioDestino?: string | null;
  salaDestino?: string | null;
  tipoTransferencia?: 'DEFINITIVA' | 'TEMPORARIA' | null;
  dataRetornoTemporaria?: string | null;

  fornecedor?: string | null;
  contatoFornecedor?: string | null;
  cnpjCpfFornecedor?: string | null;
  dataRetornoConserto?: string | null;
  justificativaConserto?: string | null;

  motivoBaixa?: MovementNotice['motivoBaixa'];
  justificativaDestinoBaixa?: string | null;

  itens: MovementItem[];

  cedenteNome?: string | null;
  receptorNome?: string | null;

  naturezaOperacao?: string | null;
  valorTotal?: number | null;
  baseCalculo?: number | null;
  dispositivoFiscal?: string | null;
  cfop?: string | null;
  aliquotaIcms?: number | null;
  valorIcms?: number | null;

  aplicadoNoInventario?: boolean;
}

export async function listMovements(): Promise<MovementNotice[]> {
  const items = await db.movementNotices.toArray();
  return items.sort((a, b) => b.numeroCmb.localeCompare(a.numeroCmb, undefined, { numeric: true }));
}

export async function getMovement(id: string): Promise<MovementNotice | null> {
  return (await db.movementNotices.get(id)) ?? null;
}

export async function generateNextCmbNumber(): Promise<string> {
  const all = await db.movementNotices.toArray();
  let maxNum = 1053; // Inicia em 1054
  for (const item of all) {
    const num = parseInt(item.numeroCmb, 10);
    if (!Number.isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }
  return String(maxNum + 1);
}

export async function applyMovementToInventory(notice: MovementNotice): Promise<void> {
  const now = nowIso();

  await db.transaction('rw', db.assets, db.rooms, async () => {
    for (const item of notice.itens) {
      const pKey = plaquetaKey(item.plaqueta);
      const matchingAssets = await db.assets.where('plaquetaKey').equals(pKey).toArray();
      if (matchingAssets.length === 0) continue;

      if (notice.tipoMovimentacao === 'BAIXA') {
        for (const asset of matchingAssets) {
          if (!asset.baixado) {
            await writeOffAsset(asset.id, `CMB Nº ${notice.numeroCmb} - Baixa por ${notice.motivoBaixa ?? 'Outros'}`);
          }
        }
      } else if (notice.tipoMovimentacao === 'TRANSFERENCIA' && notice.tipoTransferencia === 'DEFINITIVA' && notice.salaDestino) {
        const destRoom = await findRoomByLabel(notice.salaDestino);
        for (const asset of matchingAssets) {
          await db.assets.update(asset.id, {
            localOriginal: destRoom?.label ?? notice.salaDestino,
            localCodigo: destRoom?.codigo ?? null,
            localNome: destRoom?.nome ?? notice.salaDestino,
            roomId: destRoom?.id ?? null,
            updatedAt: now,
          });
        }
      }
    }
  });
}

export async function createMovement(input: MovementNoticeInput): Promise<MovementNotice> {
  const numeroCmb = cleanText(input.numeroCmb) || (await generateNextCmbNumber());
  const now = nowIso();
  const dataEmissao = cleanText(input.dataEmissao) || new Date().toLocaleDateString('pt-BR');
  const aplicado = input.aplicadoNoInventario ?? true;

  const notice: MovementNotice = {
    id: createId(),
    numeroCmb,
    dataEmissao,
    localOrigem: cleanText(input.localOrigem) || 'Sede Principal',
    predioOrigem: cleanText(input.predioOrigem) || null,
    salaOrigem: cleanText(input.salaOrigem) || 'Setor Padrão',
    tipoMovimentacao: input.tipoMovimentacao,

    localDestino: cleanText(input.localDestino) || null,
    predioDestino: cleanText(input.predioDestino) || null,
    salaDestino: cleanText(input.salaDestino) || null,
    tipoTransferencia: input.tipoTransferencia || null,
    dataRetornoTemporaria: cleanText(input.dataRetornoTemporaria) || null,

    fornecedor: cleanText(input.fornecedor) || null,
    contatoFornecedor: cleanText(input.contatoFornecedor) || null,
    cnpjCpfFornecedor: cleanText(input.cnpjCpfFornecedor) || null,
    dataRetornoConserto: cleanText(input.dataRetornoConserto) || null,
    justificativaConserto: cleanText(input.justificativaConserto) || null,

    motivoBaixa: input.motivoBaixa || null,
    justificativaDestinoBaixa: cleanText(input.justificativaDestinoBaixa) || null,

    itens: input.itens ?? [],

    cedenteNome: cleanText(input.cedenteNome) || null,
    receptorNome: cleanText(input.receptorNome) || null,

    naturezaOperacao: cleanText(input.naturezaOperacao) || null,
    valorTotal: input.valorTotal !== undefined && input.valorTotal !== null ? Number(input.valorTotal) : null,
    baseCalculo: input.baseCalculo !== undefined && input.baseCalculo !== null ? Number(input.baseCalculo) : null,
    dispositivoFiscal: cleanText(input.dispositivoFiscal) || null,
    cfop: cleanText(input.cfop) || null,
    aliquotaIcms: input.aliquotaIcms !== undefined && input.aliquotaIcms !== null ? Number(input.aliquotaIcms) : null,
    valorIcms: input.valorIcms !== undefined && input.valorIcms !== null ? Number(input.valorIcms) : null,

    aplicadoNoInventario: aplicado,
    createdAt: now,
    updatedAt: now,
  };

  await db.movementNotices.add(notice);

  if (aplicado) {
    await applyMovementToInventory(notice);
  }

  return notice;
}

export async function updateMovement(id: string, input: MovementNoticeInput): Promise<MovementNotice> {
  return db.transaction('rw', db.movementNotices, async () => {
    const existing = await db.movementNotices.get(id);
    if (!existing) throw new Error('Comunicado (CMB) não encontrado.');
    const now = nowIso();

    const updated: MovementNotice = {
      ...existing,
      ...input,
      numeroCmb: cleanText(input.numeroCmb) || existing.numeroCmb,
      dataEmissao: cleanText(input.dataEmissao) || existing.dataEmissao,
      localOrigem: cleanText(input.localOrigem) || existing.localOrigem,
      salaOrigem: cleanText(input.salaOrigem) || existing.salaOrigem,
      itens: input.itens ?? existing.itens,
      updatedAt: now,
    };

    await db.movementNotices.put(updated);
    if (updated.aplicadoNoInventario) {
      await applyMovementToInventory(updated);
    }
    return updated;
  });
}
