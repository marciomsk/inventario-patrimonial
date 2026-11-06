# Análise da planilha de referência

Arquivo: `Patrimonio App (2).xlsx`
Tamanho: 2.013.050 bytes
SHA-256: `2A497AE12FD36B719F9C8A98248F6B4CC68792AF0317C65840BB8F79F5563013`
Análise feita em 04/11/2026, somente leitura. A planilha original não foi alterada.

## Método

- Leitura direta do XLSX (ZIP + XML) com SheetJS, preservando o texto das plaquetas.
- Datas lidas como datas reais (`Date`), não como texto formatado.
- Comparações normalizadas apenas para diagnóstico (trim, espaços duplicados, NBSP). O valor original é preservado no banco.
- Fórmulas não são executadas. Foram usados apenas valores existentes no arquivo.

## Estrutura do arquivo

| # | Aba | Linhas de dados | Papel |
|---|-----|-----------------|-------|
| 1 | `Conferencia` | 13.635 | Histórico de leituras |
| 2 | `Patrimonio` | 17.038 | Cadastro de bens (fonte principal) |
| 3 | `Config` | 1 | Configuração operacional |
| 4 | `ITENS_NOVOS` | 0 | Apenas cabeçalhos; visão derivada |
| 5 | `❌ PENDENCIAS_FINAIS` | 5.563 | Visão derivada de pendentes |
| 6 | `RESUMO_SALAS` | 646 | Visão calculada por sala |

## Aba `Patrimonio`

Colunas: `Plaqueta`, `Descricao`, `Local_Original`, `ID_Patrimonio`,
`Status_Cadastro`, `Ação Sapiens`, `Status`, `Ultima_Conferencia`,
`Status_Geral`, `📊 Progresso: 11475 de 17038`, `Alerta de Transferência`.

Fatos verificados:

- 17.038 registros com plaqueta; 17.022 plaquetas distintas.
- Todas as plaquetas são texto (nenhuma célula numérica).
- Formatos: 669 com 4 dígitos, 16.330 com 6 dígitos, 39 no padrão
  `AAA000000-000` (`MOV`, `MEQ`, `INF`, `VEI`, `TER`, `CON`, `SOF`).
- 16.999 são apenas dígitos; 39 têm letras/hífen.
- 16.999 começam com zero; zeros à esquerda já estão preservados na origem.
- Nenhuma plaqueta vazia nas linhas consideradas.
- 16 grupos de plaquetas duplicadas (32 linhas):
  - 3 grupos com `Local_Original` divergente;
  - 3 grupos com `Descricao` divergente (inclui `PÁS` x `PAS`);
  - 10 grupos são duplicidades aparentes (mesma descrição e local).
- `Status_Cadastro` é sempre `✅ OK`.
- `ID_Patrimonio` está vazio em 100% das linhas.
- `Status`: 11.475 `✅ CONFERIDO`, 5.563 `⏳ PENDENTE`.
- `Status_Geral`: 11.475 `FINALIZADO`, 5.563 `AGUARDANDO`.
- `Ação Sapiens`: 11.189 `✅ JÁ ESTAVA NO LOCAL`, 5.563
  `⏳ AGUARDANDO CONFERÊNCIA`, 286 `🔄 SOLICITAR TRANSFERÊNCIA`.
- `Alerta de Transferência`: 11.189 `✅ CONFERIDO NO LOCAL`, 5.563 vazio,
  286 `🚨 LOCAL DIVERGENTE`.
- `Status`, `Ultima_Conferencia` e `Status_Geral` são coerentes entre si:
  todo conferido tem data, todo pendente não tem, e não há divergência
  entre `Status` e `Status_Geral`.
- 6 registros sem `Descricao`; 1 sem `Local_Original`.
- 647 valores distintos de `Local_Original`; 646 aparecem em
  `RESUMO_SALAS` (o que falta é o registro sem local).
