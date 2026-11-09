import{C as e,M as t,_ as n,b as r,c as i,d as a,et as o,f as s,g as c,h as l,nt as u,o as d,r as f,rt as p,t as m,v as h,y as g}from"./index-B45x9z9X.js";import{n as _}from"./backup-BXGFGZde.js";import{a as v,c as y,i as b,l as x,n as S,o as C,t as w,u as T}from"./export-DfXVd9Pk.js";import{n as E,r as D}from"./xlsx-D6gApl6T.js";import{r as O,t as k}from"./download-N9iYOcTN.js";import{i as A}from"./transferRepository-DeUkiZBi.js";var j=p(u(),1),M={pendente:`Pendente`,enviada:`Enviada`,cancelada:`Cancelada`,efetivada:`Efetivada`};function N(e,t){let n=D(e,{bookType:`xlsx`,type:`array`}),r=`${t}_${O()}.xlsx`;return k(new Blob([n],{type:`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`}),r),r}function P(e,t,n=0){for(let r=0;r<t;r+=1){let t=e[E.encode_cell({r:r+1,c:n})];t&&(t.t=`s`,t.v=String(t.v??``))}}function F(e,t,n,r){let i=new Map;for(let e of n){if(e.inventorySessionId!==r||!e.assetId)continue;let t=i.get(e.assetId);(!t||e.dataHora>t.dataHora)&&i.set(e.assetId,e)}let a=[`Plaqueta`,`Descricao`,`Local_Original`,`Status_Sessao`,`Local_Encontrado`,`Data_Leitura`,`Status_Cadastro`,`Revisao_Pendente`],o=e.map(e=>{let n=t.get(e.id),r=i.get(e.id),a=n?.conferido??!1,o=n?.divergente??!1,s=a?o?`Divergente`:`Conferido`:`Pendente`;return[String(e.plaqueta),e.descricao,e.localOriginal,s,r?.localBipagem??``,r?m(r.dataHora):``,e.statusCadastro,e.revisaoPendente?`SIM`:`NAO`]}),s=E.aoa_to_sheet([a,...o]);P(s,e.length,0),s[`!cols`]=[{wch:18},{wch:38},{wch:32},{wch:14},{wch:32},{wch:18},{wch:16},{wch:16}];let c=E.book_new();return E.book_append_sheet(c,s,`Auditoria_Geral`),c}function I(e,t,n,r){return N(F(e,t,n,r),`auditoria_geral`)}function L(e,t){let n=e.filter(e=>e.ativo&&!t.get(e.id)?.conferido),r=[`Plaqueta`,`Descricao`,`Local_Original`,`Revisao_Pendente`],i=n.map(e=>[String(e.plaqueta),e.descricao,e.localOriginal,e.revisaoPendente?`SIM`:`NAO`]),a=E.aoa_to_sheet([r,...i]);P(a,n.length,0),a[`!cols`]=[{wch:18},{wch:38},{wch:32},{wch:16}];let o=E.book_new();return E.book_append_sheet(o,a,`Pendencias_Faltas`),o}function R(e,t){return N(L(e,t),`pendencias`)}function z(e,n){let r=e.filter(e=>e.inventorySessionId===n&&(e.resultado===`nao_cadastrado`||e.resultado===`divergente`)),i=[`Plaqueta`,`Resultado`,`Local_Bipagem`,`Data_Hora`,`Observacao`],a=r.map(e=>[String(e.plaqueta),t[e.resultado],e.localBipagem,m(e.dataHora),e.observacao??``]),o=E.aoa_to_sheet([i,...a]);P(o,r.length,0),o[`!cols`]=[{wch:18},{wch:20},{wch:32},{wch:18},{wch:30}];let s=E.book_new();return E.book_append_sheet(s,o,`Sobras_Divergencias`),s}function B(e,t){return N(z(e,t),`sobras_divergencias`)}function V(e){let t=[`Plaqueta`,`Local_Original`,`Local_Destino`,`Data_Solicitacao`,`Status`,`Efetivada_Em`,`Observacao`],n=e.map(e=>[String(e.plaqueta),e.localOriginal,e.localDestino,m(e.dataHora),M[e.status],e.resolvedAt?m(e.resolvedAt):``,e.observacao??``]),r=E.aoa_to_sheet([t,...n]);P(r,e.length,0),r[`!cols`]=[{wch:18},{wch:34},{wch:34},{wch:18},{wch:12},{wch:18},{wch:40}];let i=E.book_new();return E.book_append_sheet(i,r,`Transferencias`),i}function H(e){return N(V(e),`transferencias`)}function U(e){let{room:t,assets:n,states:r,sessionId:i}=e,a=n.filter(e=>t.id?e.roomId===t.id:e.localOriginal===t.label).sort((e,t)=>e.plaqueta.localeCompare(t.plaqueta,`pt-BR`)),o=m(new Date().toISOString()),s=`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Laudo de Inventário - ${t.label}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #14211b; margin: 0; padding: 24px; font-size: 14px; line-height: 1.4; }
        header { border-bottom: 2px solid #0f5132; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
        h1 { font-size: 20px; color: #0f5132; margin: 0 0 4px 0; }
        .meta { font-size: 13px; color: #4d6057; }
        .box { background: #f7faf8; border: 1px solid #e0e8e3; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
        th, td { border: 1px solid #cdd9d2; padding: 8px 10px; text-align: left; }
        th { background: #eef3ef; color: #0f5132; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; }
        tr.pendente { background: #fdeaea; }
        tr.divergente { background: #fdf3dc; }
        tr.conferido { background: #eef7f1; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
        .badge-pendente { background: #fdeaea; color: #9b1c1c; }
        .badge-conferido { background: #dcefe3; color: #0f5132; }
        .badge-divergente { background: #fdf3dc; color: #92610a; }
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
          <div class="meta">Sistema de Inventário Patrimonial · Gerado em ${o}</div>
        </div>
        <div style="text-align: right;">
          <strong>Setor / Sala:</strong> ${t.label}<br>
          <strong>Código:</strong> ${t.codigo??`—`}
        </div>
      </header>

      <div class="box">
        <p><strong>Responsável pelo Setor:</strong> ${t.responsavel||`Não informado`}</p>
        <p><strong>Total de Bens no Cadastro:</strong> ${a.length}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Plaqueta</th>
            <th>Descrição do Bem</th>
            <th>Situação / Status</th>
            <th>Observações</th>
          </tr>
        </thead>
        <tbody>
  `;for(let e of a){let t=i?r.get(e.id):void 0,n=t?.conferido??!1,a=t?.divergente??!1,o=`pendente`,c=`PENDENTE`,l=`badge-pendente`;n&&(a?(o=`divergente`,c=`DIVERGENTE`,l=`badge-divergente`):(o=`conferido`,c=`CONFERIDO`,l=`badge-conferido`)),s+=`
      <tr class="${o}">
        <td style="font-family: monospace; font-weight: bold;">${e.plaqueta}</td>
        <td>${e.descricao||`Sem descrição`}</td>
        <td><span class="badge ${l}">${c}</span></td>
        <td>${e.observacao??``}</td>
      </tr>
    `}s+=`
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
  `;let c=window.open(``,`_blank`);c&&(c.document.write(s),c.document.close())}function W(e){let{responsavel:t,rooms:n,assets:r,states:i,sessionId:a}=e,o=n.filter(e=>e.responsavel?.trim().toLowerCase()===t.trim().toLowerCase()),s=`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Relatório por Responsável - ${t}</title>
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
          <div class="meta">Sistema de Inventário Patrimonial · Gerado em ${m(new Date().toISOString())}</div>
        </div>
        <div style="text-align: right;">
          <strong>Responsável:</strong> ${t}<br>
          <strong>Setores Vinculados:</strong> ${o.length}
        </div>
      </header>
  `;for(let e of o){let t=r.filter(t=>e.id?t.roomId===e.id:t.localOriginal===e.label).sort((e,t)=>e.plaqueta.localeCompare(t.plaqueta,`pt-BR`)),n=t.length,o=t.filter(e=>a&&i.get(e.id)?.conferido).length,c=n-o;s+=`
      <h2>Setor: ${e.label} (Total: ${n} bens · Conferidos: ${o} · Pendentes: ${c})</h2>
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
    `;for(let e of t){let t=a?i.get(e.id):void 0,n=t?.conferido??!1,r=t?.divergente??!1,o=`PENDENTE`,c=`badge-pendente`;n&&(r?(o=`DIVERGENTE`,c=`badge-divergente`):(o=`CONFERIDO`,c=`badge-conferido`)),s+=`
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${e.plaqueta}</td>
          <td>${e.descricao||`Sem descrição`}</td>
          <td><span class="badge ${c}">${o}</span></td>
          <td>${e.observacao??``}</td>
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
  `;let c=window.open(``,`_blank`);c&&(c.document.write(s),c.document.close())}var G=r();function K(){let{session:t}=g(),{assets:r,events:u,assetsById:p,states:E,roomList:D,summary:O}=d(),{push:k}=n(),M=o(()=>e(`lastBackupAt`),[]),N=o(()=>A(),[]),[P,F]=(0,j.useState)(``),[L,z]=(0,j.useState)(``),V=t?.id??null,K=(0,j.useMemo)(()=>{let e=new Set;for(let t of D)t.responsavel?.trim()&&e.add(t.responsavel.trim());return[...e].sort((e,t)=>e.localeCompare(t,`pt-BR`))},[D]);function q(e){k(`Arquivo ${e} gerado.`,`success`)}return(0,G.jsxs)(`div`,{className:`page`,children:[(0,G.jsx)(c,{eyebrow:`Dados`,title:`Exportar`,subtitle:`Backup completo e relatórios em CSV compatíveis com Excel pt-BR.`}),(0,G.jsxs)(`div`,{className:`stats-grid stats-grid--compact`,children:[(0,G.jsx)(l,{label:`Bens`,value:f(r.length),icon:`box`}),(0,G.jsx)(l,{label:`Leituras`,value:f(u.length),icon:`history`,tone:`info`}),(0,G.jsx)(l,{label:`Último backup`,value:M?m(M):`Nunca`,icon:`save`,tone:M?`success`:`warning`})]}),(0,G.jsxs)(`div`,{className:`export-grid`,children:[(0,G.jsxs)(a,{className:`export-card export-card--primary`,children:[(0,G.jsx)(s,{title:`Backup completo (JSON)`,subtitle:`Bens, leituras, sessões, configurações, lotes e solicitações.`,icon:`save`}),(0,G.jsx)(`p`,{children:`Guarde este arquivo antes de limpar a base ou trocar de dispositivo. O backup preserva todo o histórico de leituras, inclusive as repetidas.`}),(0,G.jsx)(i,{variant:`primary`,size:`lg`,icon:`download`,onClick:async()=>{q(await _())},children:`Baixar backup`}),(0,G.jsxs)(`p`,{className:`card__note`,children:[(0,G.jsx)(h,{name:`info`,size:14}),` Nunca afirmamos que o backup foi feito sem gerar o arquivo. Após o download, a data fica registrada.`]})]}),(0,G.jsxs)(a,{className:`export-card`,children:[(0,G.jsx)(s,{title:`Bens do cadastro`,subtitle:`CSV com revisão e origem`,icon:`box`}),(0,G.jsx)(i,{icon:`download`,disabled:r.length===0,onClick:()=>q(w(r)),children:`Exportar bens`})]}),(0,G.jsxs)(a,{className:`export-card`,children:[(0,G.jsx)(s,{title:`Itens novos (cadastro manual)`,subtitle:`Bens cadastrados em campo, fora da carga original`,icon:`plus`}),(0,G.jsx)(i,{icon:`download`,disabled:!r.some(e=>e.isManualRegister),onClick:()=>q(v(r,u,V)),children:`Exportar itens novos`})]}),(0,G.jsxs)(a,{className:`export-card`,children:[(0,G.jsx)(s,{title:`Leituras da sessão`,subtitle:`CSV do histórico da sessão ativa`,icon:`history`}),(0,G.jsx)(i,{icon:`download`,disabled:!V,onClick:()=>{V&&q(y(u,p,V))},children:`Exportar leituras`})]}),(0,G.jsxs)(a,{className:`export-card`,children:[(0,G.jsx)(s,{title:`Todas as leituras`,subtitle:`Histórico completo, todas as sessões`,icon:`history`}),(0,G.jsx)(i,{icon:`download`,disabled:u.length===0,onClick:()=>q(b(u,p)),children:`Exportar histórico`})]}),(0,G.jsxs)(a,{className:`export-card export-card--primary`,children:[(0,G.jsx)(s,{title:`Relatório Geral de Auditoria`,subtitle:`Todos os bens com status, sala encontrada e data na sessão ativa`,icon:`clipboard`}),(0,G.jsx)(`p`,{children:`Visão completa do inventário reunindo o cadastro base e o resultado da conferência atual.`}),(0,G.jsxs)(`div`,{className:`row-actions`,children:[(0,G.jsx)(i,{variant:`primary`,icon:`download`,disabled:!V||r.length===0,onClick:()=>{V&&q(S(r,E,u,V))},children:`Exportar CSV`}),(0,G.jsx)(i,{variant:`secondary`,icon:`download`,disabled:!V||r.length===0,onClick:()=>{V&&q(I(r,E,u,V))},children:`Exportar XLSX`})]})]}),(0,G.jsxs)(a,{className:`export-card`,children:[(0,G.jsx)(s,{title:`Pendências (Faltas)`,subtitle:`Bens sem leitura na sessão ativa`,icon:`clipboard`}),(0,G.jsxs)(`div`,{className:`row-actions`,children:[(0,G.jsx)(i,{icon:`download`,disabled:!V||O.pendentes===0,onClick:()=>q(C(r,E)),children:`CSV`}),(0,G.jsx)(i,{icon:`download`,disabled:!V||O.pendentes===0,onClick:()=>q(R(r,E)),children:`XLSX`})]})]}),(0,G.jsxs)(a,{className:`export-card`,children:[(0,G.jsx)(s,{title:`Sobras e Divergências`,subtitle:`Itens em sala divergente ou não cadastrados`,icon:`alert`}),(0,G.jsxs)(`div`,{className:`row-actions`,children:[(0,G.jsx)(i,{icon:`download`,disabled:!V,onClick:()=>q(x(u,V??``)),children:`CSV`}),(0,G.jsx)(i,{icon:`download`,disabled:!V,onClick:()=>q(B(u,V??``)),children:`XLSX`})]})]}),(0,G.jsxs)(a,{className:`export-card`,children:[(0,G.jsx)(s,{title:`Relatório PDF por Sala (Setor)`,subtitle:`Laudo detalhado com bens, status e bloco de assinatura`,icon:`building`}),(0,G.jsxs)(`div`,{className:`form-stack`,children:[(0,G.jsxs)(`select`,{value:P,onChange:e=>F(e.target.value),className:`field`,children:[(0,G.jsx)(`option`,{value:``,children:`Selecione uma sala...`}),D.map(e=>(0,G.jsxs)(`option`,{value:e.id,children:[e.label,` `,e.responsavel?`(Resp: ${e.responsavel})`:``]},e.id))]}),(0,G.jsx)(i,{variant:`primary`,icon:`download`,disabled:!P,onClick:()=>{let e=D.find(e=>e.id===P);e&&(U({room:e,assets:r,states:E,events:u,sessionId:V}),k(`Relatório PDF da sala ${e.label} aberto para impressão.`,`success`))},children:`Gerar PDF da sala`})]})]}),(0,G.jsxs)(a,{className:`export-card`,children:[(0,G.jsx)(s,{title:`Relatório PDF por Responsável`,subtitle:`Consolidado de todas as salas atribuídas ao responsável`,icon:`clipboard`}),(0,G.jsxs)(`div`,{className:`form-stack`,children:[(0,G.jsxs)(`select`,{value:L,onChange:e=>z(e.target.value),className:`field`,children:[(0,G.jsx)(`option`,{value:``,children:`Selecione um responsável...`}),K.map(e=>(0,G.jsx)(`option`,{value:e,children:e},e))]}),(0,G.jsx)(i,{variant:`primary`,icon:`download`,disabled:!L,onClick:()=>{L&&(W({responsavel:L,rooms:D,assets:r,states:E,events:u,sessionId:V}),k(`Relatório consolidado para ${L} aberto para impressão.`,`success`))},children:`Gerar PDF por responsável`})]})]}),(0,G.jsxs)(a,{className:`export-card`,children:[(0,G.jsx)(s,{title:`Solicitações de transferência`,subtitle:`Intenções e efetivações para atualizar o Senior`,icon:`refresh`}),(0,G.jsxs)(`div`,{className:`row-actions`,children:[(0,G.jsx)(i,{icon:`download`,disabled:!N||N.length===0,onClick:()=>{N&&q(T(N))},children:`Exportar CSV`}),(0,G.jsx)(i,{icon:`download`,disabled:!N||N.length===0,onClick:()=>{N&&q(H(N))},children:`Exportar XLSX`})]})]})]}),(0,G.jsxs)(a,{children:[(0,G.jsx)(s,{title:`Sobre os arquivos`,icon:`info`}),(0,G.jsxs)(`ul`,{className:`bullet-list`,children:[(0,G.jsx)(`li`,{children:`CSV em UTF-8 com BOM, separador ponto e vírgula e plaquetas entre aspas.`}),(0,G.jsx)(`li`,{children:`Exportar não altera nenhum dado local.`}),(0,G.jsx)(`li`,{children:`Pendências e divergências refletem sempre a sessão ativa.`}),(0,G.jsx)(`li`,{children:`O backup JSON contém a versão do schema para futuras migrações.`})]})]})]})}export{K as ExportPage};