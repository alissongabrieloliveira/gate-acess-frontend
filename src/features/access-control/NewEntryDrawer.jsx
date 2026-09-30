import { Camera, ChevronDown, ChevronUp, ImageIcon, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { KmFeedbackMessage, KmUnavailableCheckbox } from '../../components/KmFeedback'
import RecordPicker from '../../components/RecordPicker'
import SlideOver from '../../components/SlideOver'
import { MAX_SUGGESTIONS } from '../../components/SuggestionsDropdown'
import { api } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatCpf, formatPlateInput } from '../../lib/format'
import { formatKm, parseKm } from '../../lib/km'
import { checkEntryKm, isKmRequired, VEHICLE_TYPE_FLEET } from './kmRules'
import { openPrintWindow, printReceipt } from './printReceipt'
import { PERSON_TYPE_LABELS } from './useAccessControlData'

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

// Marca/modelo + nº de identificação (quando há) — mostra por que o veículo
// apareceu quando a busca bateu pela identificação.
const vehicleLabel = (vehicle) =>
  [
    [vehicle.brand, vehicle.model].filter(Boolean).join(' ') || 'Sem marca/modelo',
    vehicle.identificationCode && `Nº ${vehicle.identificationCode}`,
  ]
    .filter(Boolean)
    .join(' · ')

/**
 * Pessoa e veículo são sempre escolhidos entre os JÁ cadastrados (busca por
 * nome/CPF e por placa/nº de identificação). Cadastrar é só em Cadastros >
 * Pessoas / Veículos, onde o operador preenche todos os dados — antes esta
 * tela criava cadastros incompletos na hora (só CPF/nome ou só placa).
 */
