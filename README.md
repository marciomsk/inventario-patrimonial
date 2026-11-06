# Inventário Patrimonial

PWA em português para conferência de bens patrimoniais, com funcionamento
offline. Lê a planilha `Patrimonio App (2).xlsx` como referência, mas
**nunca altera o arquivo original** e **nunca escreve no Senior**.

- Interface: React + TypeScript + Vite
- Dados locais: IndexedDB via Dexie
- Offline: Service Worker (Workbox) com precache do app
- Instalável no Android e utilizável no desktop
- Sem backend, sem PostgreSQL e sem Google Sheets nesta versão

## Requisitos

- Node.js 20.19+ ou 22.12+ (testado com Node 26)
- Navegador moderno (Chrome, Edge, Firefox ou Safari recentes)
- Windows, macOS ou Linux

No Windows com PowerShell, `npm` pode ser bloqueado pela política de
execução. Use `npm.cmd`:

```powershell
& "C:\Program Files\nodejs\npm.cmd" install
```

## Rodar em desenvolvimento

```powershell
npm install
npm run dev
```

Abra o endereço mostrado no terminal (por padrão `http://localhost:5173`).
O servidor de desenvolvimento não registra o Service Worker; para testar o
modo offline e a instalação, gere o build.

## Build e prévia local

```powershell
npm run build
npm run preview
```

A prévia atende em `http://localhost:4173`. Em `localhost` o navegador
considera o contexto seguro e permite instalar o PWA.

## Verificações

```powershell
npm run typecheck   # TypeScript (app + testes)
npm run test        # Vitest (39 testes, inclui a planilha real quando presente)
npm run lint        # ESLint
npm run build       # tsc + Vite + PWA
```

O teste `src/services/import/realWorkbook.test.ts` é ignorado
automaticamente quando `Patrimonio App (2).xlsx` não está na raiz.

## Primeiro uso

1. Abra **Configurações** e confirme a **sala atual** (a planilha sugere
   `0589 - PRAIA PARK - CASCATAS`).
2. Abra **Importar** e selecione a planilha `.xlsx`.
3. Revise a **prévia**: bens, leituras, ignorados, duplicidades, placas de
   sala, leituras não cadastradas, divergências e datas futuras.
4. Só então clique em **Aplicar importação**. A gravação é transacional:
   ou entra tudo, ou nada é gravado.
5. A importação cria a sessão ativa “Inventário importado” e mantém o
   histórico de leituras, inclusive as repetidas.

A importação inicial exige uma base vazia. Para reimportar, baixe o
**backup completo (JSON)**, limpe a base local e importe novamente. A
atualização incremental do cadastro fica para uma etapa futura, para não
arriscar o histórico de leituras.

## Operação

- **Leitura**: bipe ou digite a plaqueta e confirme. O campo volta a
  receber foco. O leitor funciona como teclado (sufixo Enter ou Tab).
- **Conferido**: bem com leitura `encontrado` ou `divergente` na sessão
  ativa. O status é sempre recalculado a partir dos eventos; não é copiado
  da coluna `Status` da planilha.
- **Datas**: as datas de 2021 a 2027 vêm da planilha e são preservadas. A
  sessão importada mostra a data da importação como início; leituras
  posteriores ao relógio do aparelho recebem o aviso “data futura”.
- **Divergência**: a **última** leitura do bem foi feita em sala
  diferente do `Local_Original`. O app registra a ocorrência e permite
  solicitar ou **efetivar** a transferência. Efetivar atualiza o local
  apenas no cadastro local do app; o histórico de leituras é preservado e
  o Senior continua intacto.
- **Solicitações de transferência**: intenções e efetivações ficam
  registradas e podem ser exportadas em CSV ou XLSX para atualizar o
  Senior.
- **Duplicidade de cadastro**: o app nunca escolhe um bem sozinho; mostra
  os candidatos e exige seleção manual.
- **Não cadastrados**: leituras sem bem correspondente. Nenhum bem é
  criado automaticamente.
