# Projeto: Inventário Patrimonial

## Objetivo

Desenvolver um aplicativo auxiliar de inventário patrimonial para
Android e computador, usando a planilha `Patrimonio App (2).xlsx` como
referência inicial. O sistema oficial continua sendo o Senior. O
aplicativo não deve alterar o Senior nem assumir o papel do cadastro
patrimonial oficial.

## Decisões já tomadas

-   Funcionamento híbrido: operar sem internet e sincronizar quando
    houver conexão.
-   Leitor Netum: funciona como teclado (HID); a leitura envia o código
    ao campo de entrada.
-   Fontes de atualização do cadastro: importar CSV exportado do Senior
    e importar/sincronizar dados do Google Sheets.
-   Operação prevista: um operador por vez, com aproximadamente 10--20
    mil bens.
-   Interface: PWA instalável no Android e utilizável no computador.
-   O histórico de leituras deve ser preservado entre inventários.

## Arquivo de referência analisado

Abas encontradas: 1. `Conferencia` 2. `Patrimonio` 3. `Config` 4.
`ITENS_NOVOS` 5. `❌ PENDENCIAS_FINAIS` 6. `RESUMO_SALAS`

Estrutura observada:

### Patrimonio

Colunas: - `Plaqueta` - `Descricao` - `Local_Original` -
`ID_Patrimonio` - `Status_Cadastro` - `Ação Sapiens` - `Status` -
`Ultima_Conferencia` - `Status_Geral` - coluna de progresso (fórmula) -
`Alerta de Transferência`

Amostra/contagem do arquivo: - 19.037 linhas de dados na área da aba. -
17.038 células com plaqueta preenchida. - 17.022 valores de plaqueta
distintos. - 16 valores de plaqueta aparecem duplicados (cada um duas
vezes). - 11.475 registros com status `✅ CONFERIDO`. - 5.563 registros
com status `⏳ PENDENTE`. - 1.999 linhas sem plaqueta, aparentemente
linhas vazias/auxiliares com fórmulas; não importar como bens. -
`ID_Patrimonio` está vazio nos registros observados.

### Conferencia

Colunas: - `ID` - `Plaqueta` - `Data_Hora` - `Local_Bipagem` -
`Status_Cadastro` - `Ação Sapiens`

Há 13.635 linhas com leitura registrada. Existem leituras repetidas da
mesma plaqueta; elas são eventos históricos e não devem ser descartadas
automaticamente.

### Config

Colunas `ID` e `Sala_Atual`. A sala atual deve ser tratada como
configuração operacional editável, não como dado fixo no código.

### ITENS_NOVOS

A exportação XLSX contém apenas cabeçalhos e fórmulas do Google Sheets
não preservadas como resultados confiáveis. Recriar a regra no
aplicativo com base nos eventos de leitura classificados como não
cadastrados, após confirmar a regra.

### PENDENCIAS_FINAIS

Colunas `Plaqueta`, `Descricao`, `Local_Original`. É uma visão derivada
dos bens pendentes; não deve ser tratada como cadastro independente.

### RESUMO_SALAS

Colunas principais: `Sala`, `Total de Itens`, `Conferidos`, `Pendentes`,
`% Concluído`, `Status Final`. É uma visão calculada, não uma tabela de
origem.

## Arquitetura recomendada

Começar com: - React + TypeScript + Vite. - PWA instalável. - IndexedDB
com Dexie para persistência local. - Service Worker para disponibilizar
a aplicação offline. - Importação/exportação CSV e XLSX. - Testes
automatizados para regras de conferência e importação.

Não adicionar servidor ou PostgreSQL na primeira versão. Preparar uma
camada de repositório e uma fila de sincronização para permitir
adicionar backend posteriormente, se houver necessidade de usar mais de
um dispositivo.

## Modelo de dados proposto

### Asset (bem patrimonial)

-   id interno (UUID)
-   plaqueta (string, preservar zeros à esquerda)
-   descricao
-   localOriginal
-   idPatrimonio (opcional)
-   statusCadastro
-   acaoSapiens
-   statusConferencia calculado/gerido pelo app
-   ultimaConferencia
-   statusGeral
-   alertaTransferencia
-   source (Senior CSV, Google Sheets ou importação XLSX)
-   importBatchId
-   createdAt / updatedAt

### InventoryEvent (evento de leitura)

-   id (UUID)
-   plaqueta lida como string
-   assetId (opcional quando não localizado)
-   dataHora
-   localBipagem
-   resultado (encontrado, não cadastrado, duplicado, divergente)
-   acaoSapiens / observação
-   inventorySessionId
-   deviceId local
-   syncStatus (pendente, sincronizado, erro)

Não apagar eventos duplicados: cada leitura deve permanecer no
histórico. A interface pode alertar sobre repetição sem bloquear o
registro, conforme regra configurável.

### AppSettings

-   salaAtual
-   nome do inventário/sessão
-   opções de alerta e comportamento do leitor
-   última importação e origem dos dados

### ImportBatch

-   id
-   origem (Senior CSV, Google Sheets, XLSX)
-   dataHora
-   quantidade importada
-   quantidade ignorada
-   duplicidades encontradas
-   resumo de erros

## Regras fundamentais

