import { ArrowLeft, Car, Clock, MapPin, Truck, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { KmFeedbackMessage, KmUnavailableCheckbox } from '../../components/KmFeedback'
import RecordPicker from '../../components/RecordPicker'
import { MAX_SUGGESTIONS } from '../../components/SuggestionsDropdown'
import { TopBarControls } from '../../components/TopBar'
import { formatCityLabel, searchCities } from '../../hooks/useCitySearch'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { fromDateTimeLocal, toDateTimeLocal } from '../../lib/dateTimeInput'
import { getErrorMessage } from '../../lib/errors'
import { formatCpf, formatPlateInput } from '../../lib/format'
import { parseKm } from '../../lib/km'
import { RULES } from '../../lib/rules'
import { statusBadge, statusLabel } from './fleetStatus'
import { checkDepartureKm, checkReturnKm, displayKmDeparture, displayKmReturn } from './kmRules'
import { useFleetLogDetail } from './useFleetLogDetail'

const inputClass = 'h-10 w-full rounded-[10px] border border-gray-200 px-3.5 text-sm font-semibold text-ink focus:border-brand focus:outline-none'
const readOnlyClass = 'h-10 w-full cursor-not-allowed rounded-[10px] border border-gray-200 bg-gray-50 px-3.5 text-sm font-semibold text-muted'
const labelClass = 'text-[11px] font-semibold uppercase text-subtle'
const READONLY_TITLE = 'Somente administradores podem corrigir os dados do registro de frota'
const TOW_PLATE_TITLE = 'Placa de guincho de terceiro não é editável — não é um veículo cadastrado'
const TOW_TITLE = 'Troque o guincho no registro do próprio guincho'
const SWAP_HINT = 'Escolha outro cadastro para trocar. Para corrigir nome/CPF/placa, use Cadastros.'
// vehicles.vehicle_type: 2 = Frota Própria.
const VEHICLE_TYPE_FLEET = 2
const NOT_RETURNED_TITLE = 'Este veículo ainda não retornou — registre o retorno pelo fluxo normal'
// people.person_type: 1 = Visitante (não pode ser motorista da frota).
const PERSON_TYPE_VISITOR = 1
// Folga pra diferença de relógio entre o tablet e o servidor (mesma do backend).
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000

const kmToInput = (value) => (value == null ? '' : String(value))
const brandModelLabel = (vehicle) => [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Sem marca/modelo'
const vehicleOptionLabel = (vehicle) => `${formatPlateInput(vehicle.licensePlate)} — ${brandModelLabel(vehicle)}`
const noCheck = { error: null, warning: null }

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

function ReadOnlyField({ label, title = READONLY_TITLE, children }) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <p className={labelClass}>{label}</p>
      <div title={title} className={readOnlyClass + ' flex items-center'}>
        {children}
      </div>
    </div>
  )
}

/**
 * Tudo aqui é do registro de frota em si e só o admin corrige (PUT
 * /fleet-logs/:id); para os demais fica visível mas bloqueado. Veículo e
 * motorista são TROCADOS por outro cadastro (busca) — nunca editam o
 * cadastro: corrigir nome/CPF/placa é em Cadastros (antes, digitar outro nome
 * aqui renomeava a pessoa indicada errado). O guincho de um veículo
 * transportado se troca no registro do próprio guincho.
 */
