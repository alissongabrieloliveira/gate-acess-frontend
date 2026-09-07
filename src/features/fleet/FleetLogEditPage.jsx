import { ArrowLeft, Car, Clock, MapPin, Truck, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TopBarControls } from '../../components/TopBar'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatPlateInput } from '../../lib/format'
import { PERSON_TYPES } from './useFleetData'
import { useFleetLogDetail } from './useFleetLogDetail'

const inputClass = 'h-10 w-full rounded-[10px] border border-gray-200 px-3.5 text-sm font-semibold text-ink focus:border-brand focus:outline-none'
const readOnlyClass = 'h-10 w-full cursor-not-allowed rounded-[10px] border border-gray-200 bg-gray-50 px-3.5 text-sm font-semibold text-muted'
const labelClass = 'text-[11px] font-semibold uppercase text-subtle'
const READONLY_TITLE =
  'Não é possível editar este dado — não existe endpoint de atualização para o registro de frota em si, só para os cadastros de veículo e pessoa'

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

/**
 * Mesmo critério de `AccessLogEditPage.jsx`: só é editável o que tem um
 * endpoint de update de verdade por trás — veículo (PUT /vehicles/:id),
 * motorista (PUT /people/:id) e, se o guincho for um veículo cadastrado da
 * própria frota, esse veículo também (mesmo endpoint). Placa de guincho de
 * terceiro (`transportedByPlate`, texto solto em `fleet_logs`) e todo o
 * resto (destino, motivo, KM, combustível, datas) não tem endpoint de
 * update pra `fleet_logs` em si — fica visível mas bloqueado.
 */
