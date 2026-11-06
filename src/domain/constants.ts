export const APP_NAME = 'Inventário Patrimonial';

export const CARGA_INICIAL = 'CARGA INICIAL';

export const SEM_LOCAL = 'Sem local';

export const DEFAULT_SCANNER_SETTINGS = {
  sufixo: 'Enter' as const,
  debounceMs: 60,
  janelaRepeticaoMs: 1500,
  som: true,
  focoAutomatico: true,
};

export const RESULT_LABELS = {
  encontrado: 'Encontrado',
  divergente: 'Local divergente',
  nao_cadastrado: 'Não cadastrado',
  duplicado_cadastro: 'Cadastro duplicado',
  invalido: 'Leitura inválida',
} as const;

export const REVIEW_REASON_LABELS = {
  plaqueta_duplicada: 'Plaqueta duplicada no cadastro',
  placa_de_sala: 'Provável placa de sala',
  descricao_ausente: 'Descrição ausente',
  local_ausente: 'Local ausente',
  plaqueta_atipica: 'Plaqueta fora do padrão',
} as const;

export const PLAQUETA_FORMAT_LABELS = {
  'numerica-4': '4 dígitos (provável sala)',
  'numerica-6': '6 dígitos',
  'codigo-composto': 'Código composto',
  atipica: 'Atípica',
  invalida: 'Inválida',
} as const;

export const SCANNER_SUFFIX_OPTIONS = ['Enter', 'Tab'] as const;
