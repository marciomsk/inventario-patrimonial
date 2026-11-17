import{t as e}from"./index-XIc11MeK.js";function t(t){let{room:n,assets:r,states:i,sessionId:a}=t,o=r.filter(e=>!(!(n.id?e.roomId===n.id:e.localOriginal===n.label)||n.codigo&&e.plaqueta.trim()===n.codigo.trim())).sort((e,t)=>e.plaqueta.localeCompare(t.plaqueta,`pt-BR`)),s=o.filter(e=>!e.baixado),c=o.filter(e=>e.baixado).length,l=s.length,u=s.filter(e=>a&&i.get(e.id)?.conferido).length,d=l-u,f=l===0?0:Math.round(u/l*100),p=e(new Date().toISOString()),m=`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Laudo de Inventário - ${n.label}</title>
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
    `;for(let e of t){let t=o?a.get(e.id):void 0,n=t?.conferido??!1,r=t?.divergente??!1,i=`PENDENTE`,s=`badge-pendente`,l=e.observacao??``;e.baixado?(i=`BAIXADO`,s=`badge-baixado`,l=e.motivoBaixa?`Baixa: ${e.motivoBaixa}`:`Baixado`):n&&(r?(i=`DIVERGENTE`,s=`badge-divergente`):(i=`CONFERIDO`,s=`badge-conferido`)),c+=`
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
  `;let l=window.open(``,`_blank`);l&&(l.document.write(c),l.document.close())}function i(t){let{maintenance:n,asset:r,room:i,pastCount:a,totalPastSpent:o}=t,s=e(new Date().toISOString()),c=n.valorBemNovo??0,l=o+n.valorOrcado,u=c>0?Math.round(l/c*100):0,d=`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Solicitação de Conserto ou Troca - ${n.numeroDocumento}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #14211b; margin: 0; padding: 28px; font-size: 13px; line-height: 1.4; }
        header { border-bottom: 2px solid #0f5132; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
        h1 { font-size: 18px; color: #0f5132; margin: 0 0 4px 0; text-align: center; }
        .subtitle { font-size: 14px; font-weight: bold; color: #33443b; text-align: center; margin-bottom: 20px; }
        .meta { font-size: 12px; color: #4d6057; text-align: right; }
        .section-title { font-size: 13px; font-weight: bold; color: #0f5132; background: #eef3ef; padding: 6px 10px; border-left: 4px solid #0f5132; margin: 16px 0 8px 0; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #cdd9d2; padding: 8px 10px; text-align: left; font-size: 12px; }
        th { background: #f7faf8; color: #33443b; width: 30%; }
        .decision-box { border: 2px dashed #0f5132; padding: 14px; border-radius: 8px; margin-top: 24px; background: #fcfdfc; }
        .decision-box h3 { margin: 0 0 10px 0; font-size: 14px; color: #0f5132; }
        .checkbox-row { display: flex; gap: 30px; margin-top: 10px; font-weight: bold; font-size: 13px; }
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
        <button onclick="window.print()" style="background: #0f5132; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer;">Imprimir / Salvar PDF</button>
      </div>

      <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 8px;">
        <img src="/logo-dores.png" alt="Logo Dores" style="height: 60px; object-fit: contain;" onerror="this.style.display='none'">
        <h1 style="margin: 0; font-size: 20px; color: #0f5132;">CLUBE RECREATIVO DORES</h1>
      </div>
      <div class="subtitle">SOLICITAÇÃO DE CONSERTO OU TROCA DE EQUIPAMENTO</div>
      <div class="meta">Documento Interno Nº: <strong>${n.numeroDocumento}</strong> · Data: ${s}</div>

      <p style="margin-top: 16px;">
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
          <td style="font-family: monospace; font-weight: bold; font-size: 14px;">${n.plaqueta}</td>
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
        <tr>
          <th>Valor do Conserto (Orçado)</th>
          <td><strong style="color: #0f5132; font-size: 14px;">R$ ${n.valorOrcado.toLocaleString(`pt-BR`,{minimumFractionDigits:2})}</strong> (Peças: R$ ${n.valorPecas.toLocaleString(`pt-BR`,{minimumFractionDigits:2})} | Serviços: R$ ${n.valorServicos.toLocaleString(`pt-BR`,{minimumFractionDigits:2})})</td>
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
          <td>R$ ${o.toLocaleString(`pt-BR`,{minimumFractionDigits:2})}</td>
        </tr>
        <tr>
          <th>Gasto Acumulado (Anteriores + Atual)</th>
          <td><strong>R$ ${l.toLocaleString(`pt-BR`,{minimumFractionDigits:2})}</strong></td>
        </tr>
        <tr>
          <th>Valor de Compra de Bem Novo Equivalente</th>
          <td>${c>0?`R$ ${c.toLocaleString(`pt-BR`,{minimumFractionDigits:2})} (${u}% do valor de um bem novo)`:`Não informado`}</td>
        </tr>
        <tr>
          <th>Fornecedor Indicado</th>
          <td>${n.fornecedor} ${n.codigoFornecedor?`(Cód. ${n.codigoFornecedor})`:``}</td>
        </tr>
        <tr>
          <th>Ordens de Compra (OC)</th>
          <td>Serviços: ${n.ocServicos||`—`} | Produtos: ${n.ocProdutos||`—`}</td>
        </tr>
        <tr>
          <th>Notas Fiscais (NF)</th>
          <td>Peças: ${n.nfPecas||`—`} | Serviços: ${n.nfServicos||`—`}</td>
        </tr>
      </table>

      ${n.observacoes?`<p><strong>Observações:</strong> ${n.observacoes}</p>`:``}

      <div class="decision-box">
        <h3>Decisão da Comissão Administrativa</h3>
        <p>Favor assinalar a opção aprovada:</p>
        <div class="checkbox-row">
          <div>( &nbsp; &nbsp; ) Aprovado Conserto Conforme Orçamento</div>
          <div>( &nbsp; &nbsp; ) Aprovado Compra de Equipamento Novo (Troca)</div>
          <div>( &nbsp; &nbsp; ) Reprovado</div>
        </div>
        <div style="margin-top: 25px; display: flex; justify-content: space-between; font-size: 12px;">
          <div>Data: ____/____/________</div>
          <div>Assinatura da Comissão: _________________________________________</div>
        </div>
      </div>

      <div class="signatures">
        <div class="sig-box">
          Responsável pelo Setor de Patrimônio / Solicitante<br>
          <strong>Clube Recreativo Dores</strong>
        </div>
        <div class="sig-box">
          Gestor / Diretoria Administrativa<br>
          <strong>Aprovação Executiva</strong>
        </div>
      </div>
    </body>
    </html>
  `,f=window.open(``,`_blank`);f&&(f.document.write(d),f.document.close())}export{t as i,i as n,n as r,r as t};