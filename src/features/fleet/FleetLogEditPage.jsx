import { ArrowLeft, Car, Clock, MapPin, Truck, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { KmFeedbackMessage, KmUnavailableCheckbox } from '../../components/KmFeedback'
import { TopBarControls } from '../../components/TopBar'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { fromDateTimeLocal, toDateTimeLocal } from '../../lib/dateTimeInput'
import { getErrorMessage } from '../../lib/errors'
import { formatCpf, formatPlateInput, isValidCpf } from '../../lib/format'
import { parseKm } from '../../lib/km'
import { RULES } from '../../lib/rules'
import { formatPersonName, handleNameChange } from '../../lib/nameCase'
import { checkDepartureKm, checkReturnKm, displayKmDeparture, displayKmReturn } from './kmRules'
import { PERSON_TYPES } from './useFleetData'
import { useFleetLogDetail } from './useFleetLogDetail'

const inputClass = 'h-10 w-full rounded-[10px] border border-gray-200 px-3.5 text-sm font-semibold text-ink focus:border-brand focus:outline-none'
const readOnlyClass = 'h-10 w-full cursor-not-allowed rounded-[10px] border border-gray-200 bg-gray-50 px-3.5 text-sm font-semibold text-muted'
const labelClass = 'text-[11px] font-semibold uppercase text-subtle'
const READONLY_TITLE = 'Somente administradores podem corrigir os dados do registro de frota'
const TOW_PLATE_TITLE = 'Placa de guincho de terceiro não é editável — não é um veículo cadastrado'
const NOT_RETURNED_TITLE = 'Este veículo ainda não retornou — registre o retorno pelo fluxo normal'
// Folga pra diferença de relógio entre o tablet e o servidor (mesma do backend).
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000

const kmToInput = (value) => (value == null ? '' : String(value))
const initialBrandModel = (vehicle) => [vehicle.brand, vehicle.model].filter(Boolean).join(' ')
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
 * Veículo, motorista e guincho cadastrado são editáveis por qualquer operador
 * (PUT /vehicles/:id e PUT /people/:id — cadastros compartilhados). Os dados
 * do registro de frota em si (destino, motivo, KM, datas) só por admin, via
 * PUT /fleet-logs/:id — para os demais ficam visíveis mas bloqueados. Placa
 * de guincho de terceiro (`transportedByPlate`) continua bloqueada pra todos.
 */
export default function FleetLogEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { error, detail } = useFleetLogDetail(id)
  const { user } = useAuth()
  const isAdmin = !!(user?.rules & RULES.ADMIN)
  const [gatesList, setGatesList] = useState([])
  const [selectedGateId, setSelectedGateId] = useState('all')

  const [plate, setPlate] = useState('')
  const [brandModel, setBrandModel] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverCpf, setDriverCpf] = useState('')
  const [driverType, setDriverType] = useState(3)
  const [towPlate, setTowPlate] = useState('')
  const [towBrandModel, setTowBrandModel] = useState('')
  const [destination, setDestination] = useState('')
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
    setPlate(detail.vehicle.licensePlate ?? '')
    setBrandModel(initialBrandModel(detail.vehicle))
    if (detail.driver) {
      setDriverName(detail.driver.name ?? '')
      setDriverCpf(formatCpf(detail.driver.cpf))
      setDriverType(detail.driver.personType)
    }
    if (detail.transportingVehicle) {
      setTowPlate(detail.transportingVehicle.licensePlate ?? '')
      setTowBrandModel(initialBrandModel(detail.transportingVehicle))
    }
    const { log } = detail
    setDestination(log.destination ?? '')
    setPurpose(log.purpose ?? '')
    setKmDeparture(kmToInput(log.kmDeparture))
    setKmReturn(kmToInput(log.kmReturn))
    setKmUnavailable(!!log.isKmUnavailable)
    setDepartureTime(toDateTimeLocal(log.departureTime))
    setReturnTime(toDateTimeLocal(log.returnTime))
  }, [detail])

  const driverCpfDigits = driverCpf.replace(/\D/g, '')
  // CPF é opcional em people — só precisa ser válido quando algo foi
  // digitado, mesmo critério já usado em PersonFormDrawer/AccessLogEditPage.
  // CPF já gravado (mesmo inválido, de cadastro antigo) não trava o
  // formulário — só um CPF novo digitado precisa ser válido.
  const driverCpfIsValid =
    driverCpfDigits.length === 0 ||
    isValidCpf(driverCpfDigits) ||
    driverCpfDigits === (detail?.driver?.cpf ?? '').replace(/\D/g, '')

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
    if (destination !== (log.destination ?? '')) payload.destination = destination
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
    if (detail.driver && !driverCpfIsValid) {
      setSubmitError('CPF do motorista inválido.')
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
      // Só regrava o cadastro que mudou: o campo único "Marca / Modelo" é
      // gravado inteiro em `model`, e regravar sem mudança duplicaria a
      // marca ("Volvo" + "Volvo FH 540").
      if (plate !== (detail.vehicle.licensePlate ?? '') || brandModel !== initialBrandModel(detail.vehicle)) {
        await api.put(`/vehicles/${detail.vehicle.id}`, { licensePlate: plate, model: brandModel || undefined })
      }
      const driverChanged =
        detail.driver &&
        (driverName !== (detail.driver.name ?? '') ||
          driverCpfDigits !== (detail.driver.cpf ?? '').replace(/\D/g, '') ||
          driverType !== detail.driver.personType)
      if (driverChanged) {
        // CPF não é normalizado pelo backend (fica salvo exatamente como
        // chega) — envia só os dígitos, mesmo tratamento já usado no resto
        // do app.
        await api.put(`/people/${detail.driver.id}`, { name: driverName, cpf: driverCpfDigits, personType: driverType })
      }
      const tow = detail.transportingVehicle
      if (tow && (towPlate !== (tow.licensePlate ?? '') || towBrandModel !== initialBrandModel(tow))) {
        await api.put(`/vehicles/${tow.id}`, { licensePlate: towPlate, model: towBrandModel || undefined })
      }
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
                    <input value={driverName} onChange={(e) => handleNameChange(e, formatPersonName, setDriverName)} required className={inputClass} />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <label className={labelClass}>CPF</label>
                    <input value={driverCpf} onChange={(e) => setDriverCpf(formatCpf(e.target.value))} className={inputClass} />
                    {driverCpfDigits.length === 11 && !driverCpfIsValid && (
                      <p className="text-xs text-red-600">CPF inválido</p>
                    )}
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
                    <ReadOnlyField label="Placa (veículo de terceiro)" title={TOW_PLATE_TITLE}>
                      {formatPlateInput(detail.log.transportedByPlate)}
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
                  <label htmlFor="destination" className={labelClass}>
                    Destino
                  </label>
                  <input
                    id="destination"
                    value={destination}
                    maxLength={255}
                    onChange={(e) => setDestination(e.target.value)}
                    className={inputClass}
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
              disabled={isSubmitting || (!!detail.driver && !driverCpfIsValid) || logFieldsBlocked}
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
