import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import SlideOver from '../../components/SlideOver'
import SuggestionsDropdown, { MAX_SUGGESTIONS } from '../../components/SuggestionsDropdown'
import { useCitySearch, formatCityLabel } from '../../hooks/useCitySearch'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatPlateInput } from '../../lib/format'

const inputClass =
  'w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[13px] text-ink focus:border-brand focus:outline-none disabled:bg-gray-100 disabled:text-muted'
const labelClass = 'text-xs font-semibold text-gray-600'

function StepBadge({ number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand">
      {number}
    </span>
  )
}

/**
 * Regra de negócio diferente do Controle de Acessos: lá, pessoa/veículo
 * podem ser cadastrados na hora (find-or-create). Aqui não — o veículo (e o
 * guincho, quando é da própria frota) só pode ser um já cadastrado como
 * "Frota Própria" em Cadastros > Veículos. Por isso a busca de placa aqui é
 * só um seletor sobre a amostra já carregada (sem criar nada inline, sem
 * confirmação assíncrona via API — o registro selecionado já É a fonte da
 * verdade, não precisa reconfirmar).
 */
export default function DepartureDrawer({ lookups, defaultGateId, onClose, onCreated }) {
  const [plate, setPlate] = useState('')
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [driverId, setDriverId] = useState('')
  const [towSectionOpen, setTowSectionOpen] = useState(false)
  const [towMode, setTowMode] = useState('none') // 'none' | 'fleet' | 'third-party'
  const [towVehicleId, setTowVehicleId] = useState('')
  const [towPlate, setTowPlate] = useState('')
  const [destination, setDestination] = useState('')
  const [purpose, setPurpose] = useState('')
  const [kmDeparture, setKmDeparture] = useState('')
  const [fuelLevelDeparture, setFuelLevelDeparture] = useState('')
  const [observation, setObservation] = useState('')
  const [plateFocused, setPlateFocused] = useState(false)
  const [destinationFocused, setDestinationFocused] = useState(false)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const plateInputRef = useRef(null)
  const destinationInputRef = useRef(null)

  const citySuggestions = useCitySearch(destination)

  const fleetVehicles = useMemo(() => lookups.vehicles.filter((v) => v.vehicleType === 2), [lookups.vehicles])

  const plateDigits = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  const vehicleSuggestions = useMemo(() => {
    if (selectedVehicle || plateDigits.length < 2) return []
    return fleetVehicles.filter((v) => v.licensePlate?.toUpperCase().includes(plateDigits)).slice(0, MAX_SUGGESTIONS)
  }, [fleetVehicles, plateDigits, selectedVehicle])

  // Motorista não inclui visitante (tipo 1) nem pessoa bloqueada — evita um
  // 403 do backend por algo já detectável no cliente.
  const driverOptions = useMemo(() => lookups.people.filter((p) => p.personType !== 1 && !p.isBlocked), [lookups.people])

  const towFleetOptions = useMemo(
    () => fleetVehicles.filter((v) => v.id !== selectedVehicle?.id),
    [fleetVehicles, selectedVehicle],
  )

  function selectVehicle(vehicle) {
    setSelectedVehicle(vehicle)
    setPlate(formatPlateInput(vehicle.licensePlate))
    plateInputRef.current?.blur()
  }

  function clearVehicle() {
    setSelectedVehicle(null)
    setPlate('')
    plateInputRef.current?.focus()
  }

  function selectCity(city) {
    setDestination(formatCityLabel(city))
    destinationInputRef.current?.blur()
  }

  const vehicleBlocked = selectedVehicle?.isBlocked
  const canSubmit = !!selectedVehicle && !vehicleBlocked

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    if (!canSubmit) {
      setError('Selecione um veículo da frota própria para continuar.')
      return
    }

    setIsSubmitting(true)
    try {
      await api.post('/fleet-logs', {
        vehicleId: selectedVehicle.id,
        driverId: driverId ? Number(driverId) : undefined,
        transportingVehicleId: towMode === 'fleet' && towVehicleId ? Number(towVehicleId) : undefined,
        transportedByPlate: towMode === 'third-party' && towPlate.trim() ? towPlate : undefined,
        destination: destination.trim() || undefined,
        purpose: purpose.trim() || undefined,
        departureGateId: Number(defaultGateId || lookups.gatesList[0]?.id),
        kmDeparture: kmDeparture ? Number(kmDeparture) : undefined,
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
            {!selectedVehicle && plateDigits.length >= 2 && vehicleSuggestions.length === 0 && (
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
            <label className={labelClass}>Motorista</label>
            <select value={driverId} onChange={(event) => setDriverId(event.target.value)} className={inputClass}>
              <option value="">Sem motorista (carga)</option>
              {driverOptions.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* 2. Guincho (opcional) */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setTowSectionOpen((value) => !value)}
            className="flex w-full items-center justify-between py-1"
          >
            <span className="flex items-center gap-1.5">
              <StepBadge number={2} />
              <span className="text-[13px] font-bold text-ink">Guincho (Opcional)</span>
            </span>
            {towSectionOpen ? (
              <ChevronUp className="size-4 text-gray-500" strokeWidth={2} />
            ) : (
              <ChevronDown className="size-4 text-gray-500" strokeWidth={2} />
            )}
          </button>

          {towSectionOpen && (
            <>
              <p className="-mt-1 text-xs text-muted">
                Preencha só se o veículo está sendo transportado (ex.: pane, sinistro).
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTowMode('fleet')
                    setTowPlate('')
                  }}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    towMode === 'fleet' ? 'bg-brand-50 text-brand' : 'border border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  Veículo da frota
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTowMode('third-party')
                    setTowVehicleId('')
                  }}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    towMode === 'third-party' ? 'bg-brand-50 text-brand' : 'border border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  Terceiro (só placa)
                </button>
                {towMode !== 'none' && (
                  <button
                    type="button"
                    onClick={() => {
                      setTowMode('none')
                      setTowVehicleId('')
                      setTowPlate('')
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500"
                  >
                    Nenhum
                  </button>
                )}
              </div>

              {towMode === 'fleet' && (
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Veículo Guincho</label>
                  <select value={towVehicleId} onChange={(event) => setTowVehicleId(event.target.value)} className={inputClass}>
                    <option value="">Selecione...</option>
                    {towFleetOptions.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {formatPlateInput(vehicle.licensePlate)} —{' '}
                        {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Sem marca/modelo'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {towMode === 'third-party' && (
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Placa do Guincho (terceiro)</label>
                  <input
                    type="text"
                    value={towPlate}
                    onChange={(event) => setTowPlate(formatPlateInput(event.target.value))}
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
            <div className="relative flex flex-1 flex-col gap-1">
              <label className={labelClass}>Destino</label>
              <input
                ref={destinationInputRef}
                type="text"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                onFocus={() => setDestinationFocused(true)}
                onBlur={() => setDestinationFocused(false)}
                placeholder="Ex.: São Paulo - SP ou Cliente XPTO"
                className={inputClass}
              />
              {destinationFocused && (
                <SuggestionsDropdown
                  items={citySuggestions}
                  onSelect={selectCity}
                  renderItem={(city) => (
                    <span className="text-[13px] font-semibold text-ink">{formatCityLabel(city)}</span>
                  )}
                />
              )}
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
              <label className={labelClass}>KM de Saída</label>
              <input
                type="number"
                min="0"
                value={kmDeparture}
                onChange={(event) => setKmDeparture(event.target.value)}
                className={inputClass}
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