export default function FleetLogEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isLoading, error, detail } = useFleetLogDetail(id)
  const [gatesList, setGatesList] = useState([])
  const [selectedGateId, setSelectedGateId] = useState('all')

  const [plate, setPlate] = useState('')
  const [brandModel, setBrandModel] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverCpf, setDriverCpf] = useState('')
  const [driverType, setDriverType] = useState(3)
  const [towPlate, setTowPlate] = useState('')
  const [towBrandModel, setTowBrandModel] = useState('')
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    api.get('/gates', { params: { limit: 100 } }).then(({ data }) => setGatesList(data.data))
  }, [])

  useEffect(() => {
    if (!detail) return
    setPlate(detail.vehicle.licensePlate ?? '')
    setBrandModel([detail.vehicle.brand, detail.vehicle.model].filter(Boolean).join(' '))
    if (detail.driver) {
      setDriverName(detail.driver.name ?? '')
      setDriverCpf(detail.driver.cpf ?? '')
      setDriverType(detail.driver.personType)
    }
    if (detail.transportingVehicle) {
      setTowPlate(detail.transportingVehicle.licensePlate ?? '')
      setTowBrandModel([detail.transportingVehicle.brand, detail.transportingVehicle.model].filter(Boolean).join(' '))
    }
  }, [detail])

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      await api.put(`/vehicles/${detail.vehicle.id}`, { licensePlate: plate, model: brandModel || undefined })
      if (detail.driver) {
        await api.put(`/people/${detail.driver.id}`, { name: driverName, cpf: driverCpf, personType: driverType })
      }
      if (detail.transportingVehicle) {
        await api.put(`/vehicles/${detail.transportingVehicle.id}`, { licensePlate: towPlate, model: towBrandModel || undefined })
      }
      navigate(`/fleet/${id}`)
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Não foi possível salvar as alterações.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasTowSection = !!(detail && (detail.transportingVehicle || detail.log.transportedByPlate))
  let sectionNumber = 1
  const vehicleSectionNumber = sectionNumber++
  const driverSectionNumber = detail?.driver ? sectionNumber++ : null
  const towSectionNumber = hasTowSection ? sectionNumber++ : null
  const destinationSectionNumber = detail ? sectionNumber++ : null
  const registrySectionNumber = detail ? sectionNumber++ : null

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-ink">Editar Registro</h1>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Link to={`/fleet/${id}`} className="font-medium hover:underline">
              Controle de Frota
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
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto rounded-xl border border-gray-200 bg-white px-6 pb-3 pt-3.5 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <p className="text-xl font-bold text-ink">{formatPlateInput(detail.vehicle.licensePlate)}</p>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">Editando</span>
          </div>
          <p className="-mt-3 text-[13px] text-subtle">
            {[detail.vehicle.brand, detail.vehicle.model].filter(Boolean).join(' ') || 'Sem marca/modelo cadastrado'}
          </p>

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-2">
            <SectionHeader number={vehicleSectionNumber} icon={<Car className="size-4 text-ink" strokeWidth={1.75} />} title="Veículo" />
            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-1">
                <label className={labelClass}>Placa</label>
                <input value={plate} onChange={(e) => setPlate(e.target.value)} required className={inputClass} />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label className={labelClass}>Marca / Modelo</label>
                <input value={brandModel} onChange={(e) => setBrandModel(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {detail.driver && (
            <>
              <hr className="border-gray-200" />
              <div className="flex flex-col gap-2">
                <SectionHeader number={driverSectionNumber} icon={<User className="size-4 text-ink" strokeWidth={1.75} />} title="Motorista" />
                <div className="flex gap-4">
                  <div className="flex flex-1 flex-col gap-1">
                    <label className={labelClass}>Nome Completo</label>
                    <input value={driverName} onChange={(e) => setDriverName(e.target.value)} required className={inputClass} />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <label className={labelClass}>CPF</label>
                    <input value={driverCpf} onChange={(e) => setDriverCpf(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <p className={labelClass}>Tipo de Pessoa</p>
                  <div className="flex gap-2">
                    {PERSON_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setDriverType(type.value)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          driverType === type.value ? 'bg-brand-50 text-brand' : 'border border-gray-200 bg-white text-gray-500'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {hasTowSection && (
            <>
              <hr className="border-gray-200" />
              <div className="flex flex-col gap-2">
                <SectionHeader number={towSectionNumber} icon={<Truck className="size-4 text-ink" strokeWidth={1.75} />} title="Guincho" />
                {detail.transportingVehicle ? (
                  <div className="flex gap-4">
                    <div className="flex flex-1 flex-col gap-1">
                      <label className={labelClass}>Placa</label>
                      <input value={towPlate} onChange={(e) => setTowPlate(e.target.value)} className={inputClass} />
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <label className={labelClass}>Marca / Modelo</label>
                      <input value={towBrandModel} onChange={(e) => setTowBrandModel(e.target.value)} className={inputClass} />
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <div className="flex flex-1 flex-col gap-1">
                      <p className={labelClass}>Placa (veículo de terceiro)</p>
                      <div title={READONLY_TITLE} className={readOnlyClass + ' flex items-center'}>
                        {formatPlateInput(detail.log.transportedByPlate)}
                      </div>
                    </div>
                    <div className="flex-1" />
                  </div>
                )}
              </div>
            </>
          )}

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-2">
            <SectionHeader number={destinationSectionNumber} icon={<MapPin className="size-4 text-ink" strokeWidth={1.75} />} title="Destino & Motivo" />
            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-1">
                <p className={labelClass}>Destino</p>
                <div title={READONLY_TITLE} className={readOnlyClass + ' flex items-center'}>
                  {detail.log.destination ?? '—'}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <p className={labelClass}>Motivo</p>
                <div title={READONLY_TITLE} className={readOnlyClass + ' flex items-center'}>
                  {detail.log.purpose ?? '—'}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-2">
            <SectionHeader number={registrySectionNumber} icon={<Clock className="size-4 text-ink" strokeWidth={1.75} />} title="Registro de Saída/Retorno" />
            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-1">
                <p className={labelClass}>Data de Saída</p>
                <div title={READONLY_TITLE} className={readOnlyClass + ' flex items-center'}>
                  {formatDateTime(detail.log.departureTime)} — {detail.departureGate.name}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <p className={labelClass}>Data de Retorno</p>
                <div title={READONLY_TITLE} className={readOnlyClass + ' flex items-center'}>
                  {detail.log.returnTime ? `${formatDateTime(detail.log.returnTime)} — ${detail.returnGate?.name}` : '----'}
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-1">
                <p className={labelClass}>KM de Saída</p>
                <div title={READONLY_TITLE} className={readOnlyClass + ' flex items-center'}>
                  {detail.log.isKmUnavailable ? 'Não disponível' : (detail.log.kmDeparture ?? '—')}
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <p className={labelClass}>KM de Retorno</p>
                <div title={READONLY_TITLE} className={readOnlyClass + ' flex items-center'}>
                  {detail.log.kmReturn ?? '----'}
                </div>
              </div>
            </div>
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <div className="mt-auto flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-[10px] bg-brand px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </button>
            <Link
              to={`/fleet/${id}`}
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
