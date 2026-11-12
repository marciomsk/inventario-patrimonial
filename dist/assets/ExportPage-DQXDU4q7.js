import{C as e,M as t,_ as n,b as r,c as i,d as a,et as o,f as s,g as c,h as l,nt as u,o as d,r as f,rt as p,t as m,v as h,y as ee}from"./index-BiPeURNO.js";import{n as te}from"./backup-DEM1W33u.js";import{a as g,i as _}from"./roomRepository-CZs2hWss.js";import{a as v,c as ne,i as re,l as ie,n as ae,o as y,t as b,u as x}from"./export-20_wNQbP.js";import{n as S,r as C}from"./xlsx-D6gApl6T.js";import{r as w,t as T}from"./download-N9iYOcTN.js";import{i as E}from"./transferRepository-ne7Q2BKl.js";var D=p(u(),1),O={pendente:`Pendente`,enviada:`Enviada`,cancelada:`Cancelada`,efetivada:`Efetivada`};function k(e,t){let n=C(e,{bookType:`xlsx`,type:`array`}),r=`${t}_${w()}.xlsx`;return T(new Blob([n],{type:`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`}),r),r}function A(e,t,n=0){for(let r=0;r<t;r+=1){let t=e[S.encode_cell({r:r+1,c:n})];t&&(t.t=`s`,t.v=String(t.v??``))}}function j(e,t,n,r){let i=new Map;for(let e of n){if(e.inventorySessionId!==r||!e.assetId)continue;let t=i.get(e.assetId);(!t||e.dataHora>t.dataHora)&&i.set(e.assetId,e)}let a=[`Plaqueta`,`Descricao`,`Local_Original`,`Status_Sessao`,`Local_Encontrado`,`Data_Leitura`,`Status_Cadastro`,`Revisao_Pendente`],o=e.map(e=>{let n=t.get(e.id),r=i.get(e.id),a=n?.conferido??!1,o=n?.divergente??!1,s=a?o?`Divergente`:`Conferido`:`Pendente`;return[String(e.plaqueta),e.descricao,e.localOriginal,s,r?.localBipagem??``,r?m(r.dataHora):``,e.statusCadastro,e.revisaoPendente?`SIM`:`NAO`]}),s=S.aoa_to_sheet([a,...o]);A(s,e.length,0),s[`!cols`]=[{wch:18},{wch:38},{wch:32},{wch:14},{wch:32},{wch:18},{wch:16},{wch:16}];let c=S.book_new();return S.book_append_sheet(c,s,`Auditoria_Geral`),c}function M(e,t,n,r){return k(j(e,t,n,r),`auditoria_geral`)}function N(e,t){let n=e.filter(e=>e.ativo&&!t.get(e.id)?.conferido),r=[`Plaqueta`,`Descricao`,`Local_Original`,`Revisao_Pendente`],i=n.map(e=>[String(e.plaqueta),e.descricao,e.localOriginal,e.revisaoPendente?`SIM`:`NAO`]),a=S.aoa_to_sheet([r,...i]);A(a,n.length,0),a[`!cols`]=[{wch:18},{wch:38},{wch:32},{wch:16}];let o=S.book_new();return S.book_append_sheet(o,a,`Pendencias_Faltas`),o}function P(e,t){return k(N(e,t),`pendencias`)}function F(e,n){let r=e.filter(e=>e.inventorySessionId===n&&(e.resultado===`nao_cadastrado`||e.resultado===`divergente`)),i=[`Plaqueta`,`Resultado`,`Local_Bipagem`,`Data_Hora`,`Observacao`],a=r.map(e=>[String(e.plaqueta),t[e.resultado],e.localBipagem,m(e.dataHora),e.observacao??``]),o=S.aoa_to_sheet([i,...a]);A(o,r.length,0),o[`!cols`]=[{wch:18},{wch:20},{wch:32},{wch:18},{wch:30}];let s=S.book_new();return S.book_append_sheet(s,o,`Sobras_Divergencias`),s}function I(e,t){return k(F(e,t),`sobras_divergencias`)}function L(e){let t=[`Plaqueta`,`Local_Original`,`Local_Destino`,`Data_Solicitacao`,`Status`,`Efetivada_Em`,`Observacao`],n=e.map(e=>[String(e.plaqueta),e.localOriginal,e.localDestino,m(e.dataHora),O[e.status],e.resolvedAt?m(e.resolvedAt):``,e.observacao??``]),r=S.aoa_to_sheet([t,...n]);A(r,e.length,0),r[`!cols`]=[{wch:18},{wch:34},{wch:34},{wch:18},{wch:12},{wch:18},{wch:40}];let i=S.book_new();return S.book_append_sheet(i,r,`Transferencias`),i}function R(e){return k(L(e),`transferencias`)}function z(e){let{room:t,assets:n,states:r,sessionId:i}=e,a=n.filter(e=>!(!(t.id?e.roomId===t.id:e.localOriginal===t.label)||t.codigo&&e.plaqueta.trim()===t.codigo.trim())).sort((e,t)=>e.plaqueta.localeCompare(t.plaqueta,`pt-BR`)),o=a.filter(e=>!e.baixado),s=a.filter(e=>e.baixado).length,c=o.length,l=o.filter(e=>i&&r.get(e.id)?.conferido).length,u=c-l,d=c===0?0:Math.round(l/c*100),f=m(new Date().toISOString()),p=`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Laudo de Inventário - ${t.label}</title>
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
          <div class="meta">Sistema de Inventário Patrimonial · Gerado em ${f}</div>
        </div>
        <div style="text-align: right;">
          <strong>Setor / Sala:</strong> ${t.label}<br>
          <strong>Código:</strong> ${t.codigo??`—`} · <strong>Filial:</strong> ${t.filial??`Filial 1`}
        </div>
      </header>

      <div class="box">
        <div>
          <p><strong>Responsável pelo Setor:</strong> ${t.responsavel||`Não informado`}</p>
          <p><strong>Bens Ativos:</strong> ${c} · Conferidos: ${l} · Pendentes: ${u} ${s>0?`· Baixados: ${s}`:``}</p>
        </div>
        <div style="text-align: right; font-size: 15px;">
          <strong>Taxa de Cobertura:</strong> <span style="color: #0f5132; font-size: 18px; font-weight: bold;">${d}%</span>
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
  `;for(let e of a){let t=i?r.get(e.id):void 0,n=t?.conferido??!1,a=t?.divergente??!1,o=`pendente`,s=`PENDENTE`,c=`badge-pendente`,l=e.observacao??``;e.baixado?(o=`baixado`,s=`BAIXADO`,c=`badge-baixado`,l=e.motivoBaixa?`Baixado: ${e.motivoBaixa}`:`Baixado`):n&&(a?(o=`divergente`,s=`DIVERGENTE`,c=`badge-divergente`):(o=`conferido`,s=`CONFERIDO`,c=`badge-conferido`)),p+=`
      <tr class="${o}">
        <td style="font-family: monospace; font-weight: bold;">${e.plaqueta}</td>
        <td class="desc">${e.descricao||`Sem descrição`}</td>
        <td><span class="badge ${c}">${s}</span></td>
        <td>${l}</td>
      </tr>
    `}p+=`
        </tbody>
      </table>

      <div class="signatures">
        <div class="sig-box">
          Assinatura do Responsável do Setor<br>
          <strong>${t.responsavel||`Responsável`}</strong>
        </div>
        <div class="sig-box">
          Assinatura do Auditor / Inventariante<br>
          <strong>Equipe de Patrimônio</strong>
        </div>
      </div>
    </body>
    </html>
  `;let h=window.open(``,`_blank`);h&&(h.document.write(p),h.document.close())}function B(e){let{responsavel:t,rooms:n,assets:r,states:i,sessionId:a}=e,o=n.filter(e=>e.responsavel?.trim().toLowerCase()===t.trim().toLowerCase()),s=`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório por Responsável - ${t}</title>
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
          <div class="meta">Sistema de Inventário Patrimonial · Gerado em ${m(new Date().toISOString())}</div>
        </div>
        <div style="text-align: right;">
          <strong>Responsável:</strong> ${t}<br>
          <strong>Setores Vinculados:</strong> ${o.length}
        </div>
      </header>
  `;for(let e of o){let t=r.filter(t=>!(!(e.id?t.roomId===e.id:t.localOriginal===e.label)||e.codigo&&t.plaqueta.trim()===e.codigo.trim())).sort((e,t)=>e.plaqueta.localeCompare(t.plaqueta,`pt-BR`)),n=t.filter(e=>!e.baixado),o=n.length,c=n.filter(e=>a&&i.get(e.id)?.conferido).length,l=o-c,u=o===0?0:Math.round(c/o*100);s+=`
      <h2>Setor: ${e.label} (Ativos: ${o} · Conferidos: ${c} · Pendentes: ${l} · Cobertura: ${u}%)</h2>
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
    `;for(let e of t){let t=a?i.get(e.id):void 0,n=t?.conferido??!1,r=t?.divergente??!1,o=`PENDENTE`,c=`badge-pendente`,l=e.observacao??``;e.baixado?(o=`BAIXADO`,c=`badge-baixado`,l=e.motivoBaixa?`Baixa: ${e.motivoBaixa}`:`Baixado`):n&&(r?(o=`DIVERGENTE`,c=`badge-divergente`):(o=`CONFERIDO`,c=`badge-conferido`)),s+=`
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${e.plaqueta}</td>
          <td class="desc">${e.descricao||`Sem descrição`}</td>
          <td><span class="badge ${c}">${o}</span></td>
          <td>${l}</td>
        </tr>
      `}s+=`
        </tbody>
      </table>
    `}s+=`
      <div class="signatures">
        <div class="sig-box">
          Assinatura do Responsável<br>
          <strong>${t}</strong>
        </div>
        <div class="sig-box">
          Assinatura do Auditor / Inventariante<br>
          <strong>Equipe de Patrimônio</strong>
        </div>
      </div>
    </body>
    </html>
  `;let c=window.open(``,`_blank`);c&&(c.document.write(s),c.document.close())}function V(e){let{filial:t,rooms:n,assets:r,states:i,sessionId:a}=e,o=t===`Todas`?n:n.filter(e=>(e.filial??`Filial 1`)===t),s=`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório por Filial - ${t}</title>
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
          <div class="meta">Sistema de Inventário Patrimonial · Gerado em ${m(new Date().toISOString())}</div>
        </div>
        <div style="text-align: right;">
          <strong>Filial:</strong> ${t}<br>
          <strong>Total de Setores:</strong> ${o.length}
        </div>
      </header>
  `;for(let e of o){let t=r.filter(t=>!(!(e.id?t.roomId===e.id:t.localOriginal===e.label)||e.codigo&&t.plaqueta.trim()===e.codigo.trim())).sort((e,t)=>e.plaqueta.localeCompare(t.plaqueta,`pt-BR`)),n=t.filter(e=>!e.baixado),o=n.length,c=n.filter(e=>a&&i.get(e.id)?.conferido).length,l=o-c,u=o===0?0:Math.round(c/o*100);s+=`
      <h2>Setor: ${e.label} ${e.responsavel?`(Resp: ${e.responsavel})`:``} — [Ativos: ${o} | Conf: ${c} | Pend: ${l} | Cobertura: ${u}%]</h2>
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
    `;for(let e of t){let t=a?i.get(e.id):void 0,n=t?.conferido??!1,r=t?.divergente??!1,o=`PENDENTE`,c=`badge-pendente`,l=e.observacao??``;e.baixado?(o=`BAIXADO`,c=`badge-baixado`,l=e.motivoBaixa?`Baixa: ${e.motivoBaixa}`:`Baixado`):n&&(r?(o=`DIVERGENTE`,c=`badge-divergente`):(o=`CONFERIDO`,c=`badge-conferido`)),s+=`
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${e.plaqueta}</td>
          <td class="desc">${e.descricao||`Sem descrição`}</td>
          <td><span class="badge ${c}">${o}</span></td>
          <td>${l}</td>
        </tr>
      `}s+=`
        </tbody>
      </table>
    `}s+=`
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
  `;let c=window.open(``,`_blank`);c&&(c.document.write(s),c.document.close())}var H=r();function U(){let{session:t}=ee(),{assets:r,events:u,assetsById:p,states:S,roomList:C,summary:w}=d(),{push:T}=n(),O=o(()=>e(`lastBackupAt`),[]),k=o(()=>E(),[]),[A,j]=(0,D.useState)(``),[N,F]=(0,D.useState)(``),[L,U]=(0,D.useState)(``),[W,G]=(0,D.useState)(`Filial 1`),[oe,K]=(0,D.useState)(!1),[q,se]=(0,D.useState)(``),[J,ce]=(0,D.useState)(`Filial 1`),Y=t?.id??null,X=(0,D.useMemo)(()=>C.find(e=>e.id===A)??null,[C,A]);(0,D.useEffect)(()=>{X?(U(X.responsavel??``),G(X.filial??`Filial 1`),K(!!X.relatorioEntregue)):(U(``),G(`Filial 1`),K(!1))},[X]);let Z=(0,D.useMemo)(()=>[...C].sort((e,t)=>{let n=e.codigo??`9999`,r=t.codigo??`9999`;return n.localeCompare(r,`pt-BR`)||e.label.localeCompare(t.label,`pt-BR`)}),[C]),Q=(0,D.useMemo)(()=>{let e=N.trim().toLowerCase();return e?Z.filter(t=>t.label.toLowerCase().includes(e)||t.codigo&&t.codigo.toLowerCase().includes(e)||t.responsavel&&t.responsavel.toLowerCase().includes(e)):Z},[Z,N]),le=(0,D.useMemo)(()=>{let e=new Set;for(let t of C)t.responsavel?.trim()&&e.add(t.responsavel.trim());return[...e].sort((e,t)=>e.localeCompare(t,`pt-BR`))},[C]);function $(e){T(`Arquivo ${e} gerado.`,`success`)}return(0,H.jsxs)(`div`,{className:`page`,children:[(0,H.jsx)(c,{eyebrow:`Dados`,title:`Exportar`,subtitle:`Backup completo e relatórios em CSV compatíveis com Excel pt-BR.`}),(0,H.jsxs)(`div`,{className:`stats-grid stats-grid--compact`,children:[(0,H.jsx)(l,{label:`Bens`,value:f(r.length),icon:`box`}),(0,H.jsx)(l,{label:`Leituras`,value:f(u.length),icon:`history`,tone:`info`}),(0,H.jsx)(l,{label:`Último backup`,value:O?m(O):`Nunca`,icon:`save`,tone:O?`success`:`warning`})]}),(0,H.jsxs)(`div`,{className:`export-grid`,children:[(0,H.jsxs)(a,{className:`export-card export-card--primary`,children:[(0,H.jsx)(s,{title:`Backup completo (JSON)`,subtitle:`Bens, leituras, sessões, configurações, lotes e solicitações.`,icon:`save`}),(0,H.jsx)(`p`,{children:`Guarde este arquivo antes de limpar a base ou trocar de dispositivo. O backup preserva todo o histórico de leituras, inclusive as repetidas.`}),(0,H.jsx)(i,{variant:`primary`,size:`lg`,icon:`download`,onClick:async()=>{$(await te())},children:`Baixar backup`}),(0,H.jsxs)(`p`,{className:`card__note`,children:[(0,H.jsx)(h,{name:`info`,size:14}),` Nunca afirmamos que o backup foi feito sem gerar o arquivo. Após o download, a data fica registrada.`]})]}),(0,H.jsxs)(a,{className:`export-card`,children:[(0,H.jsx)(s,{title:`Bens do cadastro`,subtitle:`CSV com revisão e origem`,icon:`box`}),(0,H.jsx)(i,{icon:`download`,disabled:r.length===0,onClick:()=>$(b(r)),children:`Exportar bens`})]}),(0,H.jsxs)(a,{className:`export-card`,children:[(0,H.jsx)(s,{title:`Itens novos (cadastro manual)`,subtitle:`Bens cadastrados em campo, fora da carga original`,icon:`plus`}),(0,H.jsx)(i,{icon:`download`,disabled:!r.some(e=>e.isManualRegister),onClick:()=>$(v(r,u,Y)),children:`Exportar itens novos`})]}),(0,H.jsxs)(a,{className:`export-card`,children:[(0,H.jsx)(s,{title:`Leituras da sessão`,subtitle:`CSV do histórico da sessão ativa`,icon:`history`}),(0,H.jsx)(i,{icon:`download`,disabled:!Y,onClick:()=>{Y&&$(ne(u,p,Y))},children:`Exportar leituras`})]}),(0,H.jsxs)(a,{className:`export-card`,children:[(0,H.jsx)(s,{title:`Todas as leituras`,subtitle:`Histórico completo, todas as sessões`,icon:`history`}),(0,H.jsx)(i,{icon:`download`,disabled:u.length===0,onClick:()=>$(re(u,p)),children:`Exportar histórico`})]}),(0,H.jsxs)(a,{className:`export-card export-card--primary`,children:[(0,H.jsx)(s,{title:`Relatório Geral de Auditoria`,subtitle:`Todos os bens com status, sala encontrada e data na sessão ativa`,icon:`clipboard`}),(0,H.jsx)(`p`,{children:`Visão completa do inventário reunindo o cadastro base e o resultado da conferência atual.`}),(0,H.jsxs)(`div`,{className:`row-actions`,children:[(0,H.jsx)(i,{variant:`primary`,icon:`download`,disabled:!Y||r.length===0,onClick:()=>{Y&&$(ae(r,S,u,Y))},children:`Exportar CSV`}),(0,H.jsx)(i,{variant:`secondary`,icon:`download`,disabled:!Y||r.length===0,onClick:()=>{Y&&$(M(r,S,u,Y))},children:`Exportar XLSX`})]})]}),(0,H.jsxs)(a,{className:`export-card`,children:[(0,H.jsx)(s,{title:`Pendências (Faltas)`,subtitle:`Bens sem leitura na sessão ativa`,icon:`clipboard`}),(0,H.jsxs)(`div`,{className:`row-actions`,children:[(0,H.jsx)(i,{icon:`download`,disabled:!Y||w.pendentes===0,onClick:()=>$(y(r,S)),children:`CSV`}),(0,H.jsx)(i,{icon:`download`,disabled:!Y||w.pendentes===0,onClick:()=>$(P(r,S)),children:`XLSX`})]})]}),(0,H.jsxs)(a,{className:`export-card`,children:[(0,H.jsx)(s,{title:`Sobras e Divergências`,subtitle:`Itens em sala divergente ou não cadastrados`,icon:`alert`}),(0,H.jsxs)(`div`,{className:`row-actions`,children:[(0,H.jsx)(i,{icon:`download`,disabled:!Y,onClick:()=>$(ie(u,Y??``)),children:`CSV`}),(0,H.jsx)(i,{icon:`download`,disabled:!Y,onClick:()=>$(I(u,Y??``)),children:`XLSX`})]})]}),(0,H.jsxs)(a,{className:`export-card`,children:[(0,H.jsx)(s,{title:`Relatório PDF por Sala (Setor)`,subtitle:`Laudo detalhado com bens, status e bloco de assinatura`,icon:`building`}),(0,H.jsxs)(`div`,{className:`form-stack`,children:[(0,H.jsxs)(`label`,{className:`field`,children:[(0,H.jsx)(`span`,{children:`Buscar sala (código ou nome)`}),(0,H.jsx)(`input`,{value:N,onChange:e=>F(e.target.value),placeholder:`Ex.: 0589, Praia...`,autoComplete:`off`})]}),(0,H.jsxs)(`label`,{className:`field`,children:[(0,H.jsxs)(`span`,{children:[`Selecione a sala (`,Q.length,` encontradas)`]}),(0,H.jsxs)(`select`,{value:A,onChange:e=>j(e.target.value),children:[(0,H.jsx)(`option`,{value:``,children:`Selecione uma sala...`}),Q.map(e=>(0,H.jsxs)(`option`,{value:e.id,children:[e.label,` `,e.responsavel?`[Resp: ${e.responsavel}]`:``,` `,e.relatorioEntregue?`✓ [Entregue]`:``]},e.id))]})]}),X?(0,H.jsxs)(`div`,{className:`box`,style:{background:`#f7faf8`,padding:`12px`,borderRadius:`8px`,border:`1px solid #e0e8e3`},children:[(0,H.jsxs)(`label`,{className:`field`,style:{marginBottom:`10px`},children:[(0,H.jsx)(`span`,{children:`Filial da Sala`}),(0,H.jsxs)(`select`,{value:W,onChange:async e=>{let t=e.target.value;G(t);try{await g(X.id,{codigo:X.codigo,nome:X.nome,responsavel:L,filial:t}),T(`Filial atualizada com sucesso.`,`success`)}catch{T(`Erro ao atualizar filial.`,`error`)}},children:[(0,H.jsx)(`option`,{value:`Filial 1`,children:`Filial 1`}),(0,H.jsx)(`option`,{value:`Filial 2`,children:`Filial 2`})]})]}),(0,H.jsxs)(`label`,{className:`field`,style:{marginBottom:`10px`},children:[(0,H.jsx)(`span`,{children:`Vincular / Alterar Responsável`}),(0,H.jsxs)(`div`,{style:{display:`flex`,gap:`8px`},children:[(0,H.jsx)(`input`,{value:L,onChange:e=>U(e.target.value),placeholder:`Nome do responsável do setor`}),(0,H.jsx)(i,{variant:`secondary`,size:`sm`,onClick:async()=>{try{await g(X.id,{codigo:X.codigo,nome:X.nome,responsavel:L,filial:W}),T(`Responsável atualizado com sucesso.`,`success`)}catch(e){T(e instanceof Error?e.message:`Erro ao atualizar responsável.`,`error`)}},children:`Salvar`})]})]}),(0,H.jsxs)(`label`,{style:{display:`flex`,alignItems:`center`,gap:`8px`,cursor:`pointer`,fontSize:`13px`,fontWeight:`bold`,color:`#0f5132`},children:[(0,H.jsx)(`input`,{type:`checkbox`,checked:oe,onChange:async e=>{let t=e.target.checked;K(t);try{await _(X.id,t),T(t?`Marcado como relatório entregue.`:`Marcado como relatório não entregue.`,`success`)}catch{T(`Erro ao atualizar status de entrega.`,`error`)}}}),`Relatório entregue ao responsável`]})]}):null,(0,H.jsx)(i,{variant:`primary`,icon:`download`,disabled:!A,onClick:()=>{let e=C.find(e=>e.id===A);e&&(z({room:e,assets:r,states:S,events:u,sessionId:Y}),T(`Relatório PDF da sala ${e.label} aberto para impressão.`,`success`))},children:`Gerar PDF da sala`})]})]}),(0,H.jsxs)(a,{className:`export-card`,children:[(0,H.jsx)(s,{title:`Relatório PDF por Filial`,subtitle:`Consolidado de todas as salas pertencentes à filial`,icon:`building`}),(0,H.jsxs)(`div`,{className:`form-stack`,children:[(0,H.jsxs)(`select`,{value:J,onChange:e=>ce(e.target.value),className:`field`,children:[(0,H.jsx)(`option`,{value:`Filial 1`,children:`Filial 1`}),(0,H.jsx)(`option`,{value:`Filial 2`,children:`Filial 2`}),(0,H.jsx)(`option`,{value:`Todas`,children:`Todas as Filiais`})]}),(0,H.jsx)(i,{variant:`primary`,icon:`download`,onClick:()=>{V({filial:J,rooms:C,assets:r,states:S,events:u,sessionId:Y}),T(`Relatório consolidado da ${J} aberto para impressão.`,`success`)},children:`Gerar PDF por filial`})]})]}),(0,H.jsxs)(a,{className:`export-card`,children:[(0,H.jsx)(s,{title:`Relatório PDF por Responsável`,subtitle:`Consolidado de todas as salas atribuídas ao responsável`,icon:`clipboard`}),(0,H.jsxs)(`div`,{className:`form-stack`,children:[(0,H.jsxs)(`select`,{value:q,onChange:e=>se(e.target.value),className:`field`,children:[(0,H.jsx)(`option`,{value:``,children:`Selecione um responsável...`}),le.map(e=>(0,H.jsx)(`option`,{value:e,children:e},e))]}),(0,H.jsx)(i,{variant:`primary`,icon:`download`,disabled:!q,onClick:()=>{q&&(B({responsavel:q,rooms:C,assets:r,states:S,events:u,sessionId:Y}),T(`Relatório consolidado para ${q} aberto para impressão.`,`success`))},children:`Gerar PDF por responsável`})]})]}),(0,H.jsxs)(a,{className:`export-card`,children:[(0,H.jsx)(s,{title:`Solicitações de transferência`,subtitle:`Intenções e efetivações para atualizar o Senior`,icon:`refresh`}),(0,H.jsxs)(`div`,{className:`row-actions`,children:[(0,H.jsx)(i,{icon:`download`,disabled:!k||k.length===0,onClick:()=>{k&&$(x(k))},children:`Exportar CSV`}),(0,H.jsx)(i,{icon:`download`,disabled:!k||k.length===0,onClick:()=>{k&&$(R(k))},children:`Exportar XLSX`})]})]})]}),(0,H.jsxs)(a,{children:[(0,H.jsx)(s,{title:`Sobre os arquivos`,icon:`info`}),(0,H.jsxs)(`ul`,{className:`bullet-list`,children:[(0,H.jsx)(`li`,{children:`CSV em UTF-8 com BOM, separador ponto e vírgula e plaquetas entre aspas.`}),(0,H.jsx)(`li`,{children:`Exportar não altera nenhum dado local.`}),(0,H.jsx)(`li`,{children:`Pendências e divergências refletem sempre a sessão ativa.`}),(0,H.jsx)(`li`,{children:`O backup JSON contém a versão do schema para futuras migrações.`})]})]})]})}export{U as ExportPage};