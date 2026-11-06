# Arquitetura — Inventário Patrimonial

## Objetivo

Aplicativo PWA offline-first para conferência de bens patrimoniais, usado
por um operador por vez, com 10–20 mil bens. O Senior continua sendo o
sistema oficial; o app não escreve no Senior.

## Decisões de arquitetura

| Decisão | Escolha | Motivo |
|---|---|---|
| Interface | React + TypeScript + Vite | SPA responsiva, build simples, PWA |
| Roteamento | React Router (HashRouter) | Funciona offline e em hospedagem estática sem rewrite |
| Persistência | IndexedDB via Dexie | Volume, consultas indexadas, transações |
| PWA | `vite-plugin-pwa` (Workbox) | Cache do app shell e instalação no Android |
| Planilhas | SheetJS (`xlsx`) | Leitura de XLSX com múltiplas abas e datas |
| Validação | Schemas próprios + Zod na importação | Evitar dados inválidos sem inflar o bundle |
| Testes | Vitest + `fake-indexeddb` | Regras puras e repositórios sem navegador |
| Estilo | CSS próprio com design tokens | Sem dependência de UI kit; controle do layout de leitura |
| Estado | Dexie `useLiveQuery` + estado local | Dados reativos sem servidor de estado |
| Backend | Nenhum nesta versão | Requisito: funcionar offline e não depender de servidor |

## Estrutura de pastas

```
.
├── docs/                     # análise, arquitetura e regras
├── public/
│   └── icons/                # ícones do PWA
├── src/
│   ├── app/                  # roteador, providers, navegação
│   ├── components/           # componentes visuais reutilizáveis
│   ├── db/                   # schema Dexie, repositórios e backup
│   ├── domain/               # tipos e regras puras (sem React/Dexie)
│   ├── features/             # páginas por domínio
│   │   ├── dashboard/
│   │   ├── scan/
│   │   ├── assets/
│   │   ├── pendings/
│   │   ├── divergences/
│   │   ├── unknown/
│   │   ├── rooms/
│   │   ├── import/
│   │   ├── export/
│   │   └── settings/
│   ├── services/             # importação, exportação, backup, dispositivo
│   ├── styles/               # tokens e CSS global
│   ├── test/                 # setup e fixtures
│   └── main.tsx
├── AGENTS.md
├── index.html
├── vite.config.ts
└── package.json
```

Regra de dependência: `domain` não importa React, Dexie nem `services`.
`db` pode importar `domain`. `features` importa `db`, `domain` e
`components`. `services` importa `domain` e pode usar `db` apenas na
camada de aplicação da importação.

## Modelo de dados

### `assets` (bem patrimonial)

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID | Chave interna |
| `plaqueta` | texto | Valor original, zeros e caixa preservados |
| `plaquetaKey` | texto | `plaqueta` normalizada (trim, espaços, maiúsculas) para busca |
| `descricao` | texto | Pode ser vazia |
| `localOriginal` | texto | Sala de origem no cadastro |
| `localCodigo` | texto \| null | Prefixo de 4 dígitos, quando existir |
| `localNome` | texto | Nome da sala sem o código |
| `idPatrimonio` | texto \| null | Vazio na base atual |
| `statusCadastro` | texto | Legado (`✅ OK`) |
| `legacyStatus` | `conferido`/`pendente`/`desconhecido` | Status da planilha, só para auditoria |
| `legacyUltimaConferencia` | ISO \| null | Data legada (não confiável como “última”) |
| `legacyAcaoSapiens` | texto | Legado, não usado para regra |
| `legacyAlerta` | texto | Legado, não usado para regra |
| `source` | `xlsx-legado`/`csv-senior`/`google-sheets`/`manual` | Origem |
| `importBatchId` | UUID \| null | Lote que trouxe o registro |
| `revisaoPendente` | boolean | Duplicidade ou inconsistência |
| `revisaoMotivos` | array | `plaqueta_duplicada`, `placa_de_sala`, `descricao_ausente`, `local_ausente`, `plaqueta_atipica` |
| `createdAt` / `updatedAt` | ISO | Auditoria |

Não existe índice único em `plaquetaKey`: a base real tem duplicidades.
A busca retorna uma lista de candidatos.

### `events` (leitura)

