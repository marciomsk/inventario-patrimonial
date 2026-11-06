import { useMemo, useState } from 'react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { useToast } from '../../app/ToastContext';
import { createManualAsset, updateAsset } from '../../db/assetsRepository';
import type { Asset, Room } from '../../domain/types';

interface AssetFormModalProps {
  open: boolean;
  onClose: () => void;
  rooms: Room[];
  /** Quando presente, edita o bem existente. */
  asset?: Asset | null;
  /** Quando presente, cadastra um novo bem lido em campo. */
  create?: {
    sessionId: string;
    deviceId: string;
    room: Room | null;
    defaultRoomId?: string | null;
  } | null;
  onSaved?: (asset: Asset) => void;
}

export function AssetFormModal(props: AssetFormModalProps) {
  if (!props.open) return null;
  const key = props.asset?.id ?? (props.create ? `novo-${props.create.room?.id ?? ''}` : 'novo');
  return <AssetFormContent key={key} {...props} />;
}

function AssetFormContent({
  open,
  onClose,
  rooms,
  asset,
  create,
  onSaved,
}: AssetFormModalProps) {
  const { push } = useToast();
  const [plaqueta, setPlaqueta] = useState(asset?.plaqueta ?? '');
  const [descricao, setDescricao] = useState(asset?.descricao ?? '');
  const [roomId, setRoomId] = useState(
    asset?.roomId ?? create?.defaultRoomId ?? create?.room?.id ?? '',
  );
  const [situacao, setSituacao] = useState(asset?.statusCadastro ?? 'Cadastrado em campo');
  const [observacao, setObservacao] = useState(asset?.observacao ?? '');
  const [saving, setSaving] = useState(false);

  const isCreate = Boolean(create);

  const sortedRooms = useMemo(
    () =>
      [...rooms].sort((a, b) => {
        const codeA = a.codigo ?? '9999';
        const codeB = b.codigo ?? '9999';
        return codeA.localeCompare(codeB, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR');
      }),
    [rooms],
  );

  async function save() {
    setSaving(true);
    try {
      if (!isCreate) {
        if (!asset) throw new Error('Bem não selecionado.');
        const saved = await updateAsset(asset.id, {
          plaqueta,
          descricao,
          roomId: roomId || null,
          statusCadastro: situacao,
          observacao,
        });
        push('Bem atualizado. Os contadores do painel já refletem a alteração.', 'success');
        onSaved?.(saved);
        onClose();
        return;
      }

      if (!create) throw new Error('Contexto de cadastro indisponível.');
      const room = sortedRooms.find((item) => item.id === roomId) ?? create.room;
      if (!room) throw new Error('Selecione a sala do novo bem.');

      const saved = await createManualAsset({
        plaqueta,
        descricao,
        room,
        statusCadastro: situacao,
        observacao,
        sessionId: create.sessionId,
        deviceId: create.deviceId,
      });
      push('Patrimônio cadastrado e marcado como item novo.', 'success');
      onSaved?.(saved);
      onClose();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Falha ao salvar o bem.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={isCreate ? 'Cadastrar patrimônio' : 'Editar bem'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" icon="save" disabled={saving} onClick={save}>
            {isCreate ? 'Cadastrar bem' : 'Salvar alterações'}
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <p className="muted">
          {isCreate
            ? 'O item será vinculado à sala atual da sessão e marcado para o relatório de itens novos. O cadastro original não é alterado.'
            : 'Corrige apenas o cadastro local. As leituras já registradas permanecem no histórico com a plaqueta e a sala do momento.'}
        </p>

        <div className="field-row">
          <label className="field">
            <span>Plaqueta / código patrimonial</span>
            <input
              value={plaqueta}
              onChange={(event) => setPlaqueta(event.target.value)}
              placeholder="Ex.: 022308"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className="field">
            <span>Situação</span>
            <input
              value={situacao}
              onChange={(event) => setSituacao(event.target.value)}
              placeholder="Ex.: ✅ OK"
              autoComplete="off"
            />
          </label>
        </div>

        <label className="field">
          <span>Descrição</span>
          <input
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            placeholder="Ex.: CADEIRA GIRATÓRIA"
            autoComplete="off"
          />
        </label>

        <label className="field">
          <span>Sala / local de origem</span>
          <select value={roomId} onChange={(event) => setRoomId(event.target.value)}>
            <option value="">Sem sala</option>
            {sortedRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Observações</span>
          <textarea
            rows={3}
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            placeholder="Ex.: etiqueta danificada, item encontrado sem plaqueta..."
          />
        </label>
      </div>
    </Modal>
  );
}
