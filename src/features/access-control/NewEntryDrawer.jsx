import { Camera, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import SlideOver from '../../components/SlideOver'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatCpf, formatPlateInput } from '../../lib/format'
import { openPrintWindow, printReceipt } from './printReceipt'
import { PERSON_TYPE_LABELS, PERSON_TYPES } from './useAccessControlData'

const inputClass =
  'w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[13px] text-ink focus:border-brand focus:outline-none disabled:bg-gray-100 disabled:text-muted'
const labelClass = 'text-xs font-semibold text-gray-600'

function StepBadge({ number, active }) {
  return (
    <span
      className={`flex size-6 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
        active ? 'bg-brand-50 text-brand' : 'border border-gray-200 text-gray-500'
      }`}
    >
      {number}
    </span>
  )
}

// Debounce simples: só dispara a busca depois que o usuário para de digitar,
// e só a partir de um tamanho mínimo (evita bater na API a cada tecla).
function useLookup(rawValue, minLength, fetcher) {
  const [state, setState] = useState({ status: 'idle', record: null })
  // Guarda a função mais recente sem entrar nas deps do efeito — como é um
  // arrow function literal recriado a cada render do componente pai, colocar
  // `fetcher` nas deps faria o efeito rodar (e o setState disparar outro
  // render) em loop infinito antes do debounce sequer completar.
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    const cleaned = rawValue.replace(/[^a-zA-Z0-9]/g, '')
    if (cleaned.length < minLength) {
      setState({ status: 'idle', record: null })
      return
    }
    setState({ status: 'loading', record: null })
    const timer = setTimeout(async () => {
      try {
        const record = await fetcherRef.current(rawValue)
        setState({ status: record ? 'found' : 'not-found', record })
      } catch {
        setState({ status: 'idle', record: null })
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [rawValue, minLength])

  return state
}

export default function NewEntryDrawer({ lookups, defaultGateId, onClose, onCreated }) {
  const [cpf, setCpf] = useState('')
  const [name, setName] = useState('')
  const [personType, setPersonType] = useState(1)
  const [plate, setPlate] = useState('')
  const [brandModel, setBrandModel] = useState('')
  const [kmEntry, setKmEntry] = useState('')
  const [destinationSectorId, setDestinationSectorId] = useState('')
  const [visitedPersonId, setVisitedPersonId] = useState('')
  const [vehicleSectionOpen, setVehicleSectionOpen] = useState(true)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const personLookup = useLookup(cpf, 11, async (value) => {
    const { data } = await api.get('/people', { params: { cpf: value } })
    return data.data[0] ?? null
  })
  const vehicleLookup = useLookup(plate, 7, async (value) => {
    const { data } = await api.get('/vehicles', { params: { plate: value } })
    return data.data[0] ?? null
  })

  const existingPerson = personLookup.status === 'found' ? personLookup.record : null
  const existingVehicle = vehicleLookup.status === 'found' ? vehicleLookup.record : null

  useEffect(() => {
    if (existingPerson) {
      setName(existingPerson.name)
      setPersonType(existingPerson.personType)
    }
  }, [existingPerson])

  useEffect(() => {
    if (existingVehicle) {
      setBrandModel([existingVehicle.brand, existingVehicle.model].filter(Boolean).join(' '))
    }
  }, [existingVehicle])

  const personBlocked = existingPerson?.isBlocked
  const vehicleBlocked = existingVehicle?.isBlocked
  const canSubmit =
    cpf.replace(/\D/g, '').length >= 11 &&
    name.trim() &&
    destinationSectorId &&
    visitedPersonId &&
    !personBlocked &&
    !vehicleBlocked

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    if (!canSubmit) {
      setError('Preencha CPF, nome, setor de destino e anfitrião para continuar.')
      return
    }

    // Precisa abrir a janela AGORA, ainda síncrono dentro do handler do clique
    // — se esperar os POSTs abaixo terminarem, o navegador não reconhece mais
    // window.open() como resultado direto do gesto do usuário e bloqueia como pop-up.
    const printWindow = openPrintWindow()

    setIsSubmitting(true)
    try {
      let personId = existingPerson?.id
      if (!personId) {
        // Diferente da placa (normalizada no backend antes de gravar), o CPF
        // de people é salvo exatamente como chega — manda só dígitos aqui pra
        // não persistir a pontuação da máscara e quebrar a consistência com
        // os registros existentes (sempre em dígitos crus).
        const { data: newPerson } = await api.post('/people', { personType, name, cpf: cpf.replace(/\D/g, '') })
        personId = newPerson.id
      }

      let vehicleId = existingVehicle?.id
      if (!vehicleId && plate.trim()) {
        const { data: newVehicle } = await api.post('/vehicles', { licensePlate: plate, model: brandModel || undefined })
        vehicleId = newVehicle.id
      }

      const { data: log } = await api.post('/access-logs', {
        personId,
        vehicleId: vehicleId || undefined,
        destinationSectorId: Number(destinationSectorId),
        visitedPersonId: Number(visitedPersonId),
        entryGateId: Number(defaultGateId || lookups.gatesList[0]?.id),
        kmEntry: kmEntry ? Number(kmEntry) : undefined,
      })

      // Não usa enrichLog(log, lookups) aqui: se a pessoa/veículo acabou de
      // ser criado nesta mesma submissão, ainda não está no mapa de lookups
      // (só recarregado depois, via onCreated -> refetch). Os dados do
      // próprio formulário já são a fonte mais atual.
      printReceipt(
        {
          personName: name,
          personCpf: cpf,
          vehiclePlate: plate.trim() || null,
          visitedPersonName: lookups.peopleById.get(Number(visitedPersonId))?.name,
          sectorName: lookups.sectorsById.get(Number(destinationSectorId))?.name,
          entryTime: log.entryTime,
          entryGateName: lookups.gatesById.get(log.entryGateId)?.name,
          exitTime: null,
          exitGateName: null,
          receiptCode: log.receiptCode,
        },
        printWindow,
      )
      onCreated()
    } catch (err) {
      printWindow?.close()
      setError(getErrorMessage(err, 'Não foi possível registrar a entrada.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SlideOver
      title="Nova Entrada"
      subtitle="Cadastrar acesso de visitante, prestador ou colaborador"
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
            form="new-entry-form"
            disabled={isSubmitting || !canSubmit}
            className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-brand-50 hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar e Gerar Ticket'}
          </button>
        </>
      }
    >
      <form id="new-entry-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 1. Identificação da Pessoa */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <StepBadge number={1} active />
            <p className="text-[13px] font-bold text-ink">Identificação da Pessoa</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>CPF *</label>
            <div className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 focus-within:border-brand">
              <input
                type="text"
                value={cpf}
                onChange={(event) => setCpf(formatCpf(event.target.value))}
                placeholder="000.000.000-00"
                className="w-full text-[13px] text-ink placeholder:text-gray-400 focus:outline-none"
              />
              <Search className="size-4 shrink-0 text-gray-400" strokeWidth={1.75} />
            </div>
            {personLookup.status === 'loading' && <p className="text-xs text-muted">Buscando...</p>}
            {personLookup.status === 'found' && !personBlocked && (
              <p className="text-xs text-green-700">Pessoa já cadastrada — dados preenchidos automaticamente.</p>
            )}
            {personBlocked && (
              <p className="text-xs font-semibold text-red-600">
                Pessoa bloqueada: {existingPerson.blockReason || 'sem motivo informado'}
              </p>
            )}
            {personLookup.status === 'not-found' && (
              <p className="text-xs text-muted">CPF não encontrado — preencha os dados para cadastrar.</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Nome Completo *</label>
            <input
              type="text"
              required
              value={name}
              disabled={!!existingPerson}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome completo"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Tipo de Pessoa</label>
            <div className="flex gap-2">
              {PERSON_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  disabled={!!existingPerson}
                  onClick={() => setPersonType(type.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed ${
                    personType === type.value
                      ? 'bg-brand-50 text-brand'
                      : 'border border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Foto do Visitante</label>
            <div
              title="Upload de foto ainda não suportado pelo backend"
              className="flex h-20 w-full cursor-not-allowed flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50"
            >
              <Camera className="size-6 text-gray-500" strokeWidth={1.5} />
              <p className="text-xs text-gray-500">Clique para enviar</p>
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* 2. Veículo (opcional) */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setVehicleSectionOpen((value) => !value)}
            className="flex w-full items-center justify-between py-1"
          >
            <span className="flex items-center gap-1.5">
              <StepBadge number={2} />
              <span className="text-[13px] font-bold text-ink">Veículo (Opcional)</span>
            </span>
            {vehicleSectionOpen ? (
              <ChevronUp className="size-4 text-gray-500" strokeWidth={2} />
            ) : (
              <ChevronDown className="size-4 text-gray-500" strokeWidth={2} />
            )}
          </button>

          {vehicleSectionOpen && (
            <>
              <div className="flex gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <label className={labelClass}>Placa</label>
                  <input
                    type="text"
                    value={plate}
                    onChange={(event) => setPlate(formatPlateInput(event.target.value))}
                    placeholder="ABC-1234"
                    className={inputClass}
                  />
                  {vehicleLookup.status === 'found' && !vehicleBlocked && (
                    <p className="text-xs text-green-700">Veículo já cadastrado.</p>
                  )}
                  {vehicleBlocked && (
                    <p className="text-xs font-semibold text-red-600">
                      Veículo bloqueado: {existingVehicle.blockReason || 'sem motivo informado'}
                    </p>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label className={labelClass}>Marca / Modelo</label>
                  <input
                    type="text"
                    value={brandModel}
                    disabled={!!existingVehicle}
                    onChange={(event) => setBrandModel(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>KM de Entrada</label>
                <input
                  type="number"
                  min="0"
                  value={kmEntry}
                  onChange={(event) => setKmEntry(event.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          )}
        </div>

        <hr className="border-gray-200" />

        {/* 3. Destino & Autorização */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <StepBadge number={3} />
            <p className="text-[13px] font-bold text-ink">Destino &amp; Autorização</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Setor de Destino *</label>
            <select
              required
              value={destinationSectorId}
              onChange={(event) => setDestinationSectorId(event.target.value)}
              className={inputClass}
            >
              <option value="">Selecione...</option>
              {lookups.sectors.map((sector) => (
                <option key={sector.id} value={sector.id}>
                  {sector.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Pessoa Visitada (Anfitrião) *</label>
            <select
              required
              value={visitedPersonId}
              onChange={(event) => setVisitedPersonId(event.target.value)}
              className={inputClass}
            >
              <option value="">Selecione...</option>
              {lookups.people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} — {PERSON_TYPE_LABELS[person.personType]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </SlideOver>
  )
}