- 669 registros têm plaqueta de 4 dígitos; em 668 deles a descrição começa
  com o próprio código + `" - "`, indicando **placa de sala**, não bem
  físico. Não devem ser descartados automaticamente, mas exigem revisão.
- `Ultima_Conferencia` **não é a última leitura**: em 11.359 dos 11.475
  conferidos ela coincide com a primeira leitura da plaqueta; em 115
  coincide com a última; em 1 não coincide com nenhuma. O app deve
  recalcular a última leitura a partir dos eventos.
- `Alerta de Transferência` também não é confiável: existem **503 bens**
  com pelo menos uma leitura em sala diferente do local original. Desses,
  apenas 284 estão marcados como divergentes e 219 não estão. Além disso,
  285 bens (286 linhas) estão marcados como `🚨 LOCAL DIVERGENTE`, mas 1
  deles não tem nenhuma leitura em outra sala. O app recalcula a
  divergência comparando a sala da leitura com `Local_Original`.
- Pela regra da **última leitura**, 322 bens estão divergentes no estado
  atual da base; 178 tiveram uma leitura divergente no passado e depois
  foram lidos na sala correta. O histórico dos 500 é preservado.

## Aba `Conferencia`

Colunas: `ID`, `Plaqueta`, `Data_Hora`, `Local_Bipagem`,
`Status_Cadastro`, `Ação Sapiens`.

Fatos verificados:

- 13.635 linhas de dados; 98 são inválidas (96 sem data e sem sala, 2 sem
  sala), restando **13.537 leituras válidas** com 12.537 plaquetas distintas.
- 1.000 linhas são leituras repetidas além da primeira: 908 plaquetas com
  2+ leituras, 71 com 3+, 13 com 4+, 2 com 5+ e uma com 10 leituras.
- `ID` é texto hexadecimal de 8–9 caracteres, não sequencial; 29 grupos de
  IDs aparecem duplicados, somando 63 linhas.
- As 96 linhas sem `Data_Hora` e sem `Local_Bipagem` são 32 plaquetas
  repetidas 3 vezes, um artefato de importação. As outras 2 linhas têm data
  e não têm sala. Todas as 98 são ignoradas, com registro no relatório.
- Período: 2021-01-31 a 2027-01-18. Em 2026-11-05, 579 eventos têm data
  futura. Não rejeitar automaticamente (pode ser relógio de dispositivo),
  mas sinalizar.
- As datas de 2021 e de 2027 **não são erro de conversão**: existem no
  arquivo. O que estava errado era usar a leitura mais antiga (31/01/2021)
  como início da sessão. A sessão passa a começar na importação, e a
  leitura mais antiga fica registrada separadamente.
- A coluna `Data_Hora` é convertida de serial do Excel, data nativa ou
  texto `dd/mm/aaaa hh:mm` para ISO 8601 preservando o instante. O
  serial é somado em UTC (época 1899-12-30) para não deslocar o dia.
- `Local_Bipagem`: 477 valores distintos. 1.779 leituras usam
  `CARGA INICIAL`, que é um estado de carga legado, não uma sala física.
- 4 valores de sala de leitura não existem no cadastro:
  `0052 - SALA INFANTIL 5`, `0280`, `0684 - ALOJAMENTO OBRA CAMPESTRE` e
  `0280 - SANITÁRIO MASCULINO GALPÃO CRIOULO`.
- 1.076 plaquetas distintas lidas não estão no cadastro:
  - 550 `MEQ...`, 347 numéricas de 6 dígitos, 61 `CON...`, 43 `INF...`,
    31 `MOV...`, 22 numéricas de 4 dígitos, entre outras;
  - 18 leituras são texto livre no campo plaqueta (ex.: `1 estante sp`,
    `5 mesas`, `Cad sp`);
  - 2 leituras são inválidas (`0` e `6`).
