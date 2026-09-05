import Modal from '../../components/Modal'

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="text-sm text-ink">{value ?? '—'}</p>
    </div>
  )
}

export default function ViewLogModal({ log, onClose }) {
  const formatDateTime = (value) => (value ? new Date(value).toLocaleString('pt-BR') : '----')

  return (
    <Modal title="Detalhes do acesso" onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Visitante" value={log.personName} />
        <Field label="CPF" value={log.personCpf} />
        <Field label="Tipo" value={log.personType} />
        <Field label="Placa" value={log.vehiclePlate} />
        <Field label="Anfitrião" value={log.visitedPersonName} />
        <Field label="Destino" value={log.sectorName} />
        <Field label="Entrada" value={formatDateTime(log.entryTime)} />
        <Field label="Portão de entrada" value={log.entryGateName} />
        <Field label="Saída" value={log.exitTime ? formatDateTime(log.exitTime) : '----'} />
        <Field label="Portão de saída" value={log.exitGateName} />
        <Field label="KM entrada" value={log.isKmUnavailable ? 'Não disponível' : log.kmEntry} />
        <Field label="KM saída" value={log.kmExit ?? (log.exitTime ? '—' : '----')} />
        <Field label="Código do recibo" value={log.receiptCode} />
        <Field label="Status" value={log.status === 'ACTIVE' ? 'Ativo' : 'Finalizado'} />
      </div>
      {log.visitReason && (
        <div className="mt-4 flex flex-col gap-0.5">
          <p className="text-xs font-semibold uppercase text-muted">Motivo da visita</p>
          <p className="text-sm text-ink">{log.visitReason}</p>
        </div>
      )}
      {log.observation && (
        <div className="mt-4 flex flex-col gap-0.5">
          <p className="text-xs font-semibold uppercase text-muted">Observação</p>
          <p className="text-sm text-ink">{log.observation}</p>
        </div>
      )}
    </Modal>
  )
}
