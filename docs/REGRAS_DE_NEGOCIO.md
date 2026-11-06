# Regras de negócio

Este documento é a referência para o domínio. Quando houver conflito com
dados da planilha, valem as regras abaixo; os dados legados são
preservados para auditoria.

## 1. Identidade do bem

1. A chave de negócio é a **plaqueta**, sempre texto.
2. Zeros à esquerda e letras são preservados (`000123` ≠ `123`;
   `CON000010-001` é válido).
3. A normalização para busca remove espaços nas pontas, colapsa espaços
   internos e converte para maiúsculas. O valor original continua
   armazenado e exibido.
4. `ID_Patrimonio` é opcional e não é chave; na base atual está vazio.
5. Formatos reconhecidos:
   - 4 dígitos (`0001`) — válido, mas provável placa de sala;
   - 6 dígitos (`022308`) — formato principal de bem;
   - `AAA000000-000` (`MOV015327-000`) — código composto;
   - qualquer outro valor é **atípico** e exige confirmação, não descarte.
6. Plaqueta vazia, com menos de 4 caracteres ou contendo texto livre é
   **inválida** para conferência.

## 2. Cadastro e duplicidades

7. Duas linhas com a mesma plaqueta são uma **duplicidade de cadastro**,
   não uma leitura repetida.
8. Todos os registros duplicados são importados e marcados
   `revisaoPendente`, com motivo `plaqueta_duplicada`.
9. Ao ler uma plaqueta duplicada, o app **não escolhe** um bem. Registra
   um evento `duplicado_cadastro` com os candidatos e pede a seleção do
   operador.
10. A seleção manual vincula o evento a um dos bens e recalcula o
    resultado (`encontrado` ou `divergente`). O evento guarda
    `resolvidoManualmente = true`.
11. Placas de sala (4 dígitos cuja descrição começa com o próprio código)
    são importadas, mas marcadas `placa_de_sala` para revisão. Não são
    excluídas automaticamente.
12. Registros sem descrição ou sem local são importados e marcados; o
    painel de qualidade mostra esses totais.
13. A importação nunca altera a planilha de origem e nunca escreve no
    Senior.

## 3. Leitura

14. Cada leitura grava, no mínimo: plaqueta, data/hora, sala selecionada,
    sessão, dispositivo e resultado.
15. Leituras são **eventos históricos imutáveis** no fluxo normal. Não
    existe “desfazer” que apague o evento; correções são registradas e
    auditadas.
16. A sala de leitura é a sala atual configurada, visível na tela.
17. Resultado da leitura, nesta ordem:
    - plaqueta inválida → `invalido`;
    - sem bem no cadastro → `nao_cadastrado`;
    - mais de um bem com a mesma plaqueta → `duplicado_cadastro`;
    - um bem, mesma sala do cadastro → `encontrado`;
    - um bem, sala diferente → `divergente`.
18. Comparação de sala usa texto normalizado (trim, espaços, caixa,
    Unicode NFC). Não remover acentos nem códigos.
19. Leitura repetida da mesma plaqueta na sessão é permitida. A interface
    alerta, mas não bloqueia, e o evento é registrado.
20. Se a mesma plaqueta for lida duas vezes em um intervalo muito curto
    (configurável, padrão 1,5 s), o app trata como possível “bounce” do
    leitor: alerta e pede confirmação. Leituras legítimas nunca são
    descartadas sem ação do operador.
21. A leitura não encontrada permite observação livre e aparece em
    “Itens não cadastrados”.
22. A leitura divergente permite registrar uma **solicitação de
    transferência**, mas **não altera** o local oficial.

## 4. Sessões e status

23. Só existe uma sessão de inventário ativa por vez.
24. Um bem está **conferido** na sessão se há evento da sessão vinculado a
    ele com resultado `encontrado` ou `divergente`.
25. Um bem está **divergente** na sessão quando a **última leitura de
    conferência** foi feita em sala diferente do `localOriginal` atual do
    bem. Leituras divergentes antigas continuam no histórico, mas não
    mantêm o bem divergente se a leitura mais recente está na sala certa.
    Essa comparação é sempre recalculada; o resultado gravado no evento
    não é alterado.
26. Um bem está **pendente** se está ativo no cadastro e não tem evento
    de conferência na sessão.
27. O status de conferência **não é copiado** de `Status`,
    `Status_Geral` ou `Alerta de Transferência` da planilha. Esses campos
    ficam apenas como legado/auditoria.
28. A sessão importada da planilha é criada como ativa. Os status
    correntes são **recalculados** a partir das leituras válidas, não
    copiados de `Status`/`Status_Geral`. Os totais legados (11.475
    conferidos e 5.563 pendentes) servem apenas como referência de
    conferência: podem divergir onde não há leitura válida ou onde a
    leitura ocorreu em sala diferente.
29. Iniciar uma nova sessão zera os status correntes, mas mantém todas as
    sessões anteriores consultáveis.
30. Eventos não são apagados ao encerrar uma sessão.

## 5. Salas e progresso

31. A sala de um bem é `Local_Original` do cadastro.
32. O progresso por sala agrupa por `Local_Original` e mostra total,
    conferidos, pendentes, divergentes e percentual.
33. Bens sem local aparecem em “Sem local” e não entram no total por sala
    nominal.
34. `CARGA INICIAL` é um local legado de carga, não uma sala física.
    Deve ser exibido com rótulo próprio e não ser usado como destino de
    transferência.
