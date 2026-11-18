import type { Asset, AssetSessionState, InventoryEvent, Maintenance, Room } from '../domain/types';
import { formatDateTime } from '../domain/format';

export interface RoomReportData {
  room: Room;
  assets: Asset[];
  states: Map<string, AssetSessionState>;
  events: InventoryEvent[];
  sessionId: string | null;
}

export function generateRoomPdfReport(data: RoomReportData) {
  const { room, assets, states, sessionId } = data;
  
  const roomAssets = assets.filter((a) => {
    const inRoom = room.id ? a.roomId === room.id : a.localOriginal === room.label;
    if (!inRoom) return false;
    if (room.codigo && a.plaqueta.trim() === room.codigo.trim()) return false;
    return true;
  }).sort((a, b) => a.plaqueta.localeCompare(b.plaqueta, 'pt-BR'));

  const activeAssets = roomAssets.filter((a) => !a.baixado);
  const baixadosCount = roomAssets.filter((a) => a.baixado).length;
  const total = activeAssets.length;
  const conferidos = activeAssets.filter((a) => sessionId && states.get(a.id)?.conferido).length;
  const pendentes = total - conferidos;
  const percentual = total === 0 ? 0 : Math.round((conferidos / total) * 100);

  const now = formatDateTime(new Date().toISOString());

  let html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Laudo de Inventário - ${room.label}</title>
      <style>
        @page { size: A4; margin: 10mm 12mm; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #14211b; margin: 0; padding: 24px; font-size: 11px; line-height: 1.15; }
        header { border-bottom: 2px solid #0f5132; padding-bottom: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
        h1 { font-size: 18px; color: #0f5132; margin: 0 0 2px 0; }
        .meta { font-size: 12px; color: #4d6057; }
        .box { background: #f7faf8; border: 1px solid #e0e8e3; border-radius: 8px; padding: 8px 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 16px; }
        tr { page-break-inside: avoid; }
        th, td { border: 1px solid #cdd9d2; padding: 2px 5px; text-align: left; font-size: 10px; }
        th { background: #eef3ef; color: #0f5132; text-transform: uppercase; letter-spacing: 0.05em; }
        td.desc { width: 45%; max-width: 320px; word-break: break-word; }
        tr.pendente { background: #fdeaea; }
        tr.divergente { background: #fdf3dc; }
        tr.conferido { background: #eef7f1; }
        tr.baixado { background: #edf2f7; color: #718096; }
        .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-weight: bold; font-size: 9px; }
        .badge-pendente { background: #fdeaea; color: #9b1c1c; }
        .badge-conferido { background: #dcefe3; color: #0f5132; }
        .badge-divergente { background: #fdf3dc; color: #92610a; }
        .badge-baixado { background: #e2e8f0; color: #4a5568; }
        .signatures { margin-top: 30px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        .sig-box { width: 45%; border-top: 1px solid #33443b; text-align: center; padding-top: 6px; font-size: 12px; }
        @media print {
          body { padding: 0; }
          button { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div style="text-align: right; margin-bottom: 12px;">
        <button onclick="window.print()" style="background: #0f5132; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">Imprimir / Salvar PDF</button>
      </div>
      <header>
        <div>
          <h1>Relatório de Conferência Patrimonial</h1>
          <div class="meta">Sistema de Inventário Patrimonial · Gerado em ${now}</div>
        </div>
        <div style="text-align: right;">
          <strong>Setor / Sala:</strong> ${room.label}<br>
          <strong>Código:</strong> ${room.codigo ?? '—'} · <strong>Filial:</strong> ${room.filial ?? 'Filial 1'}
        </div>
      </header>

      <div class="box">
        <div>
          <p><strong>Responsável pelo Setor:</strong> ${room.responsavel || 'Não informado'}</p>
          <p><strong>Bens Ativos:</strong> ${total} · Conferidos: ${conferidos} · Pendentes: ${pendentes} ${baixadosCount > 0 ? `· Baixados: ${baixadosCount}` : ''}</p>
        </div>
        <div style="text-align: right; font-size: 15px;">
          <strong>Taxa de Cobertura:</strong> <span style="color: #0f5132; font-size: 18px; font-weight: bold;">${percentual}%</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 14%;">Plaqueta</th>
            <th class="desc">Descrição do Bem</th>
            <th style="width: 15%;">Situação</th>
            <th style="width: 25%;">Observações / Baixa</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (const asset of roomAssets) {
    const state = sessionId ? states.get(asset.id) : undefined;
    const conferido = state?.conferido ?? false;
    const divergente = state?.divergente ?? false;
    let statusClass = 'pendente';
    let badgeText = 'PENDENTE';
    let badgeClass = 'badge-pendente';
    let obsText = asset.observacao ?? '';

    if (asset.baixado) {
      statusClass = 'baixado';
      badgeText = 'BAIXADO';
      badgeClass = 'badge-baixado';
      obsText = asset.motivoBaixa ? `Baixado: ${asset.motivoBaixa}` : 'Baixado';
    } else if (conferido) {
      if (divergente) {
        statusClass = 'divergente';
        badgeText = 'DIVERGENTE';
        badgeClass = 'badge-divergente';
      } else {
        statusClass = 'conferido';
        badgeText = 'CONFERIDO';
        badgeClass = 'badge-conferido';
      }
    }

    html += `
      <tr class="${statusClass}">
        <td style="font-family: monospace; font-weight: bold;">${asset.plaqueta}</td>
        <td class="desc">${asset.descricao || 'Sem descrição'}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td>${obsText}</td>
      </tr>
    `;
  }

  html += `
        </tbody>
      </table>

      <div class="signatures">
        <div class="sig-box">
          Assinatura do Responsável do Setor<br>
          <strong>${room.responsavel || 'Responsável'}</strong>
        </div>
        <div class="sig-box">
          Assinatura do Auditor / Inventariante<br>
          <strong>Equipe de Patrimônio</strong>
        </div>
      </div>
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export interface ResponsibleReportData {
  responsavel: string;
  rooms: Room[];
  assets: Asset[];
  states: Map<string, AssetSessionState>;
  events: InventoryEvent[];
  sessionId: string | null;
}

export function generateResponsiblePdfReport(data: ResponsibleReportData) {
  const { responsavel, rooms, assets, states, sessionId } = data;
  const assignedRooms = rooms.filter((r) => r.responsavel?.trim().toLowerCase() === responsavel.trim().toLowerCase());
  const now = formatDateTime(new Date().toISOString());

  let html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório por Responsável - ${responsavel}</title>
      <style>
        @page { size: A4; margin: 10mm 12mm; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #14211b; margin: 0; padding: 24px; font-size: 11px; line-height: 1.15; }
        header { border-bottom: 2px solid #0f5132; padding-bottom: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
        h1 { font-size: 18px; color: #0f5132; margin: 0 0 2px 0; }
        h2 { font-size: 13px; color: #166941; margin: 16px 0 6px 0; border-bottom: 1px solid #e0e8e3; padding-bottom: 3px; }
        .meta { font-size: 12px; color: #4d6057; }
        table { width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 12px; }
        tr { page-break-inside: avoid; }
        th, td { border: 1px solid #cdd9d2; padding: 2px 5px; text-align: left; font-size: 10px; }
        th { background: #eef3ef; color: #0f5132; text-transform: uppercase; letter-spacing: 0.05em; }
        td.desc { width: 45%; max-width: 320px; word-break: break-word; }
        .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-weight: bold; font-size: 9px; }
        .badge-pendente { background: #fdeaea; color: #9b1c1c; }
        .badge-conferido { background: #dcefe3; color: #0f5132; }
        .badge-divergente { background: #fdf3dc; color: #92610a; }
        .badge-baixado { background: #e2e8f0; color: #4a5568; }
        .signatures { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        .sig-box { width: 45%; border-top: 1px solid #33443b; text-align: center; padding-top: 8px; font-size: 12px; }
        @media print {
          body { padding: 0; }
          button { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div style="text-align: right; margin-bottom: 12px;">
        <button onclick="window.print()" style="background: #0f5132; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">Imprimir / Salvar PDF</button>
      </div>
      <header>
        <div>
          <h1>Relatório Consolidado por Responsável</h1>
          <div class="meta">Sistema de Inventário Patrimonial · Gerado em ${now}</div>
        </div>
        <div style="text-align: right;">
          <strong>Responsável:</strong> ${responsavel}<br>
          <strong>Setores Vinculados:</strong> ${assignedRooms.length}
        </div>
      </header>
  `;

  for (const room of assignedRooms) {
    const roomAssets = assets.filter((a) => {
      const inRoom = room.id ? a.roomId === room.id : a.localOriginal === room.label;
      if (!inRoom) return false;
      if (room.codigo && a.plaqueta.trim() === room.codigo.trim()) return false;
      return true;
    }).sort((a, b) => a.plaqueta.localeCompare(b.plaqueta, 'pt-BR'));

    const activeRoomAssets = roomAssets.filter((a) => !a.baixado);
    const total = activeRoomAssets.length;
    const conferidos = activeRoomAssets.filter((a) => sessionId && states.get(a.id)?.conferido).length;
    const pendentes = total - conferidos;
    const percentual = total === 0 ? 0 : Math.round((conferidos / total) * 100);

    html += `
      <h2>Setor: ${room.label} (Ativos: ${total} · Conferidos: ${conferidos} · Pendentes: ${pendentes} · Cobertura: ${percentual}%)</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 14%;">Plaqueta</th>
            <th class="desc">Descrição</th>
            <th style="width: 15%;">Situação</th>
            <th style="width: 25%;">Observação</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const asset of roomAssets) {
      const state = sessionId ? states.get(asset.id) : undefined;
      const conferido = state?.conferido ?? false;
      const divergente = state?.divergente ?? false;
      let badgeText = 'PENDENTE';
      let badgeClass = 'badge-pendente';
      let obsText = asset.observacao ?? '';

      if (asset.baixado) {
        badgeText = 'BAIXADO';
        badgeClass = 'badge-baixado';
        obsText = asset.motivoBaixa ? `Baixado: ${asset.motivoBaixa}` : 'Baixado';
      } else if (conferido) {
        if (divergente) {
          badgeText = 'DIVERGENTE';
          badgeClass = 'badge-divergente';
        } else {
          badgeText = 'CONFERIDO';
          badgeClass = 'badge-conferido';
        }
      }

      html += `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${asset.plaqueta}</td>
          <td class="desc">${asset.descricao || 'Sem descrição'}</td>
          <td><span class="badge ${badgeClass}">${badgeText}</span></td>
          <td>${obsText}</td>
        </tr>
      `;
    }

    html += `
        </tbody>
      </table>
    `;
  }

  html += `
      <div class="signatures">
        <div class="sig-box">
          Assinatura do Responsável<br>
          <strong>${responsavel}</strong>
        </div>
        <div class="sig-box">
          Assinatura do Auditor / Inventariante<br>
          <strong>Equipe de Patrimônio</strong>
        </div>
      </div>
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export interface FilialReportData {
  filial: string;
  rooms: Room[];
  assets: Asset[];
  states: Map<string, AssetSessionState>;
  events: InventoryEvent[];
  sessionId: string | null;
}

export function generateFilialPdfReport(data: FilialReportData) {
  const { filial, rooms, assets, states, sessionId } = data;
  const targetRooms = filial === 'Todas'
    ? rooms
    : rooms.filter((r) => (r.filial ?? 'Filial 1') === filial);

  const now = formatDateTime(new Date().toISOString());

  let html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório por Filial - ${filial}</title>
      <style>
        @page { size: A4; margin: 10mm 12mm; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #14211b; margin: 0; padding: 24px; font-size: 11px; line-height: 1.15; }
        header { border-bottom: 2px solid #0f5132; padding-bottom: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
        h1 { font-size: 18px; color: #0f5132; margin: 0 0 2px 0; }
        h2 { font-size: 13px; color: #166941; margin: 16px 0 6px 0; border-bottom: 1px solid #e0e8e3; padding-bottom: 3px; }
        .meta { font-size: 12px; color: #4d6057; }
        table { width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 12px; }
        tr { page-break-inside: avoid; }
        th, td { border: 1px solid #cdd9d2; padding: 2px 5px; text-align: left; font-size: 10px; }
        th { background: #eef3ef; color: #0f5132; text-transform: uppercase; letter-spacing: 0.05em; }
        td.desc { width: 45%; max-width: 320px; word-break: break-word; }
        .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-weight: bold; font-size: 9px; }
        .badge-pendente { background: #fdeaea; color: #9b1c1c; }
        .badge-conferido { background: #dcefe3; color: #0f5132; }
        .badge-divergente { background: #fdf3dc; color: #92610a; }
        .badge-baixado { background: #e2e8f0; color: #4a5568; }
        .signatures { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        .sig-box { width: 45%; border-top: 1px solid #33443b; text-align: center; padding-top: 8px; font-size: 12px; }
        @media print {
          body { padding: 0; }
          button { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div style="text-align: right; margin-bottom: 12px;">
        <button onclick="window.print()" style="background: #0f5132; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">Imprimir / Salvar PDF</button>
      </div>
      <header>
        <div>
          <h1>Relatório Consolidado por Filial</h1>
          <div class="meta">Sistema de Inventário Patrimonial · Gerado em ${now}</div>
        </div>
        <div style="text-align: right;">
          <strong>Filial:</strong> ${filial}<br>
          <strong>Total de Setores:</strong> ${targetRooms.length}
        </div>
      </header>
  `;

  for (const room of targetRooms) {
    const roomAssets = assets.filter((a) => {
      const inRoom = room.id ? a.roomId === room.id : a.localOriginal === room.label;
      if (!inRoom) return false;
      if (room.codigo && a.plaqueta.trim() === room.codigo.trim()) return false;
      return true;
    }).sort((a, b) => a.plaqueta.localeCompare(b.plaqueta, 'pt-BR'));

    const activeRoomAssets = roomAssets.filter((a) => !a.baixado);
    const total = activeRoomAssets.length;
    const conferidos = activeRoomAssets.filter((a) => sessionId && states.get(a.id)?.conferido).length;
    const pendentes = total - conferidos;
    const percentual = total === 0 ? 0 : Math.round((conferidos / total) * 100);

    html += `
      <h2>Setor: ${room.label} ${room.responsavel ? `(Resp: ${room.responsavel})` : ''} — [Ativos: ${total} | Conf: ${conferidos} | Pend: ${pendentes} | Cobertura: ${percentual}%]</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 14%;">Plaqueta</th>
            <th class="desc">Descrição do Bem</th>
            <th style="width: 15%;">Situação</th>
            <th style="width: 25%;">Observação / Baixa</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const asset of roomAssets) {
      const state = sessionId ? states.get(asset.id) : undefined;
      const conferido = state?.conferido ?? false;
      const divergente = state?.divergente ?? false;
      let badgeText = 'PENDENTE';
      let badgeClass = 'badge-pendente';
      let obsText = asset.observacao ?? '';

      if (asset.baixado) {
        badgeText = 'BAIXADO';
        badgeClass = 'badge-baixado';
        obsText = asset.motivoBaixa ? `Baixa: ${asset.motivoBaixa}` : 'Baixado';
      } else if (conferido) {
        if (divergente) {
          badgeText = 'DIVERGENTE';
          badgeClass = 'badge-divergente';
        } else {
          badgeText = 'CONFERIDO';
          badgeClass = 'badge-conferido';
        }
      }

      html += `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${asset.plaqueta}</td>
          <td class="desc">${asset.descricao || 'Sem descrição'}</td>
          <td><span class="badge ${badgeClass}">${badgeText}</span></td>
          <td>${obsText}</td>
        </tr>
      `;
    }

    html += `
        </tbody>
      </table>
    `;
  }

  html += `
      <div class="signatures">
        <div class="sig-box">
          Assinatura do Gestor da Filial<br>
          <strong>Gestão / Diretoria</strong>
        </div>
        <div class="sig-box">
          Assinatura do Auditor / Inventariante<br>
          <strong>Equipe de Patrimônio</strong>
        </div>
      </div>
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export interface MaintenanceReportData {
  maintenance: Maintenance;
  asset?: Asset | null;
  room?: Room | null;
  pastCount: number;
  totalPastSpent: number;
}

export async function generateMaintenancePdfReport(data: MaintenanceReportData) {
  const { maintenance, asset, room, pastCount, totalPastSpent } = data;
  const now = formatDateTime(new Date().toISOString());

  let logoBase64 = '';
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const res = await fetch(`${origin}/logo-dores.png`);
    if (res.ok) {
      const blob = await res.blob();
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // Fallback silencioso
  }

  const valorBemNovo = maintenance.valorBemNovo ?? 0;
  const gastoAcumuladoTotal = totalPastSpent + maintenance.valorOrcado;
  const inviabilidadePercentual = valorBemNovo > 0 ? Math.round((gastoAcumuladoTotal / valorBemNovo) * 100) : 0;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Solicitação de Conserto ou Troca - ${maintenance.numeroDocumento}</title>
      <style>
        @page { size: A4; margin: 8mm 10mm; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #14211b; margin: 0; padding: 0; font-size: 14px; }
        .print-page {
          height: 274mm;
          max-height: 274mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          overflow: hidden;
          padding: 8px 12px;
        }
        header { border-bottom: 2px solid #0f5132; padding-bottom: 6px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
        .logo-title { display: flex; align-items: center; gap: 14px; }
        .logo-title img { height: 64px; width: auto; object-fit: contain; }
        h1 { font-size: 20px; color: #0f5132; margin: 0; }
        .subtitle { font-size: 15px; font-weight: bold; color: #33443b; text-align: center; margin-bottom: 12px; }
        .meta { font-size: 12px; color: #4d6057; text-align: right; margin-bottom: 8px; }
        .section-title { font-size: 13.5px; font-weight: bold; color: #0f5132; background: #eef3ef; padding: 5px 10px; border-left: 4px solid #0f5132; margin: 10px 0 6px 0; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        th, td { border: 1px solid #cdd9d2; padding: 9px 12px; text-align: left; font-size: 14px; }
        th { background: #f7faf8; color: #33443b; width: 28%; font-weight: 600; }
        .inline-grid { display: flex; justify-content: space-between; gap: 16px; }
        .inline-grid > div { width: 50%; }
        .decision-box { border: 2px dashed #0f5132; padding: 12px 16px; border-radius: 8px; margin-top: 12px; background: #fcfdfc; page-break-inside: avoid; }
        .decision-box h3 { margin: 0 0 6px 0; font-size: 14px; color: #0f5132; }
        .checkbox-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 8px; font-weight: bold; font-size: 13px; }
        .signatures { margin-top: auto; padding-top: 60px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        .sig-box { width: 45%; border-top: 1px solid #33443b; text-align: center; padding-top: 8px; font-size: 12.5px; }
        @media print {
          body { padding: 0; }
          button { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div style="text-align: right; margin-bottom: 8px;">
        <button onclick="window.print()" style="background: #0f5132; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer;">Imprimir / Salvar PDF</button>
      </div>

      <div class="print-page">
        <div>
          <div class="logo-title">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Clube Dores">` : ''}
            <div>
              <h1>CLUBE RECREATIVO DORES</h1>
              <div style="font-size: 12px; color: #4d6057;">Setor de Patrimônio e Manutenção</div>
            </div>
          </div>
          <div class="subtitle">SOLICITAÇÃO DE CONSERTO OU TROCA DE EQUIPAMENTO</div>
          <div class="meta">Documento Interno Nº: <strong>${maintenance.numeroDocumento}</strong> · Data: ${now}</div>

          <p style="margin-top: 6px; margin-bottom: 10px; font-size: 14px;">
            A/C <strong>Comissão Administrativa do Clube Recreativo Dores</strong>.<br>
            Pelo presente documento interno, venho solicitar a aprovação do orçamento em anexo para conserto do equipamento abaixo discriminado:
          </p>

          <div class="section-title">Identificação do Bem</div>
          <table>
            <tr>
              <th>Equipamento / Descrição</th>
              <td><strong>${asset?.descricao ?? 'Equipamento / Plaqueta ' + maintenance.plaqueta}</strong></td>
            </tr>
            <tr>
              <th>Número do Patrimônio (Plaqueta)</th>
              <td style="font-family: monospace; font-weight: bold; font-size: 14.5px;">${maintenance.plaqueta}</td>
            </tr>
            <tr>
              <th>Setor / Localização</th>
              <td>${room?.label ?? asset?.localOriginal ?? 'Não informado'}</td>
            </tr>
            <tr>
              <th>Responsável pelo Setor</th>
              <td>${room?.responsavel ?? 'Não informado'}</td>
            </tr>
            <tr>
              <th>Manutenção Proposta / Serviço</th>
              <td>${maintenance.manutencaoProposta}</td>
            </tr>
            <tr>
              <th>Valor do Conserto (Orçado)</th>
              <td><strong style="color: #0f5132; font-size: 14.5px; white-space: nowrap;">R$ ${maintenance.valorOrcado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> (Peças: <span style="white-space: nowrap;">R$ ${maintenance.valorPecas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> | Serviços: <span style="white-space: nowrap;">R$ ${maintenance.valorServicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>)</td>
            </tr>
          </table>

          <div class="section-title">Informações Adicionais e Viabilidade</div>
          <table>
            <tr>
              <th>Data de Aquisição do Bem</th>
              <td>${asset?.dataAquisicao || 'Não informada'}</td>
            </tr>
            <tr>
              <th>Quantidade de Consertos Anteriores</th>
              <td>${pastCount} manutenção(ões) registrada(s)</td>
            </tr>
            <tr>
              <th>Valor Já Gasto em Consertos Anteriores</th>
              <td><span style="white-space: nowrap;">R$ ${totalPastSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></td>
            </tr>
            <tr>
              <th>Gasto Acumulado (Anteriores + Atual)</th>
              <td><strong><span style="white-space: nowrap;">R$ ${gastoAcumuladoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></strong></td>
            </tr>
            <tr>
              <th>Valor de Compra de Bem Novo Equivalente</th>
              <td>${valorBemNovo > 0 ? `<span style="white-space: nowrap;">R$ ${valorBemNovo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> (Já gastos <strong style="color: #0f5132;">${inviabilidadePercentual}%</strong> do valor de um bem novo)` : 'Não informado'}</td>
            </tr>
            <tr>
              <th>Fornecedor Indicado</th>
              <td>${maintenance.fornecedor} ${maintenance.codigoFornecedor ? `(Cód. ${maintenance.codigoFornecedor})` : ''}</td>
            </tr>
            <tr>
              <th>Ordens de Compra (OC)</th>
              <td>
                <div class="inline-grid">
                  <div>Serviços: <strong>${maintenance.ocServicos || '—'}</strong></div>
                  <div>Produtos: <strong>${maintenance.ocProdutos || '—'}</strong></div>
                </div>
              </td>
            </tr>
            <tr>
              <th>Notas Fiscais (NF)</th>
              <td>
                <div class="inline-grid">
                  <div>Peças: <strong>${maintenance.nfPecas || '—'}</strong></div>
                  <div>Serviços: <strong>${maintenance.nfServicos || '—'}</strong></div>
                </div>
              </td>
            </tr>
          </table>

          ${maintenance.observacoes ? `<p style="margin: 6px 0; font-size: 13.5px;"><strong>Observações:</strong> ${maintenance.observacoes}</p>` : ''}

          <div class="decision-box">
            <h3>Decisão da Comissão Administrativa</h3>
            <p style="margin: 0 0 6px 0; font-size: 13px;">Favor assinalar a opção aprovada:</p>
            <div class="checkbox-row">
              <div>( &nbsp; &nbsp; ) Conserto Conforme Orçamento</div>
              <div>( &nbsp; &nbsp; ) Compra de Equipamento Novo</div>
              <div>( &nbsp; &nbsp; ) Reprovado</div>
            </div>
          </div>
        </div>

        <div class="signatures">
          <div class="sig-box">
            Responsável pelo Setor de Patrimônio<br>
            <strong>Setor de Patrimônio e Manutenção</strong>
          </div>
          <div class="sig-box">
            Assinatura da Comissão / Gestor / Diretoria<br>
            <strong>Comissão Administrativa</strong>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
