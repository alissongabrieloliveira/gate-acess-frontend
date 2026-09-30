import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { useRef, useState } from 'react'
import RecordPicker from '../../components/RecordPicker'
import SlideOver from '../../components/SlideOver'
import SuggestionsDropdown, { MAX_SUGGESTIONS } from '../../components/SuggestionsDropdown'
import { formatCityLabel, searchCities } from '../../hooks/useCitySearch'
import { useRemoteSuggestions } from '../../hooks/useRemoteSuggestions'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatPlateInput } from '../../lib/format'
import { KmFeedbackMessage, KmUnavailableCheckbox } from '../../components/KmFeedback'
import { NO_RETURN_REASONS } from './fleetStatus'
import { checkDepartureKm, formatKm, parseKm } from './kmRules'

const inputClass =
  'w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[13px] text-ink focus:border-brand focus:outline-none disabled:bg-gray-100 disabled:text-muted'
const labelClass = 'text-xs font-semibold text-gray-600'
// vehicles.vehicle_type: 2 = Frota Própria. people.person_type: 1 = Visitante.
const VEHICLE_TYPE_FLEET = 2
const PERSON_TYPE_VISITOR = 1

const vehicleLabel = (vehicle) => [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Sem marca/modelo'

// Veículos da frota própria cuja placa contém o termo (busca no servidor).
// Vendidos/transferidos (operationStatus != ACTIVE) não saem mais.
async function searchFleetVehicles(term, excludeId) {
  const plateTerm = term.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  const { data } = await api.get('/vehicles', {
    params: { search: plateTerm, vehicleType: VEHICLE_TYPE_FLEET, operationStatus: 'ACTIVE', limit: 20 },
  })
  return data.data.filter((v) => v.id !== excludeId).slice(0, MAX_SUGGESTIONS)
}

function StepBadge({ number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand">
      {number}
    </span>
  )
}

// "Não vai voltar" (vendido/transferido): checkbox + motivo. `value` é o
// motivo escolhido ou null.
function NoReturnField({ value, onChange, subject }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
        <input
          type="checkbox"
          checked={value !== null}
          onChange={(event) => onChange(event.target.checked ? NO_RETURN_REASONS[0].value : null)}
          className="size-4 accent-brand"
        />
        {subject} não vai voltar (vendido/transferido)
      </label>
      {value !== null && (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-[13px] text-ink focus:border-brand focus:outline-none"
        >
          {NO_RETURN_REASONS.map((reason) => (
            <option key={reason.value} value={reason.value}>
              {reason.label}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

/**
 * Regra de negócio diferente do Controle de Acessos: lá, pessoa/veículo
 * podem ser cadastrados na hora (find-or-create). Aqui não — o veículo (e o
 * transportado, quando é da própria frota) só pode ser um já cadastrado como
 * "Frota Própria" em Cadastros > Veículos. Por isso a busca de placa aqui é
 * só um seletor (busca no servidor, sem criar nada inline — o registro
 * selecionado já É a fonte da verdade, não precisa reconfirmar).
 *
 * O veículo principal é sempre o que sai RODANDO, com motorista obrigatório.
 * Quando ele é um guincho/prancha, o que vai em cima entra em "Veículo
 * Transportado" (da frota — ganha registro próprio e volta depois, rodando —
 * ou de terceiro, só a placa).
 */
export default function DepartureDrawer({ lookups, defaultGateId, onClose, onCreated }) {
  const [plate, setPlate] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [driver, setDriver] = useState(null)
  const [noReturnReason, setNoReturnReason] = useState(null)
  const [carriedSectionOpen, setCarriedSectionOpen] = useState(false)
  const [carriedMode, setCarriedMode] = useState('none') // 'none' | 'fleet' | 'third-party'
  const [carriedVehicle, setCarriedVehicle] = useState(null)
  const [carriedPlate, setCarriedPlate] = useState('')
  const [carriedNoReturnReason, setCarriedNoReturnReason] = useState(null)
  // Destino só da lista de cidades (IBGE): texto livre deixava o mesmo lugar
  // gravado de vários jeitos ("Vila", "Vila Propício - GO").
  const [destinationCity, setDestinationCity] = useState(null)
  const [purpose, setPurpose] = useState('')
  const [kmDeparture, setKmDeparture] = useState('')
  const [kmUnavailable, setKmUnavailable] = useState(false)
  // Último KM conhecido do veículo selecionado: pré-preenche o campo e serve
  // de referência pro aviso "menor que o último registrado".
  const [lastKm, setLastKm] = useState(null)
  // Aviso (não bloqueia) mostrado só depois de tentar confirmar; qualquer
  // mudança no KM zera o "conferi", já que a conferência era do valor anterior.
  const [kmError, setKmError] = useState(null)
  const [kmWarning, setKmWarning] = useState(null)
  const [kmWarningAck, setKmWarningAck] = useState(false)
  const [fuelLevelDeparture, setFuelLevelDeparture] = useState('')
  const [observation, setObservation] = useState('')
  const [plateFocused, setPlateFocused] = useState(false)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const plateInputRef = useRef(null)
  // Id do veículo cujo último KM ainda interessa: descarta a resposta de uma
  // consulta atrasada se o operador já trocou/limpou o veículo.
  const lastKmRequestRef = useRef(null)

  const plateDigits = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  const { items: vehicleSuggestions, isLoading: isSearchingVehicles } = useRemoteSuggestions(plateDigits, {
    minLength: 2,
    enabled: !selectedVehicle,
    fetchItems: (term) => searchFleetVehicles(term),
  })

  function resetKmWarning() {
    setKmError(null)
    setKmWarning(null)
    setKmWarningAck(false)
  }

  // O KM pré-preenchido é do veículo anterior se o operador trocar de placa:
  // sempre zera antes de carregar o do novo.
  function resetKm() {
    setKmDeparture('')
    setLastKm(null)
    resetKmWarning()
  }

  async function loadLastKm(vehicleId) {
    try {
      const { data } = await api.get(`/fleet-logs/vehicles/${vehicleId}/last-km`)
      if (lastKmRequestRef.current !== vehicleId) return
      setLastKm(data.lastKm)
      if (data.lastKm != null) setKmDeparture((current) => current || String(data.lastKm))
    } catch {
      // Só conveniência: sem o último KM o operador digita e o backend valida.
    }
  }

  function selectVehicle(vehicle) {
    setSelectedVehicle(vehicle)
    setPlate(formatPlateInput(vehicle.licensePlate))
    plateInputRef.current?.blur()
    resetKm()
    lastKmRequestRef.current = vehicle.id
    loadLastKm(vehicle.id)
  }

  function clearVehicle() {
    setSelectedVehicle(null)
    setPlate('')
    lastKmRequestRef.current = null
    resetKm()
    plateInputRef.current?.focus()
  }

  const vehicleBlocked = selectedVehicle?.isBlocked
  const canSubmit = !!selectedVehicle && !vehicleBlocked && !!driver && !!destinationCity

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    if (!selectedVehicle || vehicleBlocked) {
      setError('Selecione um veículo da frota própria para continuar.')
      return
    }
    if (!driver) {
      setError('Informe o motorista do veículo.')
      return
    }
    if (!destinationCity) {
      setError('Informe o destino (cidade).')
      return
    }
    const kmCheck = checkDepartureKm({ raw: kmDeparture, unavailable: kmUnavailable, lastKm })
    if (kmCheck.error) {
      setKmError(kmCheck.error)
      return
    }
    if (kmCheck.warning && !kmWarningAck) {
      setKmWarning(kmCheck.warning)
      return
    }

    setIsSubmitting(true)
    try {
      await api.post('/fleet-logs', {
        vehicleId: selectedVehicle.id,
        driverId: driver.id,
        noReturnReason: noReturnReason ?? undefined,
        carriedVehicleId: carriedMode === 'fleet' && carriedVehicle ? carriedVehicle.id : undefined,
        carriedVehiclePlate: carriedMode === 'third-party' && carriedPlate.trim() ? carriedPlate : undefined,
        carriedNoReturnReason:
          carriedMode === 'fleet' && carriedVehicle && carriedNoReturnReason ? carriedNoReturnReason : undefined,
        destinationCityId: destinationCity?.id,
        purpose: purpose.trim() || undefined,
        departureGateId: Number(defaultGateId || lookups.gatesList[0]?.id),
        kmDeparture: kmUnavailable ? undefined : parseKm(kmDeparture),
        isKmUnavailable: kmUnavailable || undefined,
        fuelLevelDeparture: fuelLevelDeparture ? Number(fuelLevelDeparture) : undefined,
        observation: observation.trim() || undefined,
      })
      onCreated()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível registrar a saída.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SlideOver
      title="Registrar Saída"
      subtitle="Saída de veículo da frota própria"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="departure-form"
            disabled={isSubmitting || !canSubmit}
            className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-brand-50 hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Registrar Saída'}
          </button>
        </>
      }
    >
      <form id="departure-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 1. Veículo da Frota */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <StepBadge number={1} />
            <p className="text-[13px] font-bold text-ink">Veículo da Frota</p>
          </div>

          <div className="relative flex flex-col gap-1">
            <label className={labelClass}>Placa *</label>
            <div className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 focus-within:border-brand">
              <input
                ref={plateInputRef}
                type="text"
                value={plate}
                disabled={!!selectedVehicle}
                onChange={(event) => {
                  setPlate(formatPlateInput(event.target.value))
                  setSelectedVehicle(null)
                }}
                onFocus={() => setPlateFocused(true)}
                onBlur={() => setPlateFocused(false)}
                placeholder="ABC-1234"
                className="w-full text-[13px] text-ink placeholder:text-gray-400 focus:outline-none disabled:bg-transparent"
              />
              <Search className="size-4 shrink-0 text-gray-400" strokeWidth={1.75} />
            </div>
            {plateFocused && !selectedVehicle && (
              <SuggestionsDropdown
                items={vehicleSuggestions}
                onSelect={selectVehicle}
                renderItem={(vehicle) => (
                  <>
                    <span className="text-[13px] font-semibold text-ink">{formatPlateInput(vehicle.licensePlate)}</span>
                    <span className="text-[11px] text-muted">
                      {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Sem marca/modelo'}
                    </span>
                  </>
                )}
              />
            )}
            {!selectedVehicle && plateDigits.length >= 2 && !isSearchingVehicles && vehicleSuggestions.length === 0 && (
              <p className="text-xs text-muted">
                Nenhum veículo de frota própria encontrado — cadastre em Cadastros &gt; Veículos.
              </p>
            )}
            {selectedVehicle && !vehicleBlocked && (
              <p className="text-xs text-green-700">
                {[selectedVehicle.brand, selectedVehicle.model].filter(Boolean).join(' ') || 'Veículo selecionado'} ·{' '}
                <button type="button" onClick={clearVehicle} className="font-semibold underline">
                  Trocar
                </button>
              </p>
            )}
            {vehicleBlocked && (
              <p className="text-xs font-semibold text-red-600">
                Veículo bloqueado: {selectedVehicle.blockReason || 'sem motivo informado'} ·{' '}
                <button type="button" onClick={clearVehicle} className="font-semibold underline">
                  Trocar
                </button>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Motorista *</label>
            <RecordPicker
              value={driver}
              onChange={setDriver}
              getLabel={(person) => person.name}
              placeholder="Digite o nome ou CPF do motorista..."
              emptyText="Nenhum motorista encontrado (visitantes e bloqueados não aparecem)."
              inputClassName={inputClass}
              fetchItems={async (term) => {
                // Motorista não inclui visitante nem pessoa bloqueada — evita um
                // 403 do backend por algo já detectável no cliente.
                const { data } = await api.get('/people', { params: { search: term, blocked: false, limit: 20 } })
                return data.data.filter((p) => p.personType !== PERSON_TYPE_VISITOR).slice(0, MAX_SUGGESTIONS)
              }}
              renderItem={(person) => <span className="text-[13px] font-semibold text-ink">{person.name}</span>}
            />
          </div>

          <NoReturnField value={noReturnReason} onChange={setNoReturnReason} subject="Este veículo" />
        </div>

        <hr className="border-gray-200" />

        {/* 2. Veículo transportado (opcional) */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setCarriedSectionOpen((value) => !value)}
            className="flex w-full items-center justify-between py-1"
          >
            <span className="flex items-center gap-1.5">
              <StepBadge number={2} />
              <span className="text-[13px] font-bold text-ink">Veículo Transportado (Opcional)</span>
            </span>
            {carriedSectionOpen ? (
              <ChevronUp className="size-4 text-gray-500" strokeWidth={2} />
            ) : (
              <ChevronDown className="size-4 text-gray-500" strokeWidth={2} />
            )}
          </button>

          {carriedSectionOpen && (
            <>
              <p className="-mt-1 text-xs text-muted">
                Preencha só se o veículo acima é um guincho/prancha levando outro veículo em cima.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCarriedMode('fleet')
                    setCarriedPlate('')
                  }}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    carriedMode === 'fleet' ? 'bg-brand-50 text-brand' : 'border border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  Veículo da frota
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCarriedMode('third-party')
                    setCarriedVehicle(null)
                    setCarriedNoReturnReason(null)
                  }}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    carriedMode === 'third-party' ? 'bg-brand-50 text-brand' : 'border border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  Terceiro (só placa)
                </button>
                {carriedMode !== 'none' && (
                  <button
                    type="button"
                    onClick={() => {
                      setCarriedMode('none')
                      setCarriedVehicle(null)
                      setCarriedPlate('')
                      setCarriedNoReturnReason(null)
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500"
                  >
                    Nenhum
                  </button>
                )}
              </div>

              {carriedMode === 'fleet' && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>Veículo em cima do guincho</label>
                    <RecordPicker
                      value={carriedVehicle}
                      onChange={(vehicle) => {
                        setCarriedVehicle(vehicle)
                        if (!vehicle) setCarriedNoReturnReason(null)
                      }}
                      getLabel={(vehicle) => `${formatPlateInput(vehicle.licensePlate)} — ${vehicleLabel(vehicle)}`}
                      placeholder="Digite a placa do veículo transportado..."
                      emptyText="Nenhum veículo de frota própria encontrado."
                      inputClassName={inputClass}
                      fetchItems={(term) => searchFleetVehicles(term, selectedVehicle?.id)}
                      renderItem={(vehicle) => (
                        <>
                          <span className="text-[13px] font-semibold text-ink">{formatPlateInput(vehicle.licensePlate)}</span>
                          <span className="text-[11px] text-muted">{vehicleLabel(vehicle)}</span>
                        </>
                      )}
                    />
                    <p className="text-xs text-muted">
                      Ele também fica &quot;Na Rua&quot; e tem o retorno registrado à parte, quando voltar.
                    </p>
                  </div>
                  {carriedVehicle && (
                    <NoReturnField
                      value={carriedNoReturnReason}
                      onChange={setCarriedNoReturnReason}
                      subject="O veículo transportado"
                    />
                  )}
                </>
              )}

              {carriedMode === 'third-party' && (
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Placa do veículo transportado (terceiro)</label>
                  <input
                    type="text"
                    value={carriedPlate}
                    onChange={(event) => setCarriedPlate(formatPlateInput(event.target.value))}
                    placeholder="ABC-1234"
                    className={inputClass}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <hr className="border-gray-200" />

        {/* 3. Viagem */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <StepBadge number={3} />
            <p className="text-[13px] font-bold text-ink">Viagem</p>
          </div>

          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label className={labelClass}>Destino *</label>
              <RecordPicker
                value={destinationCity}
                onChange={setDestinationCity}
                getLabel={formatCityLabel}
                placeholder="Digite a cidade..."
                emptyText="Nenhuma cidade encontrada — confira a grafia."
                inputClassName={inputClass}
                fetchItems={searchCities}
                renderItem={(city) => <span className="text-[13px] font-semibold text-ink">{formatCityLabel(city)}</span>}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className={labelClass}>Motivo</label>
              <input
                type="text"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder="Ex.: Entrega"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label className={labelClass}>KM de Saída *</label>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={kmDeparture}
                disabled={kmUnavailable}
                onChange={(event) => {
                  setKmDeparture(event.target.value)
                  resetKmWarning()
                }}
                className={inputClass}
              />
              {lastKm != null && (
                <p className="text-xs text-muted">Último KM registrado: {formatKm(lastKm)}</p>
              )}
              <KmUnavailableCheckbox
                checked={kmUnavailable}
                onChange={(checked) => {
                  setKmUnavailable(checked)
                  resetKmWarning()
                }}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className={labelClass}>Combustível na Saída (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={fuelLevelDeparture}
                onChange={(event) => setFuelLevelDeparture(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <KmFeedbackMessage
            error={kmError}
            warning={kmWarning}
            acknowledged={kmWarningAck}
            onAcknowledge={setKmWarningAck}
          />

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Observações</label>
            <textarea
              value={observation}
              onChange={(event) => setObservation(event.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-200 px-2.5 py-2 text-[13px] text-ink focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </SlideOver>
  )
}