35. Salas lidas que não existem no cadastro não criam sala
    automaticamente; a leitura fica registrada e visível.
36. A sala atual é configuração editável, com sugestão a partir das salas
    do cadastro e da última usada.

## 6. Importação

37. Antes de aplicar, sempre mostrar prévia com contagens, duplicidades,
    erros e amostra de ignorados.
38. Não importar linhas totalmente vazias.
39. Em `Patrimonio`, linha sem plaqueta é ignorada e contabilizada.
40. Em `Conferencia`, linha sem data ou sem local é ignorada e
    contabilizada (98 linhas na base atual: 96 sem data e sem local,
    2 somente sem local).
41. Datas futuras são importadas e sinalizadas, não rejeitadas.
42. IDs de evento legados duplicados recebem novo UUID; o ID original é
    guardado em `legacyEventId`.
43. Eventos são vinculados ao bem por `plaquetaKey`:
    - 0 bens → `nao_cadastrado`;
    - 1 bem → `encontrado` ou `divergente`;
    - 2+ bens → `duplicado_cadastro`, sem vínculo automático.
44. `Ação Sapiens` e `Alerta de Transferência` não definem o resultado;
    a comparação de sala define.
45. Antes de substituir dados existentes, exigir backup exportado e
    confirmação explícita.
46. A importação é transacional: ou grava tudo, ou não grava nada.
47. O lote (`ImportBatch`) registra contagens e amostra de avisos para
    auditoria.
48. A importação não executa fórmulas de planilha.

## 7. Exportação e backup

49. Exportar não altera dados.
50. O backup JSON completo deve conter versão de schema e data.
51. CSV usa UTF-8 com BOM para abrir corretamente no Excel pt-BR, separador
    `;` e plaquetas entre aspas quando necessário.
52. Exportações de pendências e divergências refletem a sessão ativa.
53. Nunca afirmar que um backup foi feito sem gerar o arquivo.

## 8. Segurança e confiabilidade

54. Funcionar offline; nenhuma leitura depende de rede.
55. Não armazenar credenciais em texto puro. Nesta versão não há OAuth.
56. Sincronização futura deve ser idempotente por `event.id`.
57. Limpar a base local exige confirmação textual e backup recente.
58. Logs técnicos não devem expor descrições desnecessárias.

## 9. Datas e efetivação de transferência

59. `startedAt` de uma sessão importada é o **momento da importação**.
    A data da leitura mais antiga da planilha fica em `legacyFirstReadAt`
    e nunca é apresentada como início da sessão.
60. Datas da planilha são convertidas respeitando o instante real (serial
    do Excel, data/hora do arquivo ou texto `dd/mm/aaaa hh:mm`). Nenhuma
    data é inventada, truncada ou “corrigida” para o dia atual.
61. Leituras com data futura em relação ao relógio do dispositivo são
    importadas normalmente e sinalizadas na interface. Elas não são
    rejeitadas nem reescritas.
62. **Efetivar transferência** é uma ação explícita do operador. Ela
    atualiza o `localOriginal` do bem apenas no banco local do app para a
    sala da última leitura. Os eventos históricos não são alterados nem
    apagados, e o Senior continua intacto.
63. A efetivação fica registrada em `TransferRequest` com status
    `efetivada` e `resolvedAt`, permitindo auditar quem mudou o local e
    quando. A interface nunca efetiva sozinha ao registrar uma leitura.
64. O relatório de “Solicitações de transferência” deve estar disponível
    em CSV e XLSX, com plaqueta em texto, local de origem, destino,
    status e data de efetivação.

## Critérios de aceitação da fundação

- [ ] Importar a planilha real gera 17.038 bens e 13.537 leituras válidas
      (98 linhas sem data/local ignoradas).
- [ ] O total de bens corresponde exatamente às 17.038 linhas com plaqueta
      da aba `Patrimonio` (1.999 linhas totalmente vazias são ignoradas).
- [ ] Os 16 grupos duplicados ficam marcados para revisão.
- [ ] A sessão importada é ativa e seus status são recalculados a partir
      das leituras; os totais legados (11.475 conferidos / 5.563
      pendentes) são referência, não fonte do status.
- [ ] O recálculo resulta em 11.447 conferidos, 5.591 pendentes e 67,19%
      de conclusão; os 28 conferidos legados restantes pertencem a grupos
      de plaqueta duplicada e ficam sem vínculo até revisão manual.
- [ ] A sessão importada mostra a data da importação como início e
      preserva `legacyFirstReadAt` com a leitura mais antiga.
- [ ] Divergência considera a última leitura do bem: 322 bens no estado
      atual da base, embora 500 já tenham tido alguma leitura divergente
      no histórico.
- [ ] Efetivar uma transferência atualiza o cadastro local, remove a
      divergência atual e mantém todos os eventos históricos.
- [ ] Ler uma plaqueta existente na sala correta grava `encontrado`.
- [ ] Ler a mesma plaqueta em outra sala grava `divergente` e não altera
      o cadastro.
- [ ] Ler uma plaqueta inexistente grava `nao_cadastrado`.
- [ ] Ler uma plaqueta duplicada não escolhe bem e mostra os candidatos.
- [ ] CSV e XLSX exportados mantêm a plaqueta como texto (`000123`,
      `022308`), inclusive zeros à esquerda.
- [ ] Recarregar o app offline mantém os dados e a sessão ativa.
- [ ] Exportar backup JSON e reimportar em outra instalação preserva os
      eventos.