- 526 leituras válidas foram feitas em sala diferente do `Local_Original`
  do bem (527 se contada uma linha sem sala); em **todas** elas a coluna
  `Ação Sapiens` diz `✅ LOCAL CORRETO`.
  Além disso, 467 eventos com ação `🔄 TRANSFERIR...` foram lidos na
  mesma sala do cadastro. Conclusão: a coluna `Ação Sapiens` não pode ser
  usada para calcular divergência.
- 7 leituras repetidas da mesma plaqueta ocorreram em até 2 segundos;
  40 em até 10 segundos. O intervalo mediano entre leituras consecutivas
  da mesma plaqueta é 15 s. Isso orienta o alerta de repetição, que não
  deve bloquear o registro.
- Todas as plaquetas `4 dígitos` lidas (`0`, `6`, códigos de sala) são
  casos que exigem validação, não descarte silencioso.

## Aba `Config`

| ID | Sala_Atual |
|----|------------|
| 1 | `0589 - PRAIA PARK - CASCATAS` |

É a única configuração existente. Deve ser importada como configuração
operacional editável, não fixada no código.

## Abas derivadas

### `ITENS_NOVOS`

Somente cabeçalhos (`Plaqueta`, `Local_Bipagem`, `Data_Hora`), sem dados.
A regra deve ser recriada a partir de eventos cuja plaqueta não existe no
cadastro.

### `❌ PENDENCIAS_FINAIS`

5.563 linhas, 5.561 plaquetas distintas (2 grupos duplicados). Todas
existem no cadastro e todas estão `⏳ PENDENTE`. É uma visão derivada:
não importar como tabela independente.

### `RESUMO_SALAS`

646 salas. Somatórios: 17.037 itens, 11.474 conferidos, 5.563 pendentes.
Recalculando a partir de `Patrimonio` por `Local_Original`, os números
batem exatamente. A diferença de 1 item em relação aos 17.038 registros é
o bem sem local. As colunas de total geral (G–I) são fórmulas/valores
auxiliares e não fazem parte do modelo.

## Inconsistências que a importação deve tratar

| Problema | Quantidade | Decisão |
|---|---|---|
| Plaquetas duplicadas no cadastro | 16 grupos / 32 linhas | Importar todos, marcar `revisaoPendente`; leitura não escolhe bem automaticamente |
| Placas de sala (4 dígitos) | 668 de 669 | Importar, marcar `placa_de_sala` para revisão |
| Sem descrição | 6 | Importar, marcar `descricao_ausente` |
| Sem local | 1 | Importar, marcar `local_ausente`; fora do resumo por sala |
| `ID_Patrimonio` vazio | 17.038 | Guardar `null`; não usar como chave |
| Datas futuras | 580 eventos | Importar, sinalizar `data_futura` |
| Eventos sem data/local | 98 | Ignorar, registrar no relatório |
| IDs de evento duplicados | 29 grupos / 63 linhas | Gerar novo UUID; guardar `legacyEventId` para rastreio |
| Leituras não cadastradas | 1.076 plaquetas | Importar como `nao_cadastrado` |
| Sala fora do cadastro | 4 valores | Importar como texto; não criar sala automaticamente |
| `Ação Sapiens` inconsistente | 526 + 467 | Não usar para status; recalcular por sala |
| `CARGA INICIAL` | 1.495 bens / 1.779 leituras | Tratar como local legado, exibir separadamente |

## Consequências para o produto

1. A chave de negócio é a plaqueta em texto; não há chave confiável em
   `ID_Patrimonio`.
2. O cadastro pode conter duplicidades; a leitura precisa de um fluxo de
   exceção, nunca de uma escolha silenciosa.
3. O status de conferência deve ser derivado dos eventos da sessão ativa,
   não copiado de `Status`/`Alerta de Transferência`.
4. A importação precisa de prévia, relatório de ignorados e backup.
5. `CARGA INICIAL` e placas de sala precisam ser visíveis na interface
   para não inflar artificialmente o progresso.