export default function FleetLogEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { error, detail } = useFleetLogDetail(id)
  const { user } = useAuth()
  const isAdmin = !!(user?.rules & RULES.ADMIN)
  const [gatesList, setGatesList] = useState([])
  const [selectedGateId, setSelectedGateId] = useState('all')

  const [vehicle, setVehicle] = useState(null)
  const [driver, setDriver] = useState(null)
  // Destino só da lista de cidades. O valor atual pode ser texto antigo (sem
  // id): fica como está até alguém escolher outra cidade ou limpar.
  const [destinationCity, setDestinationCity] = useState(null)
  const [purpose, setPurpose] = useState('')
  const [kmDeparture, setKmDeparture] = useState('')
  const [kmReturn, setKmReturn] = useState('')
  const [kmUnavailable, setKmUnavailable] = useState(false)
  const [kmWarningAck, setKmWarningAck] = useState(false)
  const [departureTime, setDepartureTime] = useState('')
  const [returnTime, setReturnTime] = useState('')
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    api.get('/gates', { params: { limit: 100 } }).then(({ data }) => setGatesList(data.data))
  }, [])

  useEffect(() => {
    if (!detail) return
    setVehicle(detail.vehicle)
    setDriver(detail.driver ?? null)
    const { log } = detail
    setDestinationCity(log.destination ? { id: null, label: log.destination } : null)
    setPurpose(log.purpose ?? '')
    setKmDeparture(kmToInput(log.kmDeparture))
    setKmReturn(kmToInput(log.kmReturn))
    setKmUnavailable(!!log.isKmUnavailable)
    setDepartureTime(toDateTimeLocal(log.departureTime))
    setReturnTime(toDateTimeLocal(log.returnTime))
  }, [detail])

  const log = detail?.log
  const hasReturned = !!log?.returnTime
  const kmChanged =
    !!log &&
    (kmDeparture !== kmToInput(log.kmDeparture) ||
      (hasReturned && kmReturn !== kmToInput(log.kmReturn)) ||
      kmUnavailable !== !!log.isKmUnavailable)

  // Mesmas regras da saída/retorno (o backend é a fonte da verdade). Só
  // valida quando o KM foi mexido — registro antigo sem KM pode ter o destino
  // corrigido sem exigir KM, igual ao backend. Na edição "KM indisponível"
  // só dispensa a obrigatoriedade: campo vazio passa, número informado
  // continua sendo validado.
  const skipDeparture = kmUnavailable && kmDeparture === ''
  const skipReturn = kmUnavailable && kmReturn === ''
  const departureKmCheck =
    kmChanged && !skipDeparture ? checkDepartureKm({ raw: kmDeparture, unavailable: false, lastKm: null }) : noCheck
  const returnKmCheck =
    kmChanged && hasReturned && !skipReturn
      ? checkReturnKm({ raw: kmReturn, unavailable: false, kmDeparture: parseKm(kmDeparture) })
      : noCheck

  const departureDate = fromDateTimeLocal(departureTime)
  const returnDate = hasReturned ? fromDateTimeLocal(returnTime) : null
  let dateError = null
  if (log && isAdmin) {
    if (!departureDate) dateError = 'Informe a data de saída.'
    else if (hasReturned && !returnDate) dateError = 'Informe a data de retorno.'
    else if (returnDate && new Date(returnDate) < new Date(departureDate)) {
      dateError = 'A data de retorno não pode ser anterior à data de saída.'
    }
  }

  // Checado só ao salvar (depende da hora atual).
  function hasFutureDate() {
    const limit = Date.now() + FUTURE_TOLERANCE_MS
    return [departureDate, returnDate].some((date) => date && new Date(date).getTime() > limit)
  }

  const logFieldsBlocked =
    isAdmin &&
    (!!departureKmCheck.error || !!returnKmCheck.error || (!!returnKmCheck.warning && !kmWarningAck) || !!dateError)

  // Só manda o que mudou — o backend trata campo ausente como "mantém".
  function buildLogPayload() {
    const payload = {}
    if (vehicle && vehicle.id !== log.vehicleId) payload.vehicleId = vehicle.id
    if (driver && driver.id !== log.driverId) payload.driverId = driver.id
    if (destinationCity?.id) payload.destinationCityId = destinationCity.id
    if (purpose !== (log.purpose ?? '')) payload.purpose = purpose
    if (departureTime !== toDateTimeLocal(log.departureTime)) payload.departureTime = departureDate
    if (hasReturned && returnTime !== toDateTimeLocal(log.returnTime)) payload.returnTime = returnDate
    if (kmChanged) {
      payload.kmDeparture = parseKm(kmDeparture)
      if (hasReturned) payload.kmReturn = parseKm(kmReturn)
      payload.isKmUnavailable = kmUnavailable
    }
    return payload
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError(null)
    // Destino é obrigatório: dá pra trocar, não pra apagar (registro antigo
    // sem destino continua podendo ser salvo sem ele).
    if (isAdmin && !destinationCity && log.destination) {
      setSubmitError('Informe o destino (cidade).')
      return
    }
    if (isAdmin && !vehicle) {
      setSubmitError('Informe o veículo do registro.')
      return
    }
    if (isAdmin && hasDriverSection && detail.driver && !driver) {
      setSubmitError('Informe o motorista do registro.')
      return
    }
    if (logFieldsBlocked) {
      setSubmitError('Corrija os campos destacados antes de salvar.')
      return
    }
    if (isAdmin && hasFutureDate()) {
      setSubmitError('A data não pode estar no futuro.')
      return
    }
    setIsSubmitting(true)
    try {
      if (isAdmin) {
        const payload = buildLogPayload()
        if (Object.keys(payload).length > 0) await api.put(`/fleet-logs/${id}`, payload)
      }
      navigate(`/fleet/${id}`)
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Não foi possível salvar as alterações.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasTowSection = !!(detail && (detail.transportingVehicle || detail.log.transportedByPlate))
  const carriedLogs = detail?.log.carriedLogs ?? []
  const hasCarriedSection = carriedLogs.length > 0 || !!detail?.log.carriedVehiclePlate
  // O veículo levado em cima do guincho não tem motorista.
  const hasDriverSection = !!detail && !detail.log.transportLogId
  let sectionNumber = 1
  const vehicleSectionNumber = sectionNumber++
  const driverSectionNumber = hasDriverSection ? sectionNumber++ : null
  const towSectionNumber = hasTowSection ? sectionNumber++ : null
  const carriedSectionNumber = hasCarriedSection ? sectionNumber++ : null
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
            {isAdmin ? (
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Veículo da frota</label>
                <RecordPicker
                  value={vehicle}
                  onChange={setVehicle}
                  getLabel={vehicleOptionLabel}
                  placeholder="Digite a placa do veículo certo..."
                  emptyText="Nenhum veículo de frota própria encontrado."
                  inputClassName={inputClass}
                  fetchItems={async (term) => {
                    const { data } = await api.get('/vehicles', {
                      params: { search: term.replace(/[^A-Za-z0-9]/g, ''), vehicleType: VEHICLE_TYPE_FLEET, limit: 20 },
                    })
                    return data.data.filter((v) => v.id !== detail.log.transportingVehicleId).slice(0, MAX_SUGGESTIONS)
                  }}
                  renderItem={(option) => (
                    <>
                      <span className="text-[13px] font-semibold text-ink">{formatPlateInput(option.licensePlate)}</span>
                      <span className="text-[11px] text-muted">{brandModelLabel(option)}</span>
                    </>
                  )}
                />
                <p className="text-xs text-muted">{SWAP_HINT}</p>
              </div>
            ) : (
              <div className="flex gap-4">
                <ReadOnlyField label="Placa">{formatPlateInput(detail.vehicle.licensePlate)}</ReadOnlyField>
                <ReadOnlyField label="Marca / Modelo">{brandModelLabel(detail.vehicle)}</ReadOnlyField>
              </div>
            )}
          </div>

          {hasDriverSection && (
            <>
              <hr className="border-gray-200" />
              <div className="flex flex-col gap-2">
                <SectionHeader number={driverSectionNumber} icon={<User className="size-4 text-ink" strokeWidth={1.75} />} title="Motorista" />
                {isAdmin ? (
                  <div className="flex gap-4">
                    <div className="flex flex-1 flex-col gap-1">
                      <label className={labelClass}>Motorista{!detail.driver && ' (registro ficou sem)'}</label>
                      <RecordPicker
                        value={driver}
                        onChange={setDriver}
                        getLabel={(person) => person.name}
                        placeholder="Digite o nome ou CPF do motorista certo..."
                        emptyText="Nenhum motorista encontrado (visitantes e bloqueados não aparecem)."
                        inputClassName={inputClass}
                        fetchItems={async (term) => {
                          const { data } = await api.get('/people', { params: { search: term, blocked: false, limit: 20 } })
                          return data.data.filter((p) => p.personType !== PERSON_TYPE_VISITOR).slice(0, MAX_SUGGESTIONS)
                        }}
                        renderItem={(person) => <span className="text-[13px] font-semibold text-ink">{person.name}</span>}
                      />
                      <p className="text-xs text-muted">{SWAP_HINT}</p>
                    </div>
                    <ReadOnlyField label="CPF" title="Dado do cadastro — corrija em Cadastros > Pessoas">
                      {driver?.cpf ? formatCpf(driver.cpf) : '—'}
                    </ReadOnlyField>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <ReadOnlyField label="Nome Completo">{detail.driver?.name ?? 'Não informado'}</ReadOnlyField>
                    <ReadOnlyField label="CPF">{detail.driver?.cpf ? formatCpf(detail.driver.cpf) : '—'}</ReadOnlyField>
                  </div>
                )}
              </div>
            </>
          )}

          {hasTowSection && (
            <>
              <hr className="border-gray-200" />
              <div className="flex flex-col gap-2">
                <SectionHeader
                  number={towSectionNumber}
                  icon={<Truck className="size-4 text-ink" strokeWidth={1.75} />}
                  title={detail.log.transportLogId ? 'Transportado por (Guincho)' : 'Guincho'}
                />
                {detail.transportingVehicle ? (
                  <div className="flex gap-4">
                    <ReadOnlyField label="Placa" title={TOW_TITLE}>
                      {formatPlateInput(detail.transportingVehicle.licensePlate)}
                    </ReadOnlyField>
                    <div className="flex flex-1 items-end pb-2">
                      {detail.log.transportLogId && (
                        <Link to={`/fleet/${detail.log.transportLogId}/edit`} className="text-[13px] font-semibold text-brand hover:underline">
                          Editar registro do guincho
                        </Link>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    <ReadOnlyField label="Placa (veículo de terceiro)" title={TOW_PLATE_TITLE}>
                      {formatPlateInput(detail.log.transportedByPlate)}
                    </ReadOnlyField>
                    <div className="flex-1" />
                  </div>
                )}
              </div>
            </>
          )}

          {hasCarriedSection && (
            <>
              <hr className="border-gray-200" />
              <div className="flex flex-col gap-2">
                <SectionHeader
                  number={carriedSectionNumber}
                  icon={<Truck className="size-4 text-ink" strokeWidth={1.75} />}
                  title="Veículo Transportado"
                />
                {carriedLogs.map((carried) => (
                  <div key={carried.id} className="flex gap-4">
                    <ReadOnlyField label="Placa" title="Edite pelo registro do próprio veículo transportado">
                      {formatPlateInput(carried.vehicle?.licensePlate)}
                    </ReadOnlyField>
                    <div className="flex flex-1 items-end gap-2 pb-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusBadge(carried.status).className}`}>
                        {statusLabel(carried)}
                      </span>
                      <Link to={`/fleet/${carried.id}/edit`} className="text-[13px] font-semibold text-brand hover:underline">
                        Editar registro dele
                      </Link>
                    </div>
                  </div>
                ))}
                {detail.log.carriedVehiclePlate && (
                  <div className="flex gap-4">
                    <ReadOnlyField label="Placa (veículo de terceiro)" title="Placa de veículo de terceiro não é editável">
                      {formatPlateInput(detail.log.carriedVehiclePlate)}
                    </ReadOnlyField>
                    <div className="flex-1" />
                  </div>
                )}
              </div>
            </>
          )}

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-2">
            <SectionHeader number={destinationSectionNumber} icon={<MapPin className="size-4 text-ink" strokeWidth={1.75} />} title="Destino & Motivo" />
            {isAdmin ? (
              <div className="flex gap-4">
                <div className="flex flex-1 flex-col gap-1">
                  <label className={labelClass}>Destino *</label>
                  <RecordPicker
                    value={destinationCity}
                    onChange={setDestinationCity}
                    getLabel={(city) => city.label ?? formatCityLabel(city)}
                    placeholder="Digite a cidade..."
                    emptyText="Nenhuma cidade encontrada — confira a grafia."
                    inputClassName={inputClass}
                    fetchItems={searchCities}
                    renderItem={(city) => <span className="text-[13px] font-semibold text-ink">{formatCityLabel(city)}</span>}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor="purpose" className={labelClass}>
                    Motivo
                  </label>
                  <input
                    id="purpose"
                    value={purpose}
                    maxLength={255}
                    onChange={(e) => setPurpose(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                <ReadOnlyField label="Destino">{detail.log.destination ?? '—'}</ReadOnlyField>
                <ReadOnlyField label="Motivo">{detail.log.purpose ?? '—'}</ReadOnlyField>
              </div>
            )}
          </div>

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-2">
            <SectionHeader number={registrySectionNumber} icon={<Clock className="size-4 text-ink" strokeWidth={1.75} />} title="Registro de Saída/Retorno" />
            {isAdmin ? (
              <>
                <div className="flex gap-4">
                  <div className="flex flex-1 flex-col gap-1">
                    <label htmlFor="departure-time" className={labelClass}>
                      Data de Saída <span className="normal-case text-muted">— {detail.departureGate.name}</span>
                    </label>
                    <input
                      id="departure-time"
                      type="datetime-local"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                  {hasReturned ? (
                    <div className="flex flex-1 flex-col gap-1">
                      <label htmlFor="return-time" className={labelClass}>
                        Data de Retorno
                        {detail.returnGate && <span className="normal-case text-muted"> — {detail.returnGate.name}</span>}
                      </label>
                      <input
                        id="return-time"
                        type="datetime-local"
                        value={returnTime}
                        onChange={(e) => setReturnTime(e.target.value)}
                        required
                        className={inputClass}
                      />
                    </div>
                  ) : (
                    <ReadOnlyField label="Data de Retorno" title={NOT_RETURNED_TITLE}>
                      ----
                    </ReadOnlyField>
                  )}
                </div>
                {dateError && <p className="text-[13px] font-semibold text-red-600">{dateError}</p>}

                <div className="flex gap-4">
                  <div className="flex flex-1 flex-col gap-1">
                    <label htmlFor="km-departure" className={labelClass}>
                      KM de Saída{!kmUnavailable && <span className="text-red-600"> *</span>}
                    </label>
                    <input
                      id="km-departure"
                      inputMode="numeric"
                      value={kmDeparture}
                      onChange={(e) => {
                        setKmDeparture(e.target.value.replace(/\D/g, ''))
                        setKmWarningAck(false)
                      }}
                      className={inputClass}
                    />
                    <KmFeedbackMessage error={departureKmCheck.error} />
                  </div>
                  {hasReturned ? (
                    <div className="flex flex-1 flex-col gap-1">
                      <label htmlFor="km-return" className={labelClass}>
                        KM de Retorno{!kmUnavailable && <span className="text-red-600"> *</span>}
                      </label>
                      <input
                        id="km-return"
                        inputMode="numeric"
                        value={kmReturn}
                        onChange={(e) => {
                          setKmReturn(e.target.value.replace(/\D/g, ''))
                          setKmWarningAck(false)
                        }}
                        className={inputClass}
                      />
                      <KmFeedbackMessage
                        error={returnKmCheck.error}
                        warning={returnKmCheck.warning}
                        acknowledged={kmWarningAck}
                        onAcknowledge={setKmWarningAck}
                      />
                    </div>
                  ) : (
                    <ReadOnlyField label="KM de Retorno" title={NOT_RETURNED_TITLE}>
                      ----
                    </ReadOnlyField>
                  )}
                </div>
                <KmUnavailableCheckbox checked={kmUnavailable} onChange={setKmUnavailable} />
              </>
            ) : (
              <>
                <div className="flex gap-4">
                  <ReadOnlyField label="Data de Saída">
                    {formatDateTime(detail.log.departureTime)} — {detail.departureGate.name}
                  </ReadOnlyField>
                  <ReadOnlyField label="Data de Retorno">
                    {detail.log.returnTime ? `${formatDateTime(detail.log.returnTime)} — ${detail.returnGate?.name}` : '----'}
                  </ReadOnlyField>
                </div>
                <div className="flex gap-4">
                  <ReadOnlyField label="KM de Saída">{displayKmDeparture(detail.log)}</ReadOnlyField>
                  <ReadOnlyField label="KM de Retorno">{displayKmReturn(detail.log)}</ReadOnlyField>
                </div>
              </>
            )}
          </div>

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <div className="mt-auto flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || logFieldsBlocked}
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
