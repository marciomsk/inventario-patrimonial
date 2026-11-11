import type { Asset, AssetSessionState, InventoryEvent, Room } from '../domain/types';
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
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #14211b; margin: 0; padding: 24px; font-size: 14px; line-height: 1.4; }
        header { border-bottom: 2px solid #0f5132; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
        h1 { font-size: 20px; color: #0f5132; margin: 0 0 4px 0; }
        .meta { font-size: 13px; color: #4d6057; }
        .box { background: #f7faf8; border: 1px solid #e0e8e3; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
        th, td { border: 1px solid #cdd9d2; padding: 8px 10px; text-align: left; }
        th { background: #eef3ef; color: #0f5132; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; }
        tr.pendente { background: #fdeaea; }
        tr.divergente { background: #fdf3dc; }
        tr.conferido { background: #eef7f1; }
        tr.baixado { background: #edf2f7; color: #718096; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
        .badge-pendente { background: #fdeaea; color: #9b1c1c; }
        .badge-conferido { background: #dcefe3; color: #0f5132; }
        .badge-divergente { background: #fdf3dc; color: #92610a; }
        .badge-baixado { background: #e2e8f0; color: #4a5568; }
        .signatures { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        .sig-box { width: 45%; border-top: 1px solid #33443b; text-align: center; padding-top: 8px; font-size: 13px; }
        @media print {
          body { padding: 0; }
          button { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div style="text-align: right; margin-bottom: 12px;">
        <button onclick="window.print()" style="background: #0f5132; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer;">Imprimir / Salvar PDF</button>
      </div>
      <header>
        <div>
          <h1>Relatório de Conferência Patrimonial</h1>
          <div class="meta">Sistema de Inventário Patrimonial · Gerado em ${now}</div>
        </div>
        <div style="text-align: right;">
          <strong>Setor / Sala:</strong> ${room.label}<br>
          <strong>Código:</strong> ${room.codigo ?? '—'}
        </div>
      </header>

      <div class="box">
        <div>
          <p><strong>Responsável pelo Setor:</strong> ${room.responsavel || 'Não informado'}</p>
          <p><strong>Bens Ativos:</strong> ${total} · Conferidos: ${conferidos} · Pendentes: ${pendentes} ${baixadosCount > 0 ? `· Baixados: ${baixadosCount}` : ''}</p>
        </div>
        <div style="text-align: right; font-size: 16px;">
          <strong>Taxa de Cobertura:</strong> <span style="color: #0f5132; font-size: 20px;">${percentual}%</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Plaqueta</th>
            <th>Descrição do Bem</th>
            <th>Situação / Status</th>
            <th>Observações / Baixa</th>
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
        <td>${asset.descricao || 'Sem descrição'}</td>
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
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #14211b; margin: 0; padding: 24px; font-size: 14px; line-height: 1.4; }
        header { border-bottom: 2px solid #0f5132; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
        h1 { font-size: 20px; color: #0f5132; margin: 0 0 4px 0; }
        h2 { font-size: 15px; color: #166941; margin: 20px 0 8px 0; border-bottom: 1px solid #e0e8e3; padding-bottom: 4px; }
        .meta { font-size: 13px; color: #4d6057; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 16px; }
        th, td { border: 1px solid #cdd9d2; padding: 6px 8px; text-align: left; font-size: 13px; }
        th { background: #eef3ef; color: #0f5132; text-transform: uppercase; letter-spacing: 0.05em; }
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px; }
        .badge-pendente { background: #fdeaea; color: #9b1c1c; }
        .badge-conferido { background: #dcefe3; color: #0f5132; }
        .badge-divergente { background: #fdf3dc; color: #92610a; }
        .badge-baixado { background: #e2e8f0; color: #4a5568; }
        .signatures { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        .sig-box { width: 45%; border-top: 1px solid #33443b; text-align: center; padding-top: 8px; font-size: 13px; }
        @media print {
          body { padding: 0; }
          button { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div style="text-align: right; margin-bottom: 12px;">
        <button onclick="window.print()" style="background: #0f5132; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer;">Imprimir / Salvar PDF</button>
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
            <th>Plaqueta</th>
            <th>Descrição</th>
            <th>Situação</th>
            <th>Observação</th>
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
          <td>${asset.descricao || 'Sem descrição'}</td>
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
