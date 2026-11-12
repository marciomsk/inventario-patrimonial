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