| Campo | Tipo | Observação |
|---|---|---|
| `id` | UUID | Gerado localmente; idempotência futura |
| `plaqueta` / `plaquetaKey` | texto | Valor lido e chave normalizada |
| `assetId` | UUID \| null | Nulo quando não cadastrado ou duplicado sem resolução |
| `candidatosAssetIds` | array | Candidatos quando há duplicidade de cadastro |
| `dataHora` | ISO | Momento da leitura no dispositivo |
| `localBipagem` | texto | Sala selecionada no momento |
| `resultado` | `encontrado`/`divergente`/`nao_cadastrado`/`duplicado_cadastro`/`invalido` | Calculado na leitura |
| `observacao` | texto \| null | Texto do operador |
| `acaoSapiens` | texto \| null | Legado ou ação pretendida |
| `inventorySessionId` | UUID | Sessão ativa |
| `deviceId` | texto | Identificador local |
| `source` | `scanner`/`manual`/`import_xlsx` | Origem |
| `legacyEventId` | texto \| null | ID da planilha, para rastreio |
| `syncStatus` | `pendente`/`sincronizado`/`erro`/`nao_aplicavel` | Preparação para backend |
| `resolvidoManualmente` | boolean | Vinculação manual de duplicidade |
| `createdAt` | ISO | Auditoria |

Eventos nunca são apagados pela operação normal. Releituras são eventos
novos.

### `sessions`

`id`, `nome`, `status` (`ativa`/`encerrada`), `startedAt`, `endedAt`,
`source`, `importBatchId`, `createdAt`, `legacyFirstReadAt`. Só uma sessão
ativa; a troca é transacional. Em sessões importadas, `startedAt` é o
momento da importação e `legacyFirstReadAt` guarda a leitura mais antiga
da planilha — nunca o contrário.

### `settings`

Tabela chave/valor tipada: `salaAtual`, `activeSessionId`, `deviceId`,
`scanner` (sufixo, debounce, janela de repetição, som, foco),
`lastImportBatchId`, `lastBackupAt`.

### `importBatches`

`id`, `origem`, `fileName`, `startedAt`, `finishedAt`, `status`,
`totalRows`, `importedAssets`, `importedEvents`, `ignored`,
`duplicates`, `warnings` (amostra limitada), `errorMessage`.

### `transferRequests`

`id`, `assetId`, `plaqueta`, `localOriginal`, `localDestino`, `eventId`,
`dataHora`, `status` (`pendente`/`enviada`/`cancelada`/`efetivada`),
`observacao`, `resolvedAt`.

- `pendente`/`enviada`: intenção registrada; o local oficial não muda.
- `efetivada`: ação explícita do operador que atualiza `localOriginal` do
  bem **no banco local** para `localDestino`, em transação única. Os
  eventos não são alterados; `resolvedAt` registra o momento.
- A exportação CSV/XLSX serve para atualizar o Senior, que continua sendo
  a fonte oficial.

### `syncQueue`

Fila preparada para o futuro (`entity`, `entityId`, `operation`,
`payload`, `status`, `attempts`, `lastError`). Nesta versão não há
consumidor remoto; os eventos ficam com `syncStatus = nao_aplicavel`
quando não há sincronização configurada.

## Regras de derivação

- **Conferido na sessão**: existe evento da sessão com `assetId` do bem e
  `resultado` `encontrado` ou `divergente`.
- **Divergente na sessão**: a **última** leitura de conferência do bem foi
  feita em sala diferente do `localOriginal` atual. Leituras divergentes
  antigas permanecem no histórico, mas não mantêm o status. Efetivar a
  transferência muda o `localOriginal` local e, portanto, remove a
  divergência atual sem tocar nos eventos.
- **Pendente**: bem ativo do cadastro sem evento de conferência na sessão.
- **Não cadastrado**: evento sem `assetId` e sem candidatos.
- **Duplicidade de leitura**: mais de um evento da mesma plaqueta na
  sessão. Não altera o status; a interface alerta e permite continuar.
- **Duplicidade de cadastro**: mais de um `asset` com a mesma
  `plaquetaKey`. A leitura não escolhe; exige seleção do operador.
- **Progresso por sala**: agrupa por `localOriginal`; bens sem local vão
  para “Sem local”. `CARGA INICIAL` é exibida como local legado.

Essas regras são recalculadas no cliente. Nenhum total é persistido como
verdade, evitando divergência entre contadores e eventos.