- **Pendências**: bens ativos sem leitura na sessão ativa.
- **Salas**: progresso por sala, com `CARGA INICIAL` identificada como
  local legado.
- **Backup**: em **Exportar**, baixe o JSON completo antes de limpar a
  base ou trocar de dispositivo. Há também exportações CSV em UTF-8 com
  BOM, separador `;`, compatíveis com Excel pt-BR.

Leituras repetidas são permitidas e preservadas. O app apenas alerta
quando a mesma plaqueta é lida em um intervalo muito curto (padrão 1,5 s),
o que costuma indicar disparo duplo do leitor. Nada é descartado sem
confirmação do operador.

## Instalar no Android

A instalação de PWA exige **HTTPS** (ou `localhost`). Um endereço
`http://192.168.x.x` na rede local não é considerado contexto seguro e não
permite instalar nem usar o Service Worker.

Opções:

1. **Publicar o build em um host HTTPS estático** (Netlify, Vercel, GitHub
   Pages, Azure Static Web Apps, servidor interno com TLS). Envie o
   conteúdo de `dist/`. O app usa caminhos relativos e `HashRouter`, então
   funciona também em subpastas.
2. **Testar no próprio computador** com `npm run preview` e acessar
   `http://localhost:4173`.
3. **Acessar do Android via HTTPS** com um túnel ou proxy TLS para o
   servidor de prévia.

No Android:

1. Abra o endereço HTTPS no Chrome.
2. Aguarde o carregamento completo (o Service Worker é instalado).
3. Menu **⋮** → **Instalar aplicativo** ou **Adicionar à tela inicial**.
4. Abra pelo ícone. Depois da primeira carga, o app abre offline.

No desktop, o Chrome/Edge mostra o ícone de instalação na barra de
endereço.

## Onde ficam os dados

Tudo fica no IndexedDB **daquele navegador e daquele dispositivo**. Não há
sincronização nesta versão. Limpar os dados do site, usar navegação
privada ou trocar de aparelho apaga o acesso aos dados locais — por isso o
backup é obrigatório antes de qualquer limpeza.

## Estrutura do projeto

```
docs/                 análise da planilha, arquitetura e regras de negócio
public/icons/         ícones do PWA
src/
  app/                providers, rotas e shell responsivo
  components/         componentes visuais reutilizáveis
  db/                 schema Dexie e repositórios
  domain/             tipos e regras puras (plaqueta, leitura, status)
  features/           páginas por domínio
  services/           importação XLSX, exportação, backup
  styles/             design tokens e CSS global
  test/               setup e fixture da planilha
```

Rotas: Painel, Leitura, Consulta, Pendências, Divergências, Não
cadastrados, Salas, Importar, Exportar e Configurações. As páginas são
carregadas sob demanda; o código de leitura de planilhas só é baixado ao
abrir **Importar**.

## Documentação

- [`docs/ANALISE_DA_PLANILHA.md`](docs/ANALISE_DA_PLANILHA.md) — fatos
  verificados na planilha, inconsistências e decisões de tratamento.
- [`docs/REGRAS_DE_NEGOCIO.md`](docs/REGRAS_DE_NEGOCIO.md) — regras e
  critérios de aceitação.
- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — decisões, modelo de dados,
  fluxo de importação e fases.
- [`Projeto_Inventario_Patrimonial_OpenCode.md`](Projeto_Inventario_Patrimonial_OpenCode.md)
  — especificação do produto.

## Limites conhecidos desta versão

- Um dispositivo por vez; sem sincronização ou multiusuário.
- Sem backend, OAuth Google ou integração com o Senior.
- Reimportação exige backup e limpeza da base; atualização incremental
  ainda não implementada.
- Fórmulas da planilha não são executadas; apenas valores existentes são
  lidos.
- A planilha e o Senior permanecem somente leitura em todo o fluxo. O
  cadastro local do app pode ser atualizado apenas pela ação explícita
  “Efetivar transferência”.
