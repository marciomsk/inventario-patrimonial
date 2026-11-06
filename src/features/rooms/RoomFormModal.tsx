import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { useToast } from '../../app/ToastContext';
import { createRoom, updateRoom } from '../../db/roomRepository';
import type { Room } from '../../domain/types';

interface RoomFormModalProps {
  open: boolean;
  room: Room | null;
  onClose: () => void;
  onSaved?: (room: Room) => void;
}

export function RoomFormModal(props: RoomFormModalProps) {
  if (!props.open) return null;
  return <RoomFormContent key={props.room?.id ?? 'nova'} {...props} />;
}

function RoomFormContent({ open, room, onClose, onSaved }: RoomFormModalProps) {
  const { push } = useToast();
  const [codigo, setCodigo] = useState(room?.codigo ?? '');
  const [nome, setNome] = useState(room?.nome ?? '');
  const [responsavel, setResponsavel] = useState(room?.responsavel ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const saved = room
        ? await updateRoom(room.id, { codigo, nome, responsavel })
        : await createRoom({ codigo, nome, responsavel });
      push(
        room
          ? 'Sala atualizada. O local dos bens vinculados foi atualizado em cascata.'
          : 'Sala cadastrada.',
        'success',
      );
      onSaved?.(saved);
      onClose();
    } catch (error) {
      push(error instanceof Error ? error.message : 'Falha ao salvar a sala.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={room ? 'Editar sala' : 'Nova sala'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" icon="save" disabled={saving} onClick={save}>
            Salvar sala
          </Button>
        </>
      }
    >
      <div className="form-stack">
        <p className="muted">
          O código tem 4 dígitos e identifica a sala. Duas grafias do mesmo código são
          consolidadas automaticamente em uma única sala.
        </p>
        <label className="field">
          <span>Código</span>
          <input
            value={codigo}
            onChange={(event) => setCodigo(event.target.value)}
            placeholder="Ex.: 0589"
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>Nome / descrição</span>
          <input
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Ex.: PRAIA PARK - CASCATAS"
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span>Responsável do setor</span>
          <input
            value={responsavel}
            onChange={(event) => setResponsavel(event.target.value)}
            placeholder="Ex.: Nome do encarregado / responsável"
            autoComplete="off"
          />
        </label>
        {room ? (
          <p className="card__note">
            Ao alterar código ou nome, o local de origem de todos os bens desta sala é atualizado.
            As leituras antigas permanecem no histórico.
          </p>
        ) : (
          <p className="card__note">
            Informe o código, o nome, ou ambos. A sala aparece na seleção da leitura mesmo sem bens.
          </p>
        )}
      </div>
    </Modal>
  );
}
