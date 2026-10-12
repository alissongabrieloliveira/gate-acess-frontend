import { api } from './api'

// Dados da empresa mudam raramente durante uma sessão — evita um GET
// /companies/me a cada recibo/relatório impresso (o operador pode imprimir
// vários seguidos). Configurações limpa o cache depois de salvar.
let cachedCompany = null
let cachedLogo = null

export async function getCompany() {
  if (cachedCompany) return cachedCompany
  try {
    const { data } = await api.get('/companies/me')
    cachedCompany = data
    return data
  } catch {
    // Sem empresa carregada, o documento cai pro nome genérico em vez de
    // travar a impressão por causa disso.
    return null
  }
}

export function clearCompanyCache() {
  cachedCompany = null
  cachedLogo = null
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Logo da empresa como data URL, pronta pra embutir no HTML impresso. A API
 * devolve uma URL assinada que expira em 1h — embutir os bytes evita uma
 * janela de impressão com imagem quebrada. null sem logo ou se falhar (o
 * documento sai sem logo, nunca deixa de imprimir).
 */
export async function getCompanyLogoDataUrl() {
  if (cachedLogo) return cachedLogo
  const company = await getCompany()
  if (!company?.logo_url) return null
  try {
    const response = await fetch(company.logo_url)
    if (!response.ok) return null
    cachedLogo = await blobToDataUrl(await response.blob())
    return cachedLogo
  } catch {
    return null
  }
}

/**
 * Abre o diálogo de impressão só depois que as imagens da janela (logo,
 * foto) carregaram — senão sairiam em branco no papel/PDF.
 */
export function printWhenReady(printWindow) {
  printWindow.focus()
  const pending = [...printWindow.document.images].filter((img) => !img.complete)
  if (!pending.length) {
    printWindow.print()
    return
  }
  let remaining = pending.length
  const done = () => {
    remaining -= 1
    if (remaining === 0) printWindow.print()
  }
  pending.forEach((img) => {
    img.addEventListener('load', done, { once: true })
    img.addEventListener('error', done, { once: true })
  })
}
