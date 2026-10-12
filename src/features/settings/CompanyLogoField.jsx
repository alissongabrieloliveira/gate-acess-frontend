import { ImageIcon, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import ConfirmModal from '../../components/ConfirmModal'
import { api } from '../../lib/api'
import { clearCompanyCache } from '../../lib/company'
import { getErrorMessage } from '../../lib/errors'

const MAX_SIZE_BYTES = 2 * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

/**
 * Logo da empresa (sai no recibo de entrada, nos relatórios em PDF e na
 * exportação de dados da LGPD). Envio/remoção imediatos, independentes do
 * "Editar" do formulário — o arquivo vai direto pro POST /companies/me/logo.
 * `canEdit`: só admin; operador só vê.
 */
export default function CompanyLogoField({ logoUrl, canEdit, onChanged }) {
  const inputRef = useRef(null)
  const [error, setError] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)

  async function afterChange() {
    clearCompanyCache()
    await onChanged()
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Use uma imagem PNG, JPG ou WEBP.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('A imagem deve ter no máximo 2MB.')
      return
    }
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('logo', file)
      await api.post('/companies/me/logo', formData)
      await afterChange()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível enviar a logo.'))
    } finally {
      setIsUploading(false)
    }
  }

  async function handleRemove() {
    await api.delete('/companies/me/logo')
    setIsConfirmingRemove(false)
    await afterChange()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-40 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-dashed border-gray-300 bg-canvas p-2">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo da empresa" className="max-h-full max-w-full object-contain" />
          ) : (
            <ImageIcon className="size-6 text-subtle" strokeWidth={1.5} />
          )}
        </div>

        {canEdit ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 rounded-[10px] border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink hover:bg-gray-50 disabled:opacity-60"
              >
                <Upload className="size-4" strokeWidth={2} />
                {isUploading ? 'Enviando...' : logoUrl ? 'Trocar logo' : 'Enviar logo'}
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setIsConfirmingRemove(true)}
                  disabled={isUploading}
                  className="flex items-center gap-2 rounded-[10px] border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <Trash2 className="size-4" strokeWidth={2} />
                  Remover
                </button>
              )}
            </div>
            <p className="text-xs text-muted">
              PNG, JPG ou WEBP, até 2MB.
            </p>
            <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join(',')} onChange={handleFile} className="hidden" />
          </div>
        ) : (
          !logoUrl && <p className="text-sm text-muted">Nenhuma logo cadastrada.</p>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {isConfirmingRemove && (
        <ConfirmModal
          title="Remover logo"
          description="A logo deixa de sair no recibo e nos relatórios. Você pode enviar outra depois."
          confirmLabel="Remover"
          errorMessage="Não foi possível remover a logo."
          onClose={() => setIsConfirmingRemove(false)}
          onConfirm={handleRemove}
        />
      )}
    </div>
  )
}