export default function NewEntryDrawer({ lookups, defaultGateId, onClose, onCreated }) {
  const [person, setPerson] = useState(null)
  const [vehicle, setVehicle] = useState(null)
  // null = o operador ainda não mexeu no campo: aí vale o último KM conhecido
  // do veículo (derivado abaixo, sem efeito), que some sozinho se o veículo mudar.
  const [kmEntryInput, setKmEntryInput] = useState(null)
  const [kmUnavailable, setKmUnavailable] = useState(false)
  const [lastKmInfo, setLastKmInfo] = useState(null)
  // Aviso (não bloqueia) mostrado só depois de tentar confirmar; qualquer
  // mudança no KM zera o "conferi", já que a conferência era do valor anterior.
  const [kmError, setKmError] = useState(null)
  const [kmWarning, setKmWarning] = useState(null)
  const [kmWarningAck, setKmWarningAck] = useState(false)
  const [destinationSectorId, setDestinationSectorId] = useState('')
  const [visitedPerson, setVisitedPerson] = useState(null)
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

  const vehicleCameraInputRef = useRef(null)
  const vehicleFileInputRef = useRef(null)
  const blobUrlRef = useRef(null)

  useEffect(
    () => () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    },
    [],
  )

  // Último KM conhecido do veículo cadastrado (acessos + frota): pré-preenche a
  // entrada e serve de referência pro aviso "menor que o último registrado".
  const vehicleId = vehicle?.id
  useEffect(() => {
    if (!vehicleId) return undefined
    let cancelled = false
    api
      .get(`/access-logs/vehicles/${vehicleId}/last-km`)
      .then(({ data }) => {
        if (!cancelled) setLastKmInfo({ vehicleId, km: data.lastKm })
      })
      .catch(() => {
        // Só conveniência: sem o último KM o operador digita e o backend valida.
      })
    return () => {
      cancelled = true
    }
  }, [vehicleId])
  const lastKm = lastKmInfo && lastKmInfo.vehicleId === vehicleId ? lastKmInfo.km : null
  const kmEntry = kmEntryInput ?? (lastKm != null ? String(lastKm) : '')

  function resetKmFeedback() {
    setKmError(null)
    setKmWarning(null)
    setKmWarningAck(false)
  }

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

  const hasVehicle = !!vehicle
  // KM de entrada só é obrigatório p/ Funcionário (com veículo).
  const kmRequired = isKmRequired({ personType: person?.personType, hasVehicle })
  const personBlocked = !!person?.isBlocked
  const vehicleBlocked = !!vehicle?.isBlocked
  // Funcionário entrando não está visitando ninguém, está indo trabalhar —
  // só Visitante/Prestador (personType 1/2) exigem anfitrião.
  const hostRequired = person?.personType !== 3
  const canSubmit =
    !!person && !personBlocked && destinationSectorId && (!hostRequired || visitedPerson) && !vehicleBlocked

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    if (!canSubmit) {
      setError(`Escolha a pessoa, o setor de destino${hostRequired ? ' e o anfitrião' : ''} para continuar.`)
      return
    }

    // Antes de abrir a janela de impressão: se o KM barrar, não deixa uma
    // janela em branco órfã.
    if (hasVehicle) {
      const kmCheck = checkEntryKm({ raw: kmEntry, unavailable: kmUnavailable, required: kmRequired, lastKm })
      if (kmCheck.error) {
        setKmError(kmCheck.error)
        return
      }
      if (kmCheck.warning && !kmWarningAck) {
        setKmWarning(kmCheck.warning)
        return
      }
    }

    // Precisa abrir a janela AGORA, ainda síncrono dentro do handler do clique
    // — se esperar os POSTs abaixo terminarem, o navegador não reconhece mais
    // window.open() como resultado direto do gesto do usuário e bloqueia como pop-up.
    const printWindow = openPrintWindow()

    setIsSubmitting(true)
    try {
      const { data: log } = await api.post('/access-logs', {
        personId: person.id,
        vehicleId: vehicle?.id,
        destinationSectorId: Number(destinationSectorId),
        visitedPersonId: hostRequired && visitedPerson ? visitedPerson.id : undefined,
        entryGateId: Number(defaultGateId || lookups.gatesList[0]?.id),
        kmEntry: hasVehicle && !kmUnavailable ? (parseKm(kmEntry) ?? undefined) : undefined,
        isKmUnavailable: (hasVehicle && kmUnavailable) || undefined,
      })

      if (vehiclePhotoFile) {
        const formData = new FormData()
        formData.append('photo', vehiclePhotoFile)
        await api.post(`/access-logs/${log.id}/photo`, formData)
      }

      printReceipt(
        {
          personName: person.name,
          personCpf: person.cpf,
          vehiclePlate: vehicle?.licensePlate ?? null,
          visitedPersonName: hostRequired ? visitedPerson?.name : undefined,
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
      subtitle="Acesso de visitante, prestador ou colaborador já cadastrado"
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
            <label className={labelClass}>Nome ou CPF *</label>
            <RecordPicker
              value={person}
              onChange={setPerson}
              getLabel={(option) => option.name}
              placeholder="Digite o nome ou o CPF..."
              emptyText="Ninguém encontrado — cadastre em Cadastros > Pessoas."
              inputClassName={inputClass}
              fetchItems={async (term) => {
                const { data } = await api.get('/people', { params: { search: term, limit: MAX_SUGGESTIONS } })
                return data.data
              }}
              renderItem={(option) => (
                <>
                  <span className="text-[13px] font-semibold text-ink">{option.name}</span>
                  <span className="text-[11px] text-muted">
                    {option.cpf ? formatCpf(option.cpf) : 'Sem CPF'} · {PERSON_TYPE_LABELS[option.personType]}
                    {option.isBlocked ? ' · Bloqueada' : ''}
                  </span>
                </>
              )}
            />
            {person && !personBlocked && (
              <p className="text-xs text-green-700">
                {person.cpf ? `CPF ${formatCpf(person.cpf)}` : 'Sem CPF cadastrado'} · {PERSON_TYPE_LABELS[person.personType]}
              </p>
            )}
            {personBlocked && (
              <p className="text-xs font-semibold text-red-600">
                Pessoa bloqueada: {person.blockReason || 'sem motivo informado'}
              </p>
            )}
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
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Placa ou Nº de Identificação</label>
                <RecordPicker
                  value={vehicle}
                  onChange={(option) => {
                    setVehicle(option)
                    setKmEntryInput(null)
                    resetKmFeedback()
                  }}
                  getLabel={(option) => `${formatPlateInput(option.licensePlate)} — ${vehicleLabel(option)}`}
                  placeholder="Sem veículo — digite a placa ou o nº de identificação..."
                  emptyText="Nenhum veículo encontrado — cadastre em Cadastros > Veículos."
                  inputClassName={inputClass}
                  fetchItems={async (term) => {
                    const { data } = await api.get('/vehicles', { params: { search: term, limit: 20 } })
                    // Frota Própria tem tela exclusiva (Controle de Frota): nunca sugerida aqui.
                    return data.data.filter((v) => v.vehicleType !== VEHICLE_TYPE_FLEET).slice(0, MAX_SUGGESTIONS)
                  }}
                  renderItem={(option) => (
                    <>
                      <span className="text-[13px] font-semibold text-ink">{formatPlateInput(option.licensePlate)}</span>
                      <span className="text-[11px] text-muted">
                        {vehicleLabel(option)}
                        {option.isBlocked ? ' · Bloqueado' : ''}
                      </span>
                    </>
                  )}
                />
                {vehicleBlocked && (
                  <p className="text-xs font-semibold text-red-600">
                    Veículo bloqueado: {vehicle.blockReason || 'sem motivo informado'}
                  </p>
                )}
              </div>

              {hasVehicle && (
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>KM de Entrada{kmRequired ? ' *' : ''}</label>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={kmEntry}
                    disabled={kmUnavailable}
                    onChange={(event) => {
                      setKmEntryInput(event.target.value)
                      resetKmFeedback()
                    }}
                    className={inputClass}
                  />
                  {lastKm != null && <p className="text-xs text-muted">Último KM registrado: {formatKm(lastKm)}</p>}
                  <KmUnavailableCheckbox
                    checked={kmUnavailable}
                    onChange={(checked) => {
                      setKmUnavailable(checked)
                      resetKmFeedback()
                    }}
                  />
                  <KmFeedbackMessage
                    error={kmError}
                    warning={kmWarning}
                    acknowledged={kmWarningAck}
                    onAcknowledge={setKmWarningAck}
                  />
                </div>
              )}

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
              <RecordPicker
                value={visitedPerson}
                onChange={setVisitedPerson}
                getLabel={(person) => person.name}
                placeholder="Digite o nome do funcionário..."
                emptyText="Nenhum funcionário encontrado."
                inputClassName={inputClass}
                fetchItems={async (term) => {
                  const { data } = await api.get('/people', {
                    params: { search: term, personType: 3, limit: MAX_SUGGESTIONS },
                  })
                  return data.data
                }}
                renderItem={(person) => <span className="text-[13px] font-semibold text-ink">{person.name}</span>}
              />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </SlideOver>
  )
}