## Fluxo de importação legada

1. Usuário seleciona o arquivo; o app lê em memória (nunca altera o
   arquivo).
2. Validação das abas e cabeçalhos obrigatórios.
3. Prévia com:
   - bens válidos, ignorados, duplicidades, placas de sala, plaquetas
     atípicas, campos vazios;
   - eventos válidos, ignorados (sem data/local), IDs duplicados, datas
     futuras, leituras não cadastradas, divergências calculadas;
   - configuração `Sala_Atual`.
4. Confirmação explícita. Se já houver dados, é obrigatório baixar backup
   e confirmar a substituição (a atualização incremental de cadastro será
   implementada em etapa seguinte).
5. Transação única no Dexie:
   - cria `ImportBatch`;
   - cria sessão “Inventário importado” com `startedAt` = importação e
     `legacyFirstReadAt` = leitura mais antiga da planilha;
   - insere bens com IDs novos;
   - insere eventos vinculando por `plaquetaKey` (duplicidades ficam sem
     vínculo e com candidatos);
   - grava configurações e ativa a sessão importada.
6. Relatório final com contagens e link para o painel.

Atualizações futuras do cadastro devem preservar eventos: o desenho é
marcar bens ausentes como inativos e atualizar por `plaquetaKey`, em vez
de apagar a tabela.

## Offline e PWA

- `manifest` com nome, ícones 192/512/maskable, `display: standalone`.
- Service worker gerado no build; precache do app shell e assets locais.
- Nenhuma fonte, ícone ou script externo em runtime.
- Leituras gravadas no IndexedDB antes de qualquer tentativa de sync.
- Indicador de “sem conexão” é informativo; a operação não depende dela.

## Backup e recuperação

- Exportação JSON completa (bens, eventos, sessões, configurações,
  lotes, solicitações) com versão de schema.
- Exportação CSV de bens, eventos, pendências, divergências e resumo por
  sala.
- Exportação de solicitações de transferência em CSV e XLSX (plaqueta como
  texto), com origem, destino, status e data de efetivação.
- Antes de substituir a base, o usuário deve baixar o backup; a data do
  último backup fica registrada.
- Limpeza de dados exige confirmação textual e backup.

## Testes

- Unitários de domínio: normalização de plaqueta, classificação,
  comparação de sala, decisão de leitura, resumo de sessão.
- Unitários de importação: mapeamento de cabeçalhos, linhas ignoradas,
  duplicidades, eventos sem data, vínculo por plaqueta.
- Integração com `fake-indexeddb`: aplicar prévia, sessão ativa única,
  não apagar eventos, efetivar transferência em lote com rollback.
- Datas: serial do Excel, texto brasileiro e ISO, sem deslocar o dia.
- Exportação: plaqueta como texto em CSV e XLSX.
- Teste de fumaça do build PWA (`npm run build`).

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Base com duplicidades e placas de sala | Prévia + revisão, sem descarte silencioso |
| Datas legadas incoerentes | Importar e sinalizar; última leitura vem dos eventos |
| Volume de 17 mil bens no navegador | Índices Dexie e agregação no cliente; medir performance |
| Perda de dados no navegador | Backup JSON + exportações; sem “limpar” sem confirmação |
| Atualização de cadastro apagar histórico | Atualização por chave com bens inativos, nunca `clear()` |
| Foco roubado durante leitura | Campo de leitura com foco automático e tratamento de Enter/Tab |
| Sync futuro duplicar eventos | UUID local + idempotência por `id`/`clientEventId` |

## Fora de escopo nesta versão

- Backend/PostgreSQL, multiusuário, OAuth Google, escrita no Senior.
- Sincronização bidirecional com Google Sheets.
- Execução de fórmulas da planilha no navegador.
- Assinatura digital ou relatórios PDF avançados.

## Fases

1. **Fundação** (esta entrega): projeto, PWA, schema, domínio, importação
   XLSX com prévia, painel, leitura, consultas e exportações básicas.
2. **Conferência completa**: resolução de duplicidades, solicitações de
   transferência, filtros e atalhos de operação.
3. **Gestão**: relatórios, atualização incremental do cadastro, CSV Senior
   com mapeamento de colunas e codificação.
4. **Integração Google**: OAuth e importação controlada.
5. **Sincronização remota**: somente se houver mais de um dispositivo.
