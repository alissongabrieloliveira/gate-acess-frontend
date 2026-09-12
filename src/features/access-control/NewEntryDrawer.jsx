import { Camera, ChevronDown, ChevronUp, ImageIcon, Search, Upload } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import SlideOver from '../../components/SlideOver'
import SuggestionsDropdown, { MAX_SUGGESTIONS } from '../../components/SuggestionsDropdown'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatCpf, formatPlateInput, isValidCpf } from '../../lib/format'
import { openPrintWindow, printReceipt } from './printReceipt'
import { PERSON_TYPE_LABELS, PERSON_TYPES } from './useAccessControlData'

const inputClass =
  'w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[13px] text-ink focus:border-brand focus:outline-none disabled:bg-gray-100 disabled:text-muted'
const labelClass = 'text-xs font-semibold text-gray-600'
const MAX_PHOTO_BYTES = 5 * 1024 * 1024 // mesmo limite do multer no backend (ver PersonFormDrawer)

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
  // Foto da VISITA (tipicamente do veículo entrando), não da pessoa — vive em
  // access_logs.photo_url, não em people.photo_url (ver access-logs.service.js
  // #setPhoto). Por isso nasce sempre vazia (nunca precarrega nada de um
  // cadastro existente) e só é enviada depois que o access_log é criado, já
  // que o endpoint é POST /access-logs/:id/photo.
  const [vehiclePhotoFile, setVehiclePhotoFile] = useState(null)
  const [vehiclePhotoPreviewUrl, setVehiclePhotoPreviewUrl] = useState(null)
  const [vehiclePhotoError, setVehiclePhotoError] = useState(null)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cpfFocused, setCpfFocused] = useState(false)
  const [nameFocused, setNameFocused] = useState(false)
  const [plateFocused, setPlateFocused] = useState(false)

  const cpfInputRef = useRef(null)
  const nameInputRef = useRef(null)
  const plateInputRef = useRef(null)
  const vehicleCameraInputRef = useRef(null)
  const vehicleFileInputRef = useRef(null)
  const blobUrlRef = useRef(null)

  useEffect(
    () => () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    },
    [],
  )

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

  // Só sugere pessoa com CPF cadastrado — selecionar uma preenche o campo
  // CPF com o valor completo, que aciona o `personLookup` normal (o mesmo
  // fluxo de sempre) pra confirmar/travar o registro. Pessoa sem CPF nunca
  // teria como "travar" por esse caminho, e o formulário já exige CPF pra
  // submeter de qualquer forma (ver `canSubmit` abaixo) — não é uma
  // limitação nova introduzida pela busca inteligente.
  const peopleWithCpf = useMemo(() => lookups.people.filter((p) => p.cpf), [lookups.people])

  const cpfDigits = cpf.replace(/\D/g, '')
  const cpfSuggestions = useMemo(() => {
    if (existingPerson || cpfDigits.length < 3) return []
    return peopleWithCpf.filter((p) => p.cpf.replace(/\D/g, '').includes(cpfDigits)).slice(0, MAX_SUGGESTIONS)
  }, [peopleWithCpf, cpfDigits, existingPerson])

  const nameQuery = name.trim().toLowerCase()
  const nameSuggestions = useMemo(() => {
    if (existingPerson || nameQuery.length < 2) return []
    return peopleWithCpf.filter((p) => p.name.toLowerCase().includes(nameQuery)).slice(0, MAX_SUGGESTIONS)
  }, [peopleWithCpf, nameQuery, existingPerson])

  // Só compara por placa (não marca/modelo): o campo já aplica a máscara de
  // placa a cada tecla, então qualquer texto que não pareça placa (ex.:
  // digitar "onix" pra buscar por modelo) chega aqui já deformado pela
  // máscara ("ONI-X") — comparar contra marca/modelo nesse estado sempre
  // falharia. Manter o escopo só na placa evita esse bug.
  const plateDigits = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  const vehicleSuggestions = useMemo(() => {
    if (existingVehicle || plateDigits.length < 2) return []
    return lookups.vehicles
      .filter((v) => v.licensePlate?.toUpperCase().includes(plateDigits))
      .slice(0, MAX_SUGGESTIONS)
  }, [lookups.vehicles, plateDigits, existingVehicle])

  function selectPerson(person) {
    setCpf(formatCpf(person.cpf))
    setName(person.name)
    setPersonType(person.personType)
    cpfInputRef.current?.blur()
    nameInputRef.current?.blur()
  }

  function selectVehicle(vehicle) {
    setPlate(formatPlateInput(vehicle.licensePlate))
    setBrandModel([vehicle.brand, vehicle.model].filter(Boolean).join(' '))
    plateInputRef.current?.blur()
  }

  useEffect(() => {
    if (existingPerson) {
      setName(existingPerson.name)
      setPersonType(existingPerson.personType)
    }
  }, [existingPerson])

  function handleVehiclePhotoChange(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // permite escolher o mesmo arquivo de novo depois
    if (!file) return

    setVehiclePhotoError(null)
    if (!file.type.startsWith('image/')) {
      setVehiclePhotoError('Selecione um arquivo de imagem.')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setVehiclePhotoError('A imagem deve ter no máximo 5MB.')
      return
    }

    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    const url = URL.createObjectURL(file)
    blobUrlRef.current = url
    setVehiclePhotoFile(file)
    setVehiclePhotoPreviewUrl(url)
  }

  useEffect(() => {
    if (existingVehicle) {
      setBrandModel([existingVehicle.brand, existingVehicle.model].filter(Boolean).join(' '))
    }
  }, [existingVehicle])

  const hasVehicle = plate.trim().length > 0
  const personBlocked = existingPerson?.isBlocked
  const vehicleBlocked = existingVehicle?.isBlocked
  const newEntryCpfDigits = cpf.replace(/\D/g, '')
  // Pessoa já cadastrada (existingPerson): o CPF vem travado com um valor já
  // existente no banco, não precisa revalidar aqui. Pessoa nova: precisa
  // passar no dígito verificador antes de tentar criar via POST /people.
  const newEntryCpfIsValid = !!existingPerson || isValidCpf(newEntryCpfDigits)
  // Funcionário entrando não está visitando ninguém, está indo trabalhar —
  // só Visitante/Prestador (personType 1/2) exigem anfitrião.
  const hostRequired = personType !== 3
  const hostOptions = useMemo(() => lookups.people.filter((p) => p.personType === 3), [lookups.people])
  const canSubmit =
    newEntryCpfDigits.length >= 11 &&
    newEntryCpfIsValid &&
    name.trim() &&
    destinationSectorId &&
    (!hostRequired || visitedPersonId) &&
    !personBlocked &&
    !vehicleBlocked

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    if (!canSubmit) {
      setError(
        newEntryCpfDigits.length >= 11 && !newEntryCpfIsValid
          ? 'CPF inválido.'
          : `Preencha CPF, nome, setor de destino${hostRequired ? ' e anfitrião' : ''} para continuar.`
      )
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
        visitedPersonId: visitedPersonId ? Number(visitedPersonId) : undefined,
        entryGateId: Number(defaultGateId || lookups.gatesList[0]?.id),
        kmEntry: kmEntry ? Number(kmEntry) : undefined,
      })

      if (vehiclePhotoFile) {
        const formData = new FormData()
        formData.append('photo', vehiclePhotoFile)
        await api.post(`/access-logs/${log.id}/photo`, formData)
      }

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

          <div className="relative flex flex-col gap-1">
            <label className={labelClass}>CPF *</label>
            <div className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 focus-within:border-brand">
              <input
                ref={cpfInputRef}
                type="text"
                value={cpf}
                onChange={(event) => setCpf(formatCpf(event.target.value))}
                onFocus={() => setCpfFocused(true)}
                onBlur={() => setCpfFocused(false)}
                placeholder="000.000.000-00"
                className="w-full text-[13px] text-ink placeholder:text-gray-400 focus:outline-none"
              />
              <Search className="size-4 shrink-0 text-gray-400" strokeWidth={1.75} />
            </div>
            {cpfFocused && (
              <SuggestionsDropdown
                items={cpfSuggestions}
                onSelect={selectPerson}
                renderItem={(person) => (
                  <>
                    <span className="text-[13px] font-semibold text-ink">{person.name}</span>
                    <span className="text-[11px] text-muted">
                      {formatCpf(person.cpf)} · {PERSON_TYPE_LABELS[person.personType]}
                    </span>
                  </>
                )}
              />
            )}
            {personLookup.status === 'loading' && <p className="text-xs text-muted">Buscando...</p>}
            {personLookup.status === 'found' && !personBlocked && (
              <p className="text-xs text-green-700">Pessoa já cadastrada — dados preenchidos automaticamente.</p>
            )}
            {personBlocked && (
              <p className="text-xs font-semibold text-red-600">
                Pessoa bloqueada: {existingPerson.blockReason || 'sem motivo informado'}
              </p>
            )}
            {personLookup.status === 'not-found' && newEntryCpfIsValid && (
              <p className="text-xs text-muted">CPF não encontrado — preencha os dados para cadastrar.</p>
            )}
            {/* useLookup só dispara com 11+ dígitos, então por aqui o CPF já
                está completo — se não bateu o dígito verificador, é mais útil
                avisar isso do que sugerir cadastrar uma pessoa nova com CPF
                inválido. */}
            {personLookup.status === 'not-found' && !newEntryCpfIsValid && (
              <p className="text-xs text-red-600">CPF inválido.</p>
            )}
          </div>

          <div className="relative flex flex-col gap-1">
            <label className={labelClass}>Nome Completo *</label>
            <input
              ref={nameInputRef}
              type="text"
              required
              value={name}
              disabled={!!existingPerson}
              onChange={(event) => setName(event.target.value)}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              placeholder="Nome completo"
              className={inputClass}
            />
            {nameFocused && (
              <SuggestionsDropdown
                items={nameSuggestions}
                onSelect={selectPerson}
                renderItem={(person) => (
                  <>
                    <span className="text-[13px] font-semibold text-ink">{person.name}</span>
                    <span className="text-[11px] text-muted">
                      {formatCpf(person.cpf)} · {PERSON_TYPE_LABELS[person.personType]}
                    </span>
                  </>
                )}
              />
            )}
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
                <div className="relative flex flex-1 flex-col gap-1">
                  <label className={labelClass}>Placa</label>
                  <input
                    ref={plateInputRef}
                    type="text"
                    value={plate}
                    onChange={(event) => setPlate(formatPlateInput(event.target.value))}
                    onFocus={() => setPlateFocused(true)}
                    onBlur={() => setPlateFocused(false)}
                    placeholder="ABC-1234"
                    className={inputClass}
                  />
                  {plateFocused && (
                    <SuggestionsDropdown
                      items={vehicleSuggestions}
                      onSelect={selectVehicle}
                      renderItem={(vehicle) => (
                        <>
                          <span className="text-[13px] font-semibold text-ink">
                            {formatPlateInput(vehicle.licensePlate)}
                          </span>
                          <span className="text-[11px] text-muted">
                            {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Sem marca/modelo'}
                          </span>
                        </>
                      )}
                    />
                  )}
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

              {hasVehicle && (
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Foto do Veículo</label>
                  <div className="flex items-center gap-3">
                    <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
                      {vehiclePhotoPreviewUrl ? (
                        <img src={vehiclePhotoPreviewUrl} alt="Foto do veículo" className="size-full object-cover" />
                      ) : (
                        <ImageIcon className="size-6 text-gray-400" strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => vehicleCameraInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Camera className="size-3.5" strokeWidth={1.75} />
                        Tirar Foto
                      </button>
                      <button
                        type="button"
                        onClick={() => vehicleFileInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Upload className="size-3.5" strokeWidth={1.75} />
                        Anexar Foto
                      </button>
                    </div>
                  </div>
                  {/* capture="environment" abre a câmera direto em celular/tablet; sem
                      o atributo, o mesmo input vira um seletor de arquivo comum (galeria) —
                      dois inputs ocultos pra oferecer as duas ações separadamente. */}
                  <input
                    ref={vehicleCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleVehiclePhotoChange}
                    className="hidden"
                  />
                  <input
                    ref={vehicleFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleVehiclePhotoChange}
                    className="hidden"
                  />
                  {vehiclePhotoError && <p className="text-xs text-red-600">{vehiclePhotoError}</p>}
                </div>
              )}
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

          {hostRequired && (
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Pessoa Visitada (Anfitrião) *</label>
              <select
                required
                value={visitedPersonId}
                onChange={(event) => setVisitedPersonId(event.target.value)}
                className={inputClass}
              >
                <option value="">Selecione...</option>
                {hostOptions.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </SlideOver>
  )
}
