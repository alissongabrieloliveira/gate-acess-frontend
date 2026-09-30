import { ArrowLeft, Camera, Car, Clock, MapPin, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { KmFeedbackMessage, KmUnavailableCheckbox } from '../../components/KmFeedback'
import RecordPicker from '../../components/RecordPicker'
import { MAX_SUGGESTIONS } from '../../components/SuggestionsDropdown'
import { TopBarControls } from '../../components/TopBar'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { fromDateTimeLocal, toDateTimeLocal } from '../../lib/dateTimeInput'
import { getErrorMessage } from '../../lib/errors'
import { formatCpf, formatPlateInput } from '../../lib/format'
import { parseKm } from '../../lib/km'
import { RULES } from '../../lib/rules'
import { checkEntryKm, checkExitKm, displayKmEntry, displayKmExit, isKmRequired } from './kmRules'
import { PERSON_TYPES } from './useAccessControlData'
import { useAccessLogDetail } from './useAccessLogDetail'

const inputClass = 'h-10 w-full rounded-[10px] border border-gray-200 px-3.5 text-sm font-semibold text-ink focus:border-brand focus:outline-none'
const readOnlyClass = 'h-10 w-full cursor-not-allowed rounded-[10px] border border-gray-200 bg-gray-50 px-3.5 text-sm font-semibold text-muted'
const labelClass = 'text-[11px] font-semibold uppercase text-subtle'
const READONLY_TITLE = 'Somente administradores podem corrigir os dados do registro de acesso'
const NO_EXIT_TITLE = 'Este acesso ainda não tem saída — registre a saída pelo fluxo normal'
// people.person_type: 3 = Funcionário (anfitrião só pode ser funcionário).
const PERSON_TYPE_EMPLOYEE = 3
// Folga pra diferença de relógio entre o tablet e o servidor (mesma do backend).
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000

const kmToInput = (value) => (value == null ? '' : String(value))
const idToInput = (value) => (value ? String(value) : '')
const brandModelLabel = (vehicle) => [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Sem marca/modelo'
const personTypeLabel = (value) => PERSON_TYPES.find((type) => type.value === value)?.label ?? '—'
const SWAP_HINT = 'Escolha outro cadastro para trocar. Para corrigir nome/CPF/placa, use Cadastros.'
const REGISTRY_TITLE = 'Dado do cadastro — corrija em Cadastros > Pessoas'
// vehicles.vehicle_type: 2 = Frota Própria (não passa pelo Controle de Acessos).
const VEHICLE_TYPE_FLEET = 2

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
 * Tudo aqui é do registro de acesso em si e só o admin corrige (PUT
 * /access-logs/:id); para os demais fica visível mas bloqueado. Pessoa,
 * veículo e anfitrião são TROCADOS por outro cadastro (busca) — nunca editam
 * o cadastro: corrigir nome/CPF/placa é em Cadastros (antes, digitar outro
 * nome aqui renomeava a pessoa indicada errado).
 */
export default function AccessLogEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { error, detail } = useAccessLogDetail(id)
  const { user } = useAuth()
  const isAdmin = !!(user?.rules & RULES.ADMIN)
  const [gatesList, setGatesList] = useState([])
  const [selectedGateId, setSelectedGateId] = useState('all')
  const [person, setPerson] = useState(null)
  const [vehicle, setVehicle] = useState(null)
  const [sectors, setSectors] = useState([])
  const [kmEntry, setKmEntry] = useState('')
  const [kmExit, setKmExit] = useState('')
  const [kmUnavailable, setKmUnavailable] = useState(false)
  const [kmWarningAck, setKmWarningAck] = useState(false)
  const [sectorId, setSectorId] = useState('')
  const [host, setHost] = useState(null)
  const [entryTime, setEntryTime] = useState('')
  const [exitTime, setExitTime] = useState('')
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    api.get('/gates', { params: { limit: 100 } }).then(({ data }) => setGatesList(data.data))
  }, [])

  useEffect(() => {
    if (!isAdmin) return
    api.get('/sectors', { params: { limit: 100 } }).then(({ data }) => setSectors(data.data))
  }, [isAdmin])

  useEffect(() => {
    if (!detail) return
    setPerson(detail.person)
    setVehicle(detail.vehicle ?? null)
    const { log } = detail
    setKmEntry(kmToInput(log.kmEntry))
    setKmExit(kmToInput(log.kmExit))
    setKmUnavailable(!!log.isKmUnavailable)
    setSectorId(idToInput(log.destinationSectorId))
    setHost(detail.visitedPerson ?? null)
    setEntryTime(toDateTimeLocal(log.entryTime))
    setExitTime(toDateTimeLocal(log.exitTime))
  }, [detail])

  const log = detail?.log
  const isFinished = !!log?.exitTime
  const kmChanged =
    !!log &&
    (kmEntry !== kmToInput(log.kmEntry) ||
      (isFinished && kmExit !== kmToInput(log.kmExit)) ||
      kmUnavailable !== !!log.isKmUnavailable)

  // Mesmas regras da entrada/saída (o backend é a fonte da verdade). Só
  // valida quando o KM foi mexido — registro antigo sem KM pode ter o setor
  // corrigido sem exigir KM, igual ao backend. Na edição "KM indisponível"
  // só dispensa a obrigatoriedade, sem apagar números já informados.
  const kmRequired = !!detail && isKmRequired({ personType: person?.personType, hasVehicle: !!vehicle }) && !kmUnavailable
  const noCheck = { error: null, warning: null }
  const entryKmCheck = kmChanged
    ? checkEntryKm({ raw: kmEntry, unavailable: false, required: kmRequired, lastKm: null })
    : noCheck
  const exitKmCheck =
    kmChanged && isFinished
      ? checkExitKm({ raw: kmExit, unavailable: false, required: kmRequired, kmEntry: parseKm(kmEntry) })
      : noCheck

  const entryDate = fromDateTimeLocal(entryTime)
  const exitDate = isFinished ? fromDateTimeLocal(exitTime) : null
  let dateError = null
  if (log && isAdmin) {
    if (!entryDate) dateError = 'Informe a data de entrada.'
    else if (isFinished && !exitDate) dateError = 'Informe a data de saída.'
    else if (exitDate && new Date(exitDate) < new Date(entryDate)) {
      dateError = 'A data de saída não pode ser anterior à data de entrada.'
    }
  }

  // Checado só ao salvar (depende da hora atual).
  function hasFutureDate() {
    const limit = Date.now() + FUTURE_TOLERANCE_MS
    return [entryDate, exitDate].some((date) => date && new Date(date).getTime() > limit)
  }

  const logFieldsBlocked =
    isAdmin &&
    (!!entryKmCheck.error || !!exitKmCheck.error || (!!exitKmCheck.warning && !kmWarningAck) || !!dateError)

  // Só manda o que mudou — o backend trata campo ausente como "mantém".
  function buildLogPayload() {
    const payload = {}
    if (person && person.id !== log.personId) payload.personId = person.id
    const vehicleChanged = (vehicle?.id ?? null) !== (log.vehicleId ?? null)
    if (vehicleChanged) payload.vehicleId = vehicle?.id ?? null
    if (sectorId !== idToInput(log.destinationSectorId)) payload.destinationSectorId = sectorId ? Number(sectorId) : null
    if ((host?.id ?? null) !== (log.visitedPersonId ?? null)) payload.visitedPersonId = host?.id ?? null
    if (entryTime !== toDateTimeLocal(log.entryTime)) payload.entryTime = entryDate
    if (isFinished && exitTime !== toDateTimeLocal(log.exitTime)) payload.exitTime = exitDate
    // Sem veículo o backend limpa o KM; não manda número junto.
    if (kmChanged && vehicle) {
      payload.kmEntry = parseKm(kmEntry)
      if (isFinished) payload.kmExit = parseKm(kmExit)
      payload.isKmUnavailable = kmUnavailable
    }
    return payload
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError(null)
    if (isAdmin && !person) {
      setSubmitError('Informe a pessoa do registro.')
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
        if (Object.keys(payload).length > 0) await api.put(`/access-logs/${id}`, payload)
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
  const hasVehicleSection = !!(detail && (isAdmin || detail.vehicle || detail.log.kmEntry != null || detail.log.kmExit != null))

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-ink">Editar Registro</h1>
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
            <p className="text-xl font-bold text-ink">{detail.person.name}</p>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">Editando</span>
          </div>
          <p className="-mt-3 text-[13px] text-subtle">CPF {detail.person.cpf ?? 'não informado'}</p>

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-2">
            <SectionHeader number={1} icon={<User className="size-4 text-ink" strokeWidth={1.75} />} title="Identificação do Visitante" />
            {isAdmin ? (
              <div className="flex gap-4">
                <div className="flex flex-1 flex-col gap-1">
                  <label className={labelClass}>Pessoa</label>
                  <RecordPicker
                    value={person}
                    onChange={setPerson}
                    getLabel={(option) => option.name}
                    placeholder="Digite o nome ou CPF da pessoa certa..."
                    emptyText="Nenhuma pessoa encontrada."
                    inputClassName={inputClass}
                    fetchItems={async (term) => {
                      const { data } = await api.get('/people', { params: { search: term, limit: MAX_SUGGESTIONS } })
                      return data.data
                    }}
                    renderItem={(option) => (
                      <>
                        <span className="text-[13px] font-semibold text-ink">{option.name}</span>
                        <span className="text-[11px] text-muted">{personTypeLabel(option.personType)}</span>
                      </>
                    )}
                  />
                  <p className="text-xs text-muted">{SWAP_HINT}</p>
                </div>
                <ReadOnlyField label="CPF / Tipo" title={REGISTRY_TITLE}>
                  {person ? `${person.cpf ? formatCpf(person.cpf) : 'Sem CPF'} · ${personTypeLabel(person.personType)}` : '—'}
                </ReadOnlyField>
              </div>
            ) : (
              <div className="flex gap-4">
                <ReadOnlyField label="Nome Completo">{detail.person.name}</ReadOnlyField>
                <ReadOnlyField label="CPF / Tipo">
                  {`${detail.person.cpf ? formatCpf(detail.person.cpf) : 'Sem CPF'} · ${personTypeLabel(detail.person.personType)}`}
                </ReadOnlyField>
              </div>
            )}
          </div>

          {hasVehicleSection && (
            <>
              <hr className="border-gray-200" />
              <div className="flex flex-col gap-2">
                <SectionHeader number={2} icon={<Car className="size-4 text-ink" strokeWidth={1.75} />} title="Veículo" />
                {isAdmin ? (
                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>Veículo</label>
                    <RecordPicker
                      value={vehicle}
                      onChange={setVehicle}
                      getLabel={(option) => `${formatPlateInput(option.licensePlate)} — ${brandModelLabel(option)}`}
                      placeholder="Sem veículo — digite a placa para vincular..."
                      emptyText="Nenhum veículo encontrado (frota própria não entra aqui)."
                      inputClassName={inputClass}
                      fetchItems={async (term) => {
                        const { data } = await api.get('/vehicles', {
                          params: { search: term.replace(/[^A-Za-z0-9]/g, ''), limit: 20 },
                        })
                        return data.data.filter((v) => v.vehicleType !== VEHICLE_TYPE_FLEET).slice(0, MAX_SUGGESTIONS)
                      }}
                      renderItem={(option) => (
                        <>
                          <span className="text-[13px] font-semibold text-ink">{formatPlateInput(option.licensePlate)}</span>
                          <span className="text-[11px] text-muted">{brandModelLabel(option)}</span>
                        </>
                      )}
                    />
                    <p className="text-xs text-muted">
                      {SWAP_HINT} &quot;Trocar&quot; sem escolher outro tira o veículo do registro (e o KM junto).
                    </p>
                  </div>
                ) : (
                  detail.vehicle && (
                    <div className="flex gap-4">
                      <ReadOnlyField label="Placa">{formatPlateInput(detail.vehicle.licensePlate)}</ReadOnlyField>
                      <ReadOnlyField label="Marca / Modelo">{brandModelLabel(detail.vehicle)}</ReadOnlyField>
                    </div>
                  )
                )}
                {isAdmin ? (
                  vehicle && (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-4">
                      <div className="flex flex-1 flex-col gap-1">
                        <label htmlFor="km-entry" className={labelClass}>
                          KM de Entrada{kmRequired && <span className="text-red-600"> *</span>}
                        </label>
                        <input
                          id="km-entry"
                          inputMode="numeric"
                          value={kmEntry}
                          onChange={(e) => {
                            setKmEntry(e.target.value.replace(/\D/g, ''))
                            setKmWarningAck(false)
                          }}
                          className={inputClass}
                        />
                        <KmFeedbackMessage error={entryKmCheck.error} />
                      </div>
                      <div className="flex flex-1 flex-col gap-1">
                        {isFinished ? (
                          <>
                            <label htmlFor="km-exit" className={labelClass}>
                              KM de Saída{kmRequired && <span className="text-red-600"> *</span>}
                            </label>
                            <input
                              id="km-exit"
                              inputMode="numeric"
                              value={kmExit}
                              onChange={(e) => {
                                setKmExit(e.target.value.replace(/\D/g, ''))
                                setKmWarningAck(false)
                              }}
                              className={inputClass}
                            />
                            <KmFeedbackMessage
                              error={exitKmCheck.error}
                              warning={exitKmCheck.warning}
                              acknowledged={kmWarningAck}
                              onAcknowledge={setKmWarningAck}
                            />
                          </>
                        ) : (
                          <ReadOnlyField label="KM de Saída" title={NO_EXIT_TITLE}>
                            ----
                          </ReadOnlyField>
                        )}
                      </div>
                    </div>
                    <KmUnavailableCheckbox checked={kmUnavailable} onChange={setKmUnavailable} />
                  </div>
                  )
                ) : (
                  <div className="flex gap-4">
                    <ReadOnlyField label="KM de Entrada">{displayKmEntry(detail.log)}</ReadOnlyField>
                    <ReadOnlyField label="KM de Saída">{displayKmExit(detail.log)}</ReadOnlyField>
                  </div>
                )}
                {detail.vehicle && (
                  <div className="flex flex-col gap-1">
                    <p className={labelClass}>Foto do Veículo (na Visita)</p>
                    {detail.log.photoUrl ? (
                      <img
                        src={detail.log.photoUrl}
                        alt="Foto do veículo na visita"
                        className="h-24 w-24 rounded-lg border border-gray-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-24 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                        <Camera className="size-3.5 text-gray-400" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-2">
            <SectionHeader
              number={hasVehicleSection ? 3 : 2}
              icon={<MapPin className="size-4 text-ink" strokeWidth={1.75} />}
              title="Destino & Autorização"
            />
            {isAdmin ? (
              <div className="flex gap-4">
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor="sector" className={labelClass}>
                    Setor de Destino
                  </label>
                  <select id="sector" value={sectorId} onChange={(e) => setSectorId(e.target.value)} className={inputClass}>
                    {!log.destinationSectorId && <option value="">—</option>}
                    {detail.sector && !sectors.some((s) => s.id === detail.sector.id) && (
                      <option value={detail.sector.id}>{detail.sector.name}</option>
                    )}
                    {sectors.map((sector) => (
                      <option key={sector.id} value={sector.id}>
                        {sector.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor="host" className={labelClass}>
                    Anfitrião
                  </label>
                  <RecordPicker
                    id="host"
                    value={host}
                    onChange={setHost}
                    getLabel={(person) => person.name}
                    placeholder="Nenhum — digite para buscar um funcionário..."
                    emptyText="Nenhum funcionário encontrado."
                    inputClassName={inputClass}
                    fetchItems={async (term) => {
                      const { data } = await api.get('/people', {
                        params: { search: term, personType: PERSON_TYPE_EMPLOYEE, limit: MAX_SUGGESTIONS },
                      })
                      return data.data
                    }}
                    renderItem={(person) => <span className="text-[13px] font-semibold text-ink">{person.name}</span>}
                  />
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                <ReadOnlyField label="Setor de Destino">{detail.sector?.name ?? '—'}</ReadOnlyField>
                <ReadOnlyField label="Anfitrião">{detail.visitedPerson?.name ?? '—'}</ReadOnlyField>
              </div>
            )}
          </div>

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-2">
            <SectionHeader
              number={hasVehicleSection ? 4 : 3}
              icon={<Clock className="size-4 text-ink" strokeWidth={1.75} />}
              title="Registro de Acesso"
            />
            {isAdmin ? (
              <>
                <div className="flex gap-4">
                  <div className="flex flex-1 flex-col gap-1">
                    <label htmlFor="entry-time" className={labelClass}>
                      Data de Entrada <span className="normal-case text-muted">— {detail.entryGate.name}</span>
                    </label>
                    <input
                      id="entry-time"
                      type="datetime-local"
                      value={entryTime}
                      onChange={(e) => setEntryTime(e.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                  {isFinished ? (
                    <div className="flex flex-1 flex-col gap-1">
                      <label htmlFor="exit-time" className={labelClass}>
                        Data de Saída
                        {detail.exitGate && <span className="normal-case text-muted"> — {detail.exitGate.name}</span>}
                      </label>
                      <input
                        id="exit-time"
                        type="datetime-local"
                        value={exitTime}
                        onChange={(e) => setExitTime(e.target.value)}
                        required
                        className={inputClass}
                      />
                    </div>
                  ) : (
                    <ReadOnlyField label="Data de Saída" title={NO_EXIT_TITLE}>
                      ----
                    </ReadOnlyField>
                  )}
                </div>
                {dateError && <p className="text-[13px] font-semibold text-red-600">{dateError}</p>}
              </>
            ) : (
              <div className="flex gap-4">
                <ReadOnlyField label="Data de Entrada">
                  {formatDateTime(detail.log.entryTime)} — {detail.entryGate.name}
                </ReadOnlyField>
                <ReadOnlyField label="Data de Saída">
                  {detail.log.exitTime ? `${formatDateTime(detail.log.exitTime)} — ${detail.exitGate?.name}` : '----'}
                </ReadOnlyField>
              </div>
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
