export type IsoDateTime = string;

export type AssetSource = 'xlsx-legado' | 'csv-senior' | 'google-sheets' | 'manual';

export type LegacyStatus = 'conferido' | 'pendente' | 'desconhecido';

export type ReviewReason =
  | 'plaqueta_duplicada'
  | 'placa_de_sala'
  | 'descricao_ausente'
  | 'local_ausente'
  | 'plaqueta_atipica';

export type PlaquetaFormat = 'numerica-4' | 'numerica-6' | 'codigo-composto' | 'atipica' | 'invalida';

/**
 * Sala consolidada. Duas grafias do mesmo local (código igual ou nome
 * equivalente) apontam para o mesmo `Room.id`, permitindo totais somados
 * sem perder os rótulos originais em `aliases` e nos eventos históricos.
 */
export interface Room {
  id: string;
  /** Chave de identidade: `C:<código>` ou `N:<nome normalizado>`. */
  key: string;
  codigo: string | null;
  nome: string;
  /** Rótulo canônico, no formato `código - nome`. */
  label: string;
  /** Grafias encontradas no cadastro/planilha que foram consolidadas. */
  aliases: string[];
  /** Responsável pelo setor / sala. */
  responsavel?: string | null;
  /** Filial à qual a sala pertence ('Filial 1' ou 'Filial 2'). */
  filial?: string | null;
  /** Indica se o relatório de inventário foi entregue ao responsável. */
  relatorioEntregue?: boolean;
  /** Sinônimo / campo de controle de envio ao responsável. */
  enviadoAoResponsavel?: boolean;
  dataEnvio?: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Asset {
  id: string;
  plaqueta: string;
  plaquetaKey: string;
  descricao: string;
  localOriginal: string;
  localCodigo: string | null;
  localNome: string;
  /** Sala consolidada; nulo apenas em registros antigos sem correspondência. */
  roomId: string | null;
  idPatrimonio: string | null;
  statusCadastro: string;
  observacao: string | null;
  legacyStatus: LegacyStatus;
  legacyUltimaConferencia: IsoDateTime | null;
  legacyAcaoSapiens: string;
  legacyAlerta: string;
  source: AssetSource;
  importBatchId: string | null;
  revisaoPendente: boolean;
  revisaoMotivos: ReviewReason[];
  ativo: boolean;
  /** Bem cadastrado manualmente em campo (não existia na carga original). */
  isManualRegister: boolean;
  /** Indica se o bem sofreu baixa patrimonial (inativado). */
  baixado?: boolean;
  dataBaixa?: IsoDateTime | null;
  motivoBaixa?: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type EventResult =
  | 'encontrado'
  | 'divergente'
  | 'nao_cadastrado'
  | 'duplicado_cadastro'
  | 'invalido';

export type EventSource = 'scanner' | 'manual' | 'import_xlsx' | 'import_csv';

export type SyncStatus = 'pendente' | 'sincronizado' | 'erro' | 'nao_aplicavel';

export interface InventoryEvent {
  id: string;
  plaqueta: string;
  plaquetaKey: string;
  assetId: string | null;
  candidatosAssetIds: string[];
  dataHora: IsoDateTime;
  localBipagem: string;
  /** Sala consolidada da leitura; o texto original permanece em `localBipagem`. */
  roomId: string | null;
  resultado: EventResult;
  observacao: string | null;
  acaoSapiens: string | null;
  inventorySessionId: string;
  deviceId: string;
  source: EventSource;
  legacyEventId: string | null;
  syncStatus: SyncStatus;
  resolvidoManualmente: boolean;
  createdAt: IsoDateTime;
}

export type SessionStatus = 'ativa' | 'encerrada';

export type SessionSource = 'xlsx-legado' | 'manual';

export interface InventorySession {
  id: string;
  nome: string;
  status: SessionStatus;
  startedAt: IsoDateTime;
  endedAt: IsoDateTime | null;
  source: SessionSource;
  importBatchId: string | null;
  createdAt: IsoDateTime;
  /**
   * Primeira leitura do histórico legado. `startedAt` é o momento real da
   * abertura/importação da sessão; este campo guarda a data do dado mais
   * antigo da planilha, que não deve ser confundida com o início da sessão.
   */
  legacyFirstReadAt?: IsoDateTime | null;
}

export interface ScannerSettings {
  sufixo: 'Enter' | 'Tab';
  debounceMs: number;
  janelaRepeticaoMs: number;
  som: boolean;
  focoAutomatico: boolean;
}

export interface AppSettingsMap {
  salaAtual: string;
  activeSessionId: string | null;
  deviceId: string;
  lastImportBatchId: string | null;
  lastBackupAt: string | null;
  scanner: ScannerSettings;
}

export type SettingKey = keyof AppSettingsMap;

export interface SettingRow {
  key: SettingKey;
  value: unknown;
  updatedAt: IsoDateTime;
}

export type ImportOrigin = 'xlsx-legado' | 'csv-senior' | 'google-sheets';

export type ImportStatus = 'previa' | 'aplicando' | 'concluido' | 'erro';

export interface ImportWarning {
  tipo: string;
  mensagem: string;
  linha?: number;
  plaqueta?: string;
}

export interface ImportBatch {
  id: string;
  origem: ImportOrigin;
  fileName: string;
  startedAt: IsoDateTime;
  finishedAt: IsoDateTime | null;
  status: ImportStatus;
  totalRows: number;
  importedAssets: number;
  importedEvents: number;
  ignored: number;
  duplicates: number;
  warnings: ImportWarning[];
  errorMessage: string | null;
}

export type TransferStatus = 'pendente' | 'enviada' | 'cancelada' | 'efetivada';

export interface TransferRequest {
  id: string;
  assetId: string;
  plaqueta: string;
  localOriginal: string;
  localDestino: string;
  eventId: string;
  dataHora: IsoDateTime;
  status: TransferStatus;
  observacao: string | null;
  createdAt: IsoDateTime;
  /** Momento em que o local do bem foi efetivado no banco local. */
  resolvedAt?: IsoDateTime | null;
}

export type SyncEntity = 'asset' | 'event' | 'session' | 'transfer';

export type SyncOperation = 'upsert' | 'delete';

export interface SyncQueueItem {
  id: string;
  entity: SyncEntity;
  entityId: string;
  operation: SyncOperation;
  payload: unknown;
  status: 'pendente' | 'enviando' | 'erro';
  attempts: number;
  lastError: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface AssetSessionState {
  conferido: boolean;
  divergente: boolean;
  ultimoEvento: InventoryEvent | null;
}

export interface SessionSummary {
  totalAssets: number;
  conferidos: number;
  pendentes: number;
  divergentes: number;
  naoCadastrados: number;
  cadastroDuplicado: number;
  revisaoPendente: number;
  eventos: number;
  leiturasRepetidas: number;
  percentual: number;
}

export interface RoomProgress {
  roomId: string | null;
  local: string;
  codigo: string | null;
  nome: string;
  aliases: string[];
  total: number;
  conferidos: number;
  pendentes: number;
  divergentes: number;
  percentual: number;
}
