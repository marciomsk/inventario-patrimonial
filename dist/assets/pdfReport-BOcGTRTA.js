import{t as e}from"./index-Bl00AqKe.js";function t(t){let{room:n,assets:r,states:i,sessionId:a}=t,o=r.filter(e=>!(!(n.id?e.roomId===n.id:e.localOriginal===n.label)||n.codigo&&e.plaqueta.trim()===n.codigo.trim())).sort((e,t)=>e.plaqueta.localeCompare(t.plaqueta,`pt-BR`)),s=o.filter(e=>!e.baixado),c=o.filter(e=>e.baixado).length,l=s.length,u=s.filter(e=>a&&i.get(e.id)?.conferido).length,d=l-u,f=l===0?0:Math.round(u/l*100),p=e(new Date().toISOString()),m=`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Laudo de Inventário - ${n.label}</title>
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
          <div class="meta">Sistema de Inventário Patrimonial · Gerado em ${p}</div>
        </div>
        <div style="text-align: right;">
          <strong>Setor / Sala:</strong> ${n.label}<br>
          <strong>Código:</strong> ${n.codigo??`—`} · <strong>Filial:</strong> ${n.filial??`Filial 1`}
        </div>
      </header>

      <div class="box">
        <div>
          <p><strong>Responsável pelo Setor:</strong> ${n.responsavel||`Não informado`}</p>
          <p><strong>Bens Ativos:</strong> ${l} · Conferidos: ${u} · Pendentes: ${d} ${c>0?`· Baixados: ${c}`:``}</p>
        </div>
        <div style="text-align: right; font-size: 15px;">
          <strong>Taxa de Cobertura:</strong> <span style="color: #0f5132; font-size: 18px; font-weight: bold;">${f}%</span>
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
  `;for(let e of o){let t=a?i.get(e.id):void 0,n=t?.conferido??!1,r=t?.divergente??!1,o=`pendente`,s=`PENDENTE`,c=`badge-pendente`,l=e.observacao??``;e.baixado?(o=`baixado`,s=`BAIXADO`,c=`badge-baixado`,l=e.motivoBaixa?`Baixado: ${e.motivoBaixa}`:`Baixado`):n&&(r?(o=`divergente`,s=`DIVERGENTE`,c=`badge-divergente`):(o=`conferido`,s=`CONFERIDO`,c=`badge-conferido`)),m+=`
      <tr class="${o}">
        <td style="font-family: monospace; font-weight: bold;">${e.plaqueta}</td>
        <td class="desc">${e.descricao||`Sem descrição`}</td>
        <td><span class="badge ${c}">${s}</span></td>
        <td>${l}</td>
      </tr>
    `}m+=`
        </tbody>
      </table>

      <div class="signatures">
        <div class="sig-box">
          Assinatura do Responsável do Setor<br>
          <strong>${n.responsavel||`Responsável`}</strong>
        </div>
        <div class="sig-box">
          Assinatura do Auditor / Inventariante<br>
          <strong>Equipe de Patrimônio</strong>
        </div>
      </div>
    </body>
    </html>
  `;let h=window.open(``,`_blank`);h&&(h.document.write(m),h.document.close())}function n(t){let{responsavel:n,rooms:r,assets:i,states:a,sessionId:o}=t,s=r.filter(e=>e.responsavel?.trim().toLowerCase()===n.trim().toLowerCase()),c=`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório por Responsável - ${n}</title>
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
          <div class="meta">Sistema de Inventário Patrimonial · Gerado em ${e(new Date().toISOString())}</div>
        </div>
        <div style="text-align: right;">
          <strong>Responsável:</strong> ${n}<br>
          <strong>Setores Vinculados:</strong> ${s.length}
        </div>
      </header>
  `;for(let e of s){let t=i.filter(t=>!(!(e.id?t.roomId===e.id:t.localOriginal===e.label)||e.codigo&&t.plaqueta.trim()===e.codigo.trim())).sort((e,t)=>e.plaqueta.localeCompare(t.plaqueta,`pt-BR`)),n=t.filter(e=>!e.baixado),r=n.length,s=n.filter(e=>o&&a.get(e.id)?.conferido).length,l=r-s,u=r===0?0:Math.round(s/r*100);c+=`
      <h2>Setor: ${e.label} (Ativos: ${r} · Conferidos: ${s} · Pendentes: ${l} · Cobertura: ${u}%)</h2>
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
    `;for(let e of t){let t=o?a.get(e.id):void 0,n=t?.conferido??!1,r=t?.divergente??!1,i=`PENDENTE`,s=`badge-pendente`,l=e.observacao??``;e.baixado?(i=`BAIXADO`,s=`badge-baixado`,l=e.motivoBaixa?`Baixado: ${e.motivoBaixa}`:`Baixado`):n&&(r?(i=`DIVERGENTE`,s=`badge-divergente`):(i=`CONFERIDO`,s=`badge-conferido`)),c+=`
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${e.plaqueta}</td>
          <td class="desc">${e.descricao||`Sem descrição`}</td>
          <td><span class="badge ${s}">${i}</span></td>
          <td>${l}</td>
        </tr>
      `}c+=`
        </tbody>
      </table>
    `}c+=`
      <div class="signatures">
        <div class="sig-box">
          Assinatura do Responsável<br>
          <strong>${n}</strong>
        </div>
        <div class="sig-box">
          Assinatura do Auditor / Inventariante<br>
          <strong>Equipe de Patrimônio</strong>
        </div>
      </div>
    </body>
    </html>
  `;let l=window.open(``,`_blank`);l&&(l.document.write(c),l.document.close())}function r(t){let{filial:n,rooms:r,assets:i,states:a,sessionId:o}=t,s=n===`Todas`?r:r.filter(e=>(e.filial??`Filial 1`)===n),c=`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório por Filial - ${n}</title>
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
          <div class="meta">Sistema de Inventário Patrimonial · Gerado em ${e(new Date().toISOString())}</div>
        </div>
        <div style="text-align: right;">
          <strong>Filial:</strong> ${n}<br>
          <strong>Total de Setores:</strong> ${s.length}
        </div>
      </header>
  `;for(let e of s){let t=i.filter(t=>!(!(e.id?t.roomId===e.id:t.localOriginal===e.label)||e.codigo&&t.plaqueta.trim()===e.codigo.trim())).sort((e,t)=>e.plaqueta.localeCompare(t.plaqueta,`pt-BR`)),n=t.filter(e=>!e.baixado),r=n.length,s=n.filter(e=>o&&a.get(e.id)?.conferido).length,l=r-s,u=r===0?0:Math.round(s/r*100);c+=`
      <h2>Setor: ${e.label} ${e.responsavel?`(Resp: ${e.responsavel})`:``} — [Ativos: ${r} | Conf: ${s} | Pend: ${l} | Cobertura: ${u}%]</h2>
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
    `;for(let e of t){let t=o?a.get(e.id):void 0,n=t?.conferido??!1,r=t?.divergente??!1,i=`PENDENTE`,s=`badge-pendente`,l=e.observacao??``;e.baixado?(i=`BAIXADO`,s=`badge-baixado`,l=e.motivoBaixa?`Baixado: ${e.motivoBaixa}`:`Baixado`):n&&(r?(i=`DIVERGENTE`,s=`badge-divergente`):(i=`CONFERIDO`,s=`badge-conferido`)),c+=`
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${e.plaqueta}</td>
          <td class="desc">${e.descricao||`Sem descrição`}</td>
          <td><span class="badge ${s}">${i}</span></td>
          <td>${l}</td>
        </tr>
      `}c+=`
        </tbody>
      </table>
    `}c+=`
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
  `;let l=window.open(``,`_blank`);l&&(l.document.write(c),l.document.close())}async function i(t){let{maintenance:n,asset:r,room:i,pastCount:a,totalPastSpent:o}=t,s=e(new Date().toISOString()),c=``;try{let e=typeof window<`u`?window.location.origin:``,t=await fetch(`${e}/logo-dores.png`);if(t.ok){let e=await t.blob();c=await new Promise(t=>{let n=new FileReader;n.onloadend=()=>t(n.result),n.readAsDataURL(e)})}}catch{}let l=n.valorBemNovo??0,u=o+n.valorOrcado,d=l>0?Math.round(u/l*100):0,f=`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Solicitação de Conserto ou Troca - ${n.numeroDocumento}</title>
      <style>
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
        .highlight-row { background-color: #dcfce7 !important; color: #064e3b !important; font-weight: 700 !important; }
        .highlight-row td { background-color: #dcfce7 !important; color: #064e3b !important; font-weight: 700 !important; border-color: #86efac !important; }
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
            ${c?`<img src="${c}" alt="Clube Dores">`:``}
            <div>
              <h1>CLUBE RECREATIVO DORES</h1>
              <div style="font-size: 12px; color: #4d6057;">Setor de Patrimônio e Manutenção</div>
            </div>
          </div>
          <div class="subtitle">SOLICITAÇÃO DE CONSERTO OU TROCA DE EQUIPAMENTO</div>
          <div class="meta">Documento Interno Nº: <strong>${n.numeroDocumento}</strong> · Data: ${s}</div>

          <p style="margin-top: 6px; margin-bottom: 10px; font-size: 14px;">
            A/C <strong>Comissão Administrativa do Clube Recreativo Dores</strong>.<br>
            Pelo presente documento interno, venho solicitar a aprovação do orçamento em anexo para conserto do equipamento abaixo discriminado:
          </p>

          <div class="section-title">Identificação do Bem</div>
          <table>
            <tr>
              <th>Equipamento / Descrição</th>
              <td><strong>${r?.descricao??`Equipamento / Plaqueta `+n.plaqueta}</strong></td>
            </tr>
            <tr>
              <th>Número do Patrimônio (Plaqueta)</th>
              <td style="font-family: monospace; font-weight: bold; font-size: 14.5px;">${n.plaqueta}</td>
            </tr>
            <tr>
              <th>Setor / Localização</th>
              <td>${i?.label??r?.localOriginal??`Não informado`}</td>
            </tr>
            <tr>
              <th>Responsável pelo Setor</th>
              <td>${i?.responsavel??`Não informado`}</td>
            </tr>
            <tr>
              <th>Manutenção Proposta / Serviço</th>
              <td>${n.manutencaoProposta}</td>
            </tr>
            <tr class="highlight-row">
              <th>Valor do Conserto (Orçado)</th>
              <td><strong style="font-size: 14.5px; white-space: nowrap;">R$ ${n.valorOrcado.toLocaleString(`pt-BR`,{minimumFractionDigits:2})}</strong> (Peças: <span style="white-space: nowrap;">R$ ${n.valorPecas.toLocaleString(`pt-BR`,{minimumFractionDigits:2})}</span> | Serviços: <span style="white-space: nowrap;">R$ ${n.valorServicos.toLocaleString(`pt-BR`,{minimumFractionDigits:2})}</span>)</td>
            </tr>
          </table>

          <div class="section-title">Informações Adicionais e Viabilidade</div>
          <table>
            <tr>
              <th>Data de Aquisição do Bem</th>
              <td>${r?.dataAquisicao||`Não informada`}</td>
            </tr>
            <tr>
              <th>Quantidade de Consertos Anteriores</th>
              <td>${a} manutenção(ões) registrada(s)</td>
            </tr>
            <tr>
              <th>Valor Já Gasto em Consertos Anteriores</th>
              <td><span style="white-space: nowrap;">R$ ${o.toLocaleString(`pt-BR`,{minimumFractionDigits:2})}</span></td>
            </tr>
            <tr class="highlight-row">
              <th>Gasto Acumulado (Anteriores + Atual)</th>
              <td><strong><span style="white-space: nowrap;">R$ ${u.toLocaleString(`pt-BR`,{minimumFractionDigits:2})}</span></strong></td>
            </tr>
            <tr>
              <th>Valor de Compra de Bem Novo Equivalente</th>
              <td>${l>0?`<span style="white-space: nowrap;">R$ ${l.toLocaleString(`pt-BR`,{minimumFractionDigits:2})}</span> (Já gastos <strong style="color: #064e3b;">${d}%</strong> do valor de um bem novo)`:`Não informado`}</td>
            </tr>
            <tr>
              <th>Fornecedor Indicado</th>
              <td>${n.fornecedor} ${n.codigoFornecedor?`(Cód. ${n.codigoFornecedor})`:``}</td>
            </tr>
            <tr>
              <th>Ordens de Compra (OC)</th>
              <td>
                <div class="inline-grid">
                  <div>Serviços: <strong>${n.ocServicos||`—`}</strong></div>
                  <div>Produtos: <strong>${n.ocProdutos||`—`}</strong></div>
                </div>
              </td>
            </tr>
            <tr>
              <th>Notas Fiscais (NF)</th>
              <td>
                <div class="inline-grid">
                  <div>Peças: <strong>${n.nfPecas||`—`}</strong></div>
                  <div>Serviços: <strong>${n.nfServicos||`—`}</strong></div>
                </div>
              </td>
            </tr>
          </table>

          ${n.observacoes?`<p style="margin: 6px 0; font-size: 13.5px;"><strong>Observações:</strong> ${n.observacoes}</p>`:``}

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
  `,p=window.open(``,`_blank`);p&&(p.document.write(f),p.document.close())}async function a(e){let{notice:t}=e,n=``;try{let e=typeof window<`u`?window.location.origin:``,t=await fetch(`${e}/logo-dores.png`);if(t.ok){let e=await t.blob();n=await new Promise(t=>{let n=new FileReader;n.onloadend=()=>t(n.result),n.readAsDataURL(e)})}}catch{}let r=t.tipoMovimentacao,i=r===`AQUISICAO`,a=r===`TRANSFERENCIA`,o=r===`REMESSA_CONSERTO`,s=r===`BAIXA`,c=e=>e?`[ X ]`:`[ &nbsp; ]`,l=t.salaOrigem;if(!l){let e=new Set(t.itens.map(e=>e.salaOrigem).filter(Boolean));l=e.size===1?[...e][0]:e.size>1?`Diversas / Múltiplos setores`:`Setor de Patrimônio`}let u=`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Comunicado de Movimentação de Bens - CMB Nº ${t.numeroCmb}</title>
      <style>
        @page { size: A4; margin: 8mm 10mm; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #14211b; margin: 0; padding: 0; font-size: 12px; }
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
        header { border-bottom: 2px solid #0f5132; padding-bottom: 6px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .logo-title { display: flex; align-items: center; gap: 14px; }
        .logo-title img { height: 60px; width: auto; object-fit: contain; }
        h1 { font-size: 18px; color: #0f5132; margin: 0; }
        .cmb-number { font-size: 16px; font-weight: bold; color: #9b1c1c; border: 2px solid #9b1c1c; padding: 4px 12px; border-radius: 6px; }
        .subtitle { font-size: 14px; font-weight: bold; color: #33443b; text-align: center; margin-bottom: 10px; background: #eef3ef; padding: 4px; }
        .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; font-size: 11.5px; background: #f7faf8; padding: 8px; border-radius: 6px; border: 1px solid #e0e8e3; }
        .section-box { border: 1px solid #cdd9d2; padding: 6px 10px; margin-bottom: 8px; border-radius: 6px; background: #fcfdfc; }
        .section-title { font-size: 11.5px; font-weight: bold; color: #0f5132; text-transform: uppercase; margin-bottom: 4px; border-bottom: 1px solid #eef3ef; padding-bottom: 2px; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 11px; }
        .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 6px; }
        th, td { border: 1px solid #cdd9d2; padding: 4px 6px; text-align: left; font-size: 10.5px; }
        th { background: #eef3ef; color: #0f5132; text-transform: uppercase; }
        .signatures { margin-top: auto; padding-top: 20px; display: flex; justify-content: space-between; page-break-inside: avoid; }
        .sig-box { width: 48%; border-top: 1px solid #33443b; text-align: center; padding-top: 6px; font-size: 11px; }
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
          <header>
            <div class="logo-title">
              ${n?`<img src="${n}" alt="Clube Dores">`:``}
              <div>
                <h1>CLUBE RECREATIVO DORES</h1>
                <div style="font-size: 11px; color: #4d6057;">Setor de Patrimônio e Contabilidade</div>
              </div>
            </div>
            <div class="cmb-number">CMB Nº ${t.numeroCmb}</div>
          </header>

          <div class="subtitle">COMUNICADO DE MOVIMENTAÇÃO DE BENS - CMB</div>

          <div class="meta-grid">
            <div><strong>Data Emissão:</strong> ${t.dataEmissao}</div>
            <div><strong>Local Origem:</strong> ${t.localOrigem}</div>
            <div><strong>Prédio Origem:</strong> ${t.predioOrigem||`—`}</div>
            <div><strong>Sala / Área:</strong> ${l}</div>
          </div>

          <!-- Tipos de Movimentação -->
          <div class="section-box">
            <div class="section-title">1. Tipo de Movimentação</div>
            <div class="grid-3">
              <div>${c(i)} <strong>Aquisição</strong></div>
              <div>${c(a)} <strong>Transferência</strong></div>
              <div>${c(o)} <strong>Remessa Conserto</strong></div>
            </div>
            <div style="margin-top: 4px;">
              <div>${c(s)} <strong>Baixa Patrimonial</strong></div>
            </div>
          </div>

          ${a?`
          <div class="section-box">
            <div class="section-title">Detalhes da Transferência</div>
            <div class="grid-3">
              <div><strong>Destino:</strong> ${t.localDestino||`—`}</div>
              <div><strong>Prédio:</strong> ${t.predioDestino||`—`}</div>
              <div><strong>Sala:</strong> ${t.salaDestino||`—`}</div>
            </div>
            <div class="grid-2" style="margin-top: 4px;">
              <div><strong>Tipo:</strong> ${t.tipoTransferencia||`DEFINITIVA`}</div>
              <div><strong>Retorno Temporário:</strong> ${t.dataRetornoTemporaria||`N/A`}</div>
            </div>
          </div>
          `:``}

          ${o?`
          <div class="section-box">
            <div class="section-title">Detalhes da Remessa para Conserto</div>
            <div class="grid-3">
              <div><strong>Fornecedor:</strong> ${t.fornecedor||`—`}</div>
              <div><strong>Contato:</strong> ${t.contatoFornecedor||`—`}</div>
              <div><strong>CNPJ/CPF:</strong> ${t.cnpjCpfFornecedor||`—`}</div>
            </div>
            <div class="grid-2" style="margin-top: 4px;">
              <div><strong>Previsão Retorno:</strong> ${t.dataRetornoConserto||`—`}</div>
              <div><strong>Justificativa:</strong> ${t.justificativaConserto||`—`}</div>
            </div>
          </div>
          `:``}

          ${s?`
          <div class="section-box">
            <div class="section-title">Detalhes da Baixa Patrimonial</div>
            <div class="grid-2">
              <div><strong>Motivo:</strong> ${t.motivoBaixa||`—`}</div>
              <div><strong>Destino / Justificativa:</strong> ${t.justificativaDestinoBaixa||`—`}</div>
            </div>
          </div>
          `:``}

          <!-- Tabela de Bens -->
          <div class="section-box" style="margin-top: 6px;">
            <div class="section-title">2. Relação de Bens Movimentados</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 6%;">Qtd</th>
                  <th style="width: 14%;">Plaqueta</th>
                  <th style="width: 28%;">Descrição do Bem</th>
                  <th style="width: 20%;">Sala / Origem</th>
                  <th style="width: 12%;">Aquisição</th>
                  <th style="width: 10%;">Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                ${t.itens.map(e=>`
                <tr>
                  <td>${e.quantidade}</td>
                  <td style="font-family: monospace; font-weight: bold;">${e.plaqueta}</td>
                  <td>${e.descricao}</td>
                  <td>${e.salaOrigem||t.salaOrigem||`Setor Padrão`}</td>
                  <td>${e.dataAquisicao||`—`}</td>
                  <td>${e.valorAquisicao?`R$ ${e.valorAquisicao.toFixed(2)}`:`—`}</td>
                </tr>
                `).join(``)}
              </tbody>
            </table>
          </div>

          <!-- Informações Fiscais -->
          <div class="section-box">
            <div class="section-title">3. Informações Fiscais (Opcional)</div>
            <div class="grid-3">
              <div><strong>Natureza Op.:</strong> ${t.naturezaOperacao||`—`}</div>
              <div><strong>CFOP:</strong> ${t.cfop||`—`}</div>
              <div><strong>Valor Total:</strong> ${t.valorTotal?`R$ ${t.valorTotal.toLocaleString(`pt-BR`,{minimumFractionDigits:2})}`:`—`}</div>
            </div>
          </div>
        </div>

        <div class="signatures">
          <div class="sig-box">
            Cedente / Receptor do Bem<br>
            <strong>${t.cedenteNome||`Emitente`} / ${t.receptorNome||`Recebedor`}</strong>
          </div>
          <div class="sig-box">
            Autorizado por (Patrimônio / Diretoria)<br>
            <strong>Setor de Patrimônio — Clube Dores</strong>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,d=window.open(``,`_blank`);d&&(d.document.write(u),d.document.close())}export{t as a,n as i,i as n,a as r,r as t};