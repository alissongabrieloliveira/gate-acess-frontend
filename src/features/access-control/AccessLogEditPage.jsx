import { ArrowLeft, Camera, Car, Clock, MapPin, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TopBarControls } from '../../components/TopBar'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { PERSON_TYPES } from './useAccessControlData'
import { useAccessLogDetail } from './useAccessLogDetail'

const inputClass = 'h-11 w-full rounded-[10px] border border-gray-200 px-3.5 text-sm font-semibold text-ink focus:border-brand focus:outline-none'
const readOnlyClass = 'h-11 w-full cursor-not-allowed rounded-[10px] border border-gray-200 bg-gray-50 px-3.5 text-sm font-semibold text-muted'
const labelClass = 'text-[11px] font-semibold uppercase text-subtle'
const READONLY_TITLE = 'Não é possível editar este dado — não existe endpoint de atualização para o registro de acesso em si, só para os cadastros de pessoa e veículo'

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

export default function AccessLogEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isLoading, error, detail } = useAccessLogDetail(id)
  const [gatesList, setGatesList] = useState([])
  const [selectedGateId, setSelectedGateId] = useState('all')
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [personType, setPersonType] = useState(1)
  const [plate, setPlate] = useState('')
  const [brandModel, setBrandModel] = useState('')
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    api.get('/gates', { params: { limit: 100 } }).then(({ data }) => setGatesList(data.data))
  }, [])

  useEffect(() => {
    if (!detail) return
    setName(detail.person.name ?? '')
    setCpf(detail.person.cpf ?? '')
    setPersonType(detail.person.personType)
    if (detail.vehicle) {
      setPlate(detail.vehicle.licensePlate ?? '')
      setBrandModel([detail.vehicle.brand, detail.vehicle.model].filter(Boolean).join(' '))
    }
  }, [detail])

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      await api.put(`/people/${detail.person.id}`, { name, cpf, personType })
      if (detail.vehicle) {
        await api.put(`/vehicles/${detail.vehicle.id}`, { licensePlate: plate, model: brandModel || undefined })
      }
      navigate(`/access-control/${id}`)
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Não foi possível salvar as alterações.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // KM de entrada/saída pertencem ao access_log em si, não ao veículo — um
  // registro pode ter KM preenchido sem ter um veículo vinculado.
  const hasVehicleSection = !!(detail && (detail.vehicle || detail.log.kmEntry != null || detail.log.kmExit != null))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between py-2">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px] font-bold text-ink">Editar Registro</h1>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Link to={`/access-control/${id}`} className="font-medium hover:underline">
              Controle de Acessos
            </Link>
            <span>{'>'}</span>
            <span className="font-semibold">Editar Registro</span>
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white px-6 pb-4 pt-5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <p className="text-xl font-bold text-ink">{detail.person.name}</p>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">Editando</span>
          </div>
          <p className="-mt-3 text-[13px] text-subtle">CPF {detail.person.cpf ?? 'não informado'}</p>

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-3">
            <SectionHeader number={1} icon={<User className="size-4 text-ink" strokeWidth={1.75} />} title="Identificação do Visitante" />
            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-1">
                <label className={labelClass}>Nome Completo</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label className={labelClass}>CPF</label>
                <input value={cpf} onChange={(e) => setCpf(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-2">
                <p className={labelClass}>Tipo de Pessoa</p>
                <div className="flex gap-2">
                  {PERSON_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setPersonType(type.value)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        personType === type.value ? 'bg-brand-50 text-brand' : 'border border-gray-200 bg-white text-gray-500'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <p className={labelClass}>Foto do Visitante</p>
                <div
                  title="Upload de foto ainda não suportado pelo backend"
                  className="flex h-[50px] cursor-not-allowed flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50"
                >
                  <Camera className="size-4 text-gray-500" strokeWidth={1.5} />
                  <p className="text-[11px] text-gray-500">Clique para enviar</p>
                </div>
              </div>
            </div>
          </div>

          {hasVehicleSection && (
            <>
              <hr className="border-gray-200" />
              <div className="flex flex-col gap-3">
                <SectionHeader number={2} icon={<Car className="size-4 text-ink" strokeWidth={1.75} />} title="Veículo" />
                {detail.vehicle && (
                  <div className="flex gap-4">
                    <div className="flex flex-1 flex-col gap-1">
                      <label className={labelClass}>Placa</label>
                      <input value={plate} onChange={(e) => setPlate(e.target.value)} className={inputClass} />
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <label className={labelClass}>Marca / Modelo</label>
                      <input value={brandModel} onChange={(e) => setBrandModel(e.target.value)} className={inputClass} />
                    </div>
                  </div>
                )}
                <div className="flex gap-4">
                  <div className="flex flex-1 flex-col gap-1">
                    <p className={labelClass}>KM de Entrada</p>
                    <div title={READONLY_TITLE} className={readOnlyClass + ' flex items-center'}>
                      {detail.log.isKmUnavailable ? 'Não disponível' : (detail.log.kmEntry ?? '—')}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <p className={labelClass}>KM de Saída</p>
                    <div title={READONLY_TITLE} className={readOnlyClass + ' flex items-center'}>
                      {detail.log.kmExit ?? '----'}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-3">
            <SectionHeader
              number={hasVehicleSection ? 3 : 2}
              icon={<MapPin className="size-4 text-ink" strokeWidth={1.75} />}
              title="Destino & Autorização"
            />
            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-1">
                <p className={labelClass}>Setor de Destino</p>
                <div title={READONLY_TITLE} className={readOnlyClass + ' flex items-center'}>
                  {detail.sector?.name ?? '—'}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <p className={labelClass}>Anfitrião</p>
                <div title={READONLY_TITLE} className={readOnlyClass + ' flex items-center'}>
                  {detail.visitedPerson?.name ?? '—'}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-3">
            <SectionHeader
              number={hasVehicleSection ? 4 : 3}
              icon={<Clock className="size-4 text-ink" strokeWidth={1.75} />}
              title="Registro de Acesso"
            />
            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-1">
                <p className={labelClass}>Data de Entrada</p>
                <div title={READONLY_TITLE} className={readOnlyClass + ' flex items-center'}>
                  {formatDateTime(detail.log.entryTime)} — {detail.entryGate.name}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <p className={labelClass}>Data de Saída</p>
                <div title={READONLY_TITLE} className={readOnlyClass + ' flex items-center'}>
                  {detail.log.exitTime ? `${formatDateTime(detail.log.exitTime)} — ${detail.exitGate?.name}` : '----'}
                </div>
              </div>
            </div>
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-[10px] bg-brand px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </button>
            <Link
              to={`/access-control/${id}`}
              className="rounded-[10px] border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
