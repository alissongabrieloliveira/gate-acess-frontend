import { ArrowLeft, Camera, Car, Clock, MapPin, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TopBarControls } from '../../components/TopBar'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { openPrintWindow, printReceipt } from './printReceipt'
import { PERSON_TYPE_LABELS } from './useAccessControlData'
import { useAccessLogDetail } from './useAccessLogDetail'

const STATUS_BADGES = {
  ACTIVE: { label: 'Ativo', className: 'bg-green-100 text-green-700' },
  FINISHED: { label: 'Finalizado', className: 'bg-gray-100 text-gray-600' },
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString('pt-BR') : '----'
}

function SectionHeader({ number, icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-xl bg-brand text-xs font-bold text-white">
        {number}
      </span>
      {icon}
      <p className="text-[13px] font-bold text-ink">{title}</p>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <p className="text-[11px] font-semibold uppercase text-subtle">{label}</p>
      <p className="text-sm text-ink">{value ?? '—'}</p>
    </div>
  )
}

export default function AccessLogDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isLoading, error, detail, refetch } = useAccessLogDetail(id)
  const [gatesList, setGatesList] = useState([])
  const [selectedGateId, setSelectedGateId] = useState('all')
  const [actionError, setActionError] = useState(null)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    api.get('/gates', { params: { limit: 100 } }).then(({ data }) => setGatesList(data.data))
  }, [])

  async function handleExit() {
    setActionError(null)
    const exitGateId = selectedGateId !== 'all' ? Number(selectedGateId) : gatesList[0]?.id
    if (!exitGateId) {
      setActionError('Nenhum portão disponível para registrar a saída.')
      return
    }
    setIsExiting(true)
    try {
      await api.patch(`/access-logs/${id}/exit`, { exitGateId })
      refetch()
    } catch (err) {
      setActionError(getErrorMessage(err, 'Não foi possível registrar a saída.'))
    } finally {
      setIsExiting(false)
    }
  }

  function handlePrint() {
    const printWindow = openPrintWindow()
    if (!detail) return
    const { log, person, visitedPerson, vehicle, sector, entryGate, exitGate } = detail
    printReceipt(
      {
        personName: person.name,
        personCpf: person.cpf,
        vehiclePlate: vehicle?.licensePlate,
        visitedPersonName: visitedPerson?.name,
        sectorName: sector?.name,
        entryTime: log.entryTime,
        entryGateName: entryGate.name,
        exitTime: log.exitTime,
        exitGateName: exitGate?.name,
        receiptCode: log.receiptCode,
      },
      printWindow,
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between py-2">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px] font-bold text-ink">Detalhes do Registro</h1>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Link to="/access-control" className="font-medium hover:underline">
              Controle de Acessos
            </Link>
            <span>{'>'}</span>
            <span className="font-semibold">Detalhes do Registro</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink"
          >
            <ArrowLeft className="size-4" strokeWidth={2} />
            Voltar
          </button>
        </div>
        <TopBarControls gates={gatesList} selectedGateId={selectedGateId} onGateChange={setSelectedGateId} />
      </div>

      {isLoading && <p className="text-sm text-muted">Carregando...</p>}
      {error && (
        <p className="text-sm text-red-600">
          Não foi possível carregar este registro. Ele pode não existir ou ter sido removido.
        </p>
      )}

      {detail && (
        <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white px-6 pb-4 pt-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <p className="text-xl font-bold text-ink">{detail.person.name}</p>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                (STATUS_BADGES[detail.log.status] ?? {}).className ?? 'bg-gray-100 text-gray-700'
              }`}
            >
              {(STATUS_BADGES[detail.log.status] ?? {}).label ?? detail.log.status}
            </span>
          </div>
          <p className="-mt-3 text-[13px] text-subtle">CPF {detail.person.cpf ?? 'não informado'}</p>

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-2">
            <SectionHeader number={1} icon={<User className="size-4 text-ink" strokeWidth={1.75} />} title="Identificação do Visitante" />
            <div className="flex gap-4">
              <Field label="Nome Completo" value={detail.person.name} />
              <Field label="CPF" value={detail.person.cpf} />
            </div>
            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase text-subtle">Tipo de Pessoa</p>
                <span className="w-fit rounded-lg bg-brand-50 px-3 py-1.5 text-[13px] font-semibold text-brand">
                  {PERSON_TYPE_LABELS[detail.person.personType] ?? '—'}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase text-subtle">Foto do Visitante</p>
                <div
                  title="Upload de foto ainda não suportado pelo backend"
                  className="flex h-[59px] cursor-not-allowed flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50"
                >
                  <Camera className="size-5 text-gray-500" strokeWidth={1.5} />
                  <p className="text-xs text-gray-500">Clique para enviar</p>
                </div>
              </div>
            </div>
          </div>

          {detail.vehicle && (
            <>
              <hr className="border-gray-200" />
              <div className="flex flex-col gap-3">
                <SectionHeader number={2} icon={<Car className="size-4 text-ink" strokeWidth={1.75} />} title="Veículo" />
                <div className="flex gap-4">
                  <Field label="Placa" value={detail.vehicle.licensePlate} />
                  <Field
                    label="Marca / Modelo"
                    value={[detail.vehicle.brand, detail.vehicle.model].filter(Boolean).join(' ') || '—'}
                  />
                </div>
                <div className="flex gap-4">
                  <Field label="KM de Entrada" value={detail.log.isKmUnavailable ? 'Não disponível' : detail.log.kmEntry} />
                  <div className="flex-1" />
                </div>
              </div>
            </>
          )}

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-2">
            <SectionHeader number={detail.vehicle ? 3 : 2} icon={<MapPin className="size-4 text-ink" strokeWidth={1.75} />} title="Destino & Autorização" />
            <div className="flex gap-4">
              <Field label="Setor de Destino" value={detail.sector?.name} />
              <Field label="Anfitrião" value={detail.visitedPerson?.name} />
            </div>
          </div>

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-3">
            <SectionHeader number={detail.vehicle ? 4 : 3} icon={<Clock className="size-4 text-ink" strokeWidth={1.75} />} title="Registro de Acesso" />
            <div className="flex gap-4">
              <Field label="Data de Entrada" value={`${formatDateTime(detail.log.entryTime)} — ${detail.entryGate.name}`} />
              <Field
                label="Data de Saída"
                value={detail.log.exitTime ? `${formatDateTime(detail.log.exitTime)} — ${detail.exitGate?.name}` : '----'}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase text-subtle">Status</p>
                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-[13px] font-bold ${
                    (STATUS_BADGES[detail.log.status] ?? {}).className ?? 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {(STATUS_BADGES[detail.log.status] ?? {}).label ?? detail.log.status}
                </span>
              </div>
              <div className="flex-1" />
            </div>
          </div>

          {actionError && <p className="text-sm text-red-600">{actionError}</p>}

          <div className="flex items-center justify-end gap-3">
            {detail.log.status === 'ACTIVE' && (
              <button
                type="button"
                onClick={handleExit}
                disabled={isExiting}
                className="rounded-[10px] bg-brand px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {isExiting ? 'Registrando...' : 'Registrar Saída'}
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-[10px] border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Imprimir
            </button>
            <Link
              to={`/access-control/${id}/edit`}
              className="rounded-[10px] border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Editar Registro
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