1.  Plaquetas são texto, nunca número; preservar zeros à esquerda.
2.  Antes de importar, mostrar prévia, contagem, duplicidades e erros.
3.  Não sobrescrever o cadastro ativo sem confirmação e backup.
4.  Não apagar histórico de leituras ao atualizar o cadastro.
5.  Tratar plaquetas duplicadas no cadastro como exceção que exige
    revisão; não escolher um bem arbitrariamente.
6.  Uma leitura deve gravar data/hora, plaqueta e sala selecionada.
7.  Se a plaqueta não existir, registrar evento como não cadastrado e
    permitir observação.
8.  Se o bem existir mas a sala de leitura diferir do local original,
    sinalizar divergência e permitir registrar solicitação de
    transferência. Não alterar o local oficial automaticamente.
9.  A situação "conferido" deve ser calculada conforme a sessão de
    inventário ativa, com possibilidade de consultar inventários
    anteriores.
10. Não confundir leitura repetida com duplicidade de cadastro.
11. O sistema deve funcionar offline e nunca perder leituras por falta
    de conexão.
12. Toda sincronização futura deve ser idempotente, evitando duplicar
    eventos após reenvio.

## Importação de fontes

### CSV do Senior

-   Mapear colunas por seleção do usuário.
-   Permitir escolher delimitador, codificação e linha de cabeçalho.
-   Detectar automaticamente a coluna de plaqueta, mas pedir
    confirmação.
-   Preservar códigos como texto e zeros à esquerda.
-   Fazer validação e prévia antes de aplicar.

### Google Sheets

-   Planejar integração pela Google Sheets API com OAuth, somente após a
    primeira versão CSV estar funcionando.
-   Começar com importação controlada e prévia.
-   Não implementar sincronização bidirecional automática na primeira
    versão.
-   Não gravar alterações no Senior.
-   Definir claramente qual fonte vence em caso de conflito.

### XLSX de referência

-   Criar importador de migração para ler as abas e os valores
    existentes.
-   Não tentar executar fórmulas do Google Sheets no navegador.
-   Recalcular no aplicativo as visões de pendências e resumo por sala.

## Telas da primeira versão (MVP)

1.  Painel: total de bens válidos, conferidos, pendentes, divergentes e
    não cadastrados.
2.  Leitura: campo sempre focado, sala atual visível, resultado grande e
    sonoro/visual, leitura seguinte rápida.
3.  Consulta: buscar por plaqueta, descrição e local.
4.  Pendências: listar bens ainda não conferidos na sessão.
5.  Divergências: bens encontrados em local diferente do original.
6.  Itens não cadastrados: leituras sem correspondência.
7.  Salas: progresso por local.
8.  Importar dados: CSV primeiro; XLSX de migração; Google Sheets numa
    etapa posterior.
9.  Exportar: eventos, pendências, divergências e resumo por sala.
10. Configurações: sala atual, sessão ativa e preferências do scanner.

## Requisitos do scanner Netum

-   Tratar o leitor como teclado HID.
-   Campo de leitura com foco automático.
-   Aceitar Enter ou Tab como sufixo configurável.
-   Normalizar espaços acidentais, mas não remover zeros à esquerda.
-   Impedir que atalhos ou navegação roubem o foco durante a leitura.
-   Ter botão de leitura manual para testes.
-   Mostrar imediatamente o resultado e voltar o foco ao campo.
-   Permitir configurar debounce/tempo de repetição sem descartar
    leituras legítimas.

## Segurança e confiabilidade

-   Backup antes de cada importação.
-   Exportação de backup completo do banco local.
-   Indicador claro de leituras ainda não sincronizadas.
-   Nunca afirmar que sincronizou sem confirmação.
-   Tratar falhas de sincronização com repetição segura.
-   Não armazenar credenciais Google em texto puro.
-   Registrar logs técnicos sem expor dados desnecessários.

## Plano de desenvolvimento

### Fase 1 --- Fundação

Criar projeto, navegação, tema responsivo, PWA, banco IndexedDB/Dexie,
testes e importador XLSX/CSV com prévia.

### Fase 2 --- Conferência

Implementar sessão de inventário, sala atual, scanner teclado, eventos,
duplicidade de leitura, divergências e itens não cadastrados.

### Fase 3 --- Gestão

Painel, pendências, resumo por sala, pesquisa, relatórios e exportações.

### Fase 4 --- Integração Google

OAuth e importação controlada do Google Sheets. Só depois avaliar
sincronização de dados e conflitos.

### Fase 5 --- Sincronização remota

Somente se necessário para múltiplos dispositivos: API, banco remoto e
fila de sincronização offline-first.

## Instrução inicial ao OpenCode

Antes de programar: 1. Examine o arquivo XLSX de referência e confirme
as abas, cabeçalhos e tipos de dados. 2. Crie
`docs/ANALISE_DA_PLANILHA.md` com o mapeamento real das colunas. 3. Crie
`docs/ARQUITETURA.md` com decisões e riscos. 4. Crie
`docs/REGRAS_DE_NEGOCIO.md` com as regras acima. 5. Proponha a estrutura
de pastas e a sequência de implementação. 6. Não faça alterações
destrutivas nem invente regras para campos ambíguos. 7. Comece pela Fase
1, entregando uma aplicação executável e testes. 8. Ao final, explique
como executar no Windows e como instalar o PWA no Android.

Trabalhe em etapas pequenas. Após cada etapa, execute testes e informe
arquivos criados, decisões tomadas e pendências. Não implemente
integração Google nem sincronização remota antes de a importação local e
a conferência estarem testadas.
