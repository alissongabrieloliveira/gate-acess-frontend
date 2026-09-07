import { Camera, Car, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import SlideOver from '../../components/SlideOver'
import { api, toAbsoluteUrl } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatPlateInput } from '../../lib/format'
import { VEHICLE_TYPES } from './useVehiclesData'

const inputClass =
  'w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[13px] text-ink focus:border-brand focus:outline-none disabled:bg-gray-100 disabled:text-muted'
const labelClass = 'text-xs font-semibold text-gray-600'
const MAX_PHOTO_BYTES = 5 * 1024 * 1024 // mesmo limite do multer no backend

function StepBadge({ number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand">
      {number}
    </span>
  )
}

/**
 * Cria ou edita um veículo (POST/PUT /vehicles). Novo veículo nasce
 * "Visitante" por padrão (mesmo default do backend) — o NewEntryDrawer do
 * Controle de Acessos continua cadastrando veículo sem perguntar o tipo,
 * o que hoje faz sentido de verdade (veículo criado ali é sempre de
 * visitante que está entrando).
 */
export default function VehicleFormDrawer({ vehicle, onClose, onSaved }) {
  const [licensePlate, setLicensePlate] = useState(formatPlateInput(vehicle?.licensePlate))
  const [vehicleType, setVehicleType] = useState(vehicle?.vehicleType ?? VEHICLE_TYPES[0].value)
  const [identificationCode, setIdentificationCode] = useState(vehicle?.identificationCode ?? '')
  const [brand, setBrand] = useState(vehicle?.brand ?? '')
  const [model, setModel] = useState(vehicle?.model ?? '')
  const [color, setColor] = useState(vehicle?.color ?? '')
  const [photoFile, setPhotoFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(toAbsoluteUrl(vehicle?.photoUrl))
  const [photoError, setPhotoError] = useState(null)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // POST /vehicles cria o registro (sem foto ainda) — se o upload da foto
  // falhar em seguida, o veículo já existe. Guardamos o id aqui pra um novo
  // clique em "Salvar" virar um PUT + reenvio só da foto, em vez de tentar
  // criar o mesmo veículo de novo (violaria a unicidade de placa).
  const [createdVehicleId, setCreatedVehicleId] = useState(null)

  const cameraInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const blobUrlRef = useRef(null)

  useEffect(
    () => () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    },
    [],
  )

  const editingId = vehicle?.id ?? createdVehicleId
  const isEditing = !!vehicle
  const canSubmit = licensePlate.trim().length > 0

  function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // permite escolher o mesmo arquivo de novo depois
    if (!file) return

    setPhotoError(null)
    if (!file.type.startsWith('image/')) {
      setPhotoError('Selecione um arquivo de imagem.')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('A imagem deve ter no máximo 5MB.')
      return
    }

    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    const url = URL.createObjectURL(file)
    blobUrlRef.current = url
    setPhotoFile(file)
    setPreviewUrl(url)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    if (!canSubmit) {
      setError('Placa é obrigatória.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        licensePlate,
        vehicleType,
        identificationCode: identificationCode.trim() || undefined,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        color: color.trim() || undefined,
      }

      let savedId = editingId
      if (editingId) {
        await api.put(`/vehicles/${editingId}`, payload)
      } else {
        const { data } = await api.post('/vehicles', payload)
        savedId = data.id
        setCreatedVehicleId(savedId)
      }

      if (photoFile) {
        const formData = new FormData()
        formData.append('photo', photoFile)
        await api.post(`/vehicles/${savedId}/photo`, formData)
      }

      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível salvar o veículo.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SlideOver
      title={isEditing ? 'Editar Veículo' : 'Novo Veículo'}
      subtitle={isEditing ? `Placa ${formatPlateInput(vehicle.licensePlate)}` : 'Cadastre um veículo de visitante ou da frota.'}
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
            form="vehicle-form"
            disabled={isSubmitting || !canSubmit}
            className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-brand-50 hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Veículo'}
          </button>
        </>
      }
    >
      <form id="vehicle-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <StepBadge number={1} />
            <p className="text-[13px] font-bold text-ink">Dados do Veículo</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Placa *</label>
            <input
              type="text"
              required
              value={licensePlate}
              onChange={(event) => setLicensePlate(formatPlateInput(event.target.value))}
              placeholder="ABC-1D23"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Tipo de Veículo</label>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setVehicleType(type.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    vehicleType === type.value ? 'bg-brand-50 text-brand' : 'border border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Identificação</label>
            <input
              type="text"
              value={identificationCode}
              onChange={(event) => setIdentificationCode(event.target.value)}
              placeholder="Ex.: 701 (numeração interna da frota)"
              className={inputClass}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label className={labelClass}>Marca</label>
              <input
                type="text"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                placeholder="Fiat"
                className={inputClass}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className={labelClass}>Modelo</label>
              <input
                type="text"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="Cross"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Cor</label>
            <input
              type="text"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              placeholder="Prata"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Foto do Veículo</label>
            <div className="flex items-center gap-3">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
                {previewUrl ? (
                  <img src={previewUrl} alt="Foto do veículo" className="size-full object-cover" />
                ) : (
                  <Car className="size-6 text-gray-400" strokeWidth={1.5} />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Camera className="size-3.5" strokeWidth={1.75} />
                  Tirar Foto
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
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
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            {photoError && <p className="text-xs text-red-600">{photoError}</p>}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </SlideOver>
  )
}
