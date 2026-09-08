import { Camera, Upload, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import SlideOver from '../../components/SlideOver'
import { api, toAbsoluteUrl } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { formatCpf, formatPhone, formatRg, isValidCpf } from '../../lib/format'
import { PERSON_TYPES } from './usePeopleData'

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
 * Cria ou edita uma pessoa (POST/PUT /people). Só Nome é obrigatório — CPF/RG/
 * Telefone são opcionais (o schema aceita pessoa sem CPF, ex.: estrangeiro ou
 * criança cadastrada só com RG — mesma decisão já documentada no backend do
 * módulo people). Upload de foto segue exatamente o mesmo fluxo já usado em
 * VehicleFormDrawer (POST /people/:id/photo, endpoint novo desta sessão).
 */
export default function PersonFormDrawer({ person, onClose, onSaved }) {
  const [personType, setPersonType] = useState(person?.personType ?? PERSON_TYPES[0].value)
  const [name, setName] = useState(person?.name ?? '')
  const [cpf, setCpf] = useState(formatCpf(person?.cpf))
  const [rg, setRg] = useState(formatRg(person?.rg))
  const [phone, setPhone] = useState(formatPhone(person?.phone))
  const [photoFile, setPhotoFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(toAbsoluteUrl(person?.photoUrl))
  const [photoError, setPhotoError] = useState(null)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // POST /people cria o registro (sem foto ainda) — se o upload da foto
  // falhar em seguida, a pessoa já existe. Guardamos o id aqui pra um novo
  // clique em "Salvar" virar um PUT + reenvio só da foto, em vez de tentar
  // criar a mesma pessoa de novo — mesmo padrão de VehicleFormDrawer.
  const [createdPersonId, setCreatedPersonId] = useState(null)

  const cameraInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const blobUrlRef = useRef(null)

  useEffect(
    () => () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    },
    [],
  )

  const editingId = person?.id ?? createdPersonId
  const isEditing = !!person
  const cpfDigits = cpf.replace(/\D/g, '')
  // CPF é opcional (nem toda pessoa tem — estrangeiro/criança só com RG),
  // então só precisa ser válido quando algo foi digitado.
  const cpfIsValid = cpfDigits.length === 0 || isValidCpf(cpfDigits)
  const canSubmit = name.trim().length > 0 && cpfIsValid

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
      setError(!name.trim() ? 'Nome é obrigatório.' : 'CPF inválido.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        personType,
        name: name.trim(),
        // CPF/RG/Telefone não são normalizados pelo backend (ficam salvos
        // exatamente como chegam) — envia só os caracteres crus (sem
        // pontuação), mesmo tratamento já usado no CPF do slide-over "Nova
        // Entrada" do Controle de Acessos.
        cpf: cpf.replace(/\D/g, '') || undefined,
        rg: rg.replace(/[^0-9Xx]/g, '').toUpperCase() || undefined,
        phone: phone.replace(/\D/g, '') || undefined,
      }

      let savedId = editingId
      if (editingId) {
        await api.put(`/people/${editingId}`, payload)
      } else {
        const { data } = await api.post('/people', payload)
        savedId = data.id
        setCreatedPersonId(savedId)
      }

      if (photoFile) {
        const formData = new FormData()
        formData.append('photo', photoFile)
        await api.post(`/people/${savedId}/photo`, formData)
      }

      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível salvar a pessoa.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SlideOver
      title={isEditing ? 'Editar Pessoa' : 'Nova Pessoa'}
      subtitle={isEditing ? name : 'Cadastre um visitante, prestador ou funcionário.'}
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
            form="person-form"
            disabled={isSubmitting || !canSubmit}
            className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-brand-50 hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Pessoa'}
          </button>
        </>
      }
    >
      <form id="person-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <StepBadge number={1} />
            <p className="text-[13px] font-bold text-ink">Dados da Pessoa</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Tipo de Pessoa</label>
            <div className="flex flex-wrap gap-2">
              {PERSON_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setPersonType(type.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    personType === type.value ? 'bg-brand-50 text-brand' : 'border border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Nome *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome completo"
              className={inputClass}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label className={labelClass}>CPF</label>
              <input
                type="text"
                value={cpf}
                onChange={(event) => setCpf(formatCpf(event.target.value))}
                placeholder="123.456.789-10"
                className={inputClass}
              />
              {/* Só avisa quando os 11 dígitos já foram digitados — evita
                  nagging enquanto a pessoa ainda está no meio da digitação. */}
              {cpfDigits.length === 11 && !cpfIsValid && <p className="text-xs text-red-600">CPF inválido</p>}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label className={labelClass}>RG</label>
              <input
                type="text"
                value={rg}
                onChange={(event) => setRg(formatRg(event.target.value))}
                placeholder="12.345.678-9"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Telefone</label>
            <input
              type="text"
              value={phone}
              onChange={(event) => setPhone(formatPhone(event.target.value))}
              placeholder="(00) 00000-0000"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Foto do Visitante</label>
            <div className="flex items-center gap-3">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50">
                {previewUrl ? (
                  <img src={previewUrl} alt="Foto da pessoa" className="size-full object-cover" />
                ) : (
                  <User className="size-6 text-gray-400" strokeWidth={1.5} />
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
