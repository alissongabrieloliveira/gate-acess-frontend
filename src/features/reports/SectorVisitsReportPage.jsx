import { FileDown } from 'lucide-react'
import { useState } from 'react'
import { getErrorMessage } from '../../lib/errors'
import { openReportPrintWindow, writeReportPdf } from './exportReportPdf'
import { useSectorVisitsReportData } from './useSectorVisitsReportData'

const EXPORT_COLUMNS = [
  { label: 'Setor', value: (r) => r.name },
  { label: 'Descrição', value: (r) => r.description ?? '—' },
  { label: 'Status', value: (r) => (r.isActive ? 'Ativo' : 'Inativo') },
  { label: 'Visitas', value: (r) => r.count },
  { label: '% do Total', value: (r) => `${r.pct}%` },
]

/**
 * Diferente dos outros relatórios (Acessos/Frota/Pessoas Bloqueadas), este
 * não é uma listagem — é um agregado (quantas visitas cada setor recebeu
 * num período), no mesmo espírito do card "Acessos por Posto de Controle"
 * do Dashboard, só que pro período inteiro escolhido (não só os últimos 7
 * dias) e como tela própria, não um resumo parcial.
 */
export default function SectorVisitsReportPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const normalizedFrom = from || undefined
  // Inclui o dia inteiro selecionado em "Até" — mesmo ajuste já usado nos
  // outros relatórios com filtro de período (Auditoria/Login/Acessos/Frota).
  const normalizedTo = to ? `${to}T23:59:59.999` : undefined

  const { isLoading, error, breakdown, total } = useSectorVisitsReportData({ from: normalizedFrom, to: normalizedTo })

  async function handleExportPdf() {
    const printWindow = openReportPrintWindow()
    if (!printWindow) return
    setIsExportingPdf(true)
    try {
      const filterParts = []
      if (from) filterParts.push(`De: ${new Date(from).toLocaleDateString('pt-BR')}`)
      if (to) filterParts.push(`Até: ${new Date(to).toLocaleDateString('pt-BR')}`)
      filterParts.push(`Total de visitas: ${total}`)
      writeReportPdf({
        printWindow,
        title: 'Relatório de Visitas por Setor',
        subtitle: filterParts.join(' · '),
        columns: EXPORT_COLUMNS,
        rows: breakdown,
      })
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink">Visitas por Setor</h1>
        <p className="text-sm text-muted">Quantidade de acessos registrados por setor de destino, por período.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-[10px] border border-gray-200 bg-white px-3.5 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        />
        <span className="text-sm text-subtle">até</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-[10px] border border-gray-200 bg-white px-3.5 py-2 text-sm text-ink focus:border-brand focus:outline-none"
        />

        <div className="flex-1" />

        <button
          type="button"
          onClick={handleExportPdf}
          disabled={isLoading || isExportingPdf}
          className="flex items-center gap-1.5 rounded-[10px] border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <FileDown className="size-4" strokeWidth={2} />
          {isExportingPdf ? 'Exportando...' : 'Exportar PDF'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600">
          {getErrorMessage(error, 'Não foi possível carregar o relatório de visitas por setor. Tente novamente mais tarde.')}
        </p>
      )}

      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-ink">Total de visitas no período</p>
          <p className="text-base font-bold text-ink">{total}</p>
        </div>

        {isLoading ? null : breakdown.length === 0 ? (
          <p className="text-sm text-muted">Nenhum setor cadastrado.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {breakdown.map((sector) => (
              <div key={sector.id ?? 'sem-setor'} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate font-semibold text-ink">{sector.name}</p>
                    {!sector.isActive && (
                      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="shrink-0 font-semibold text-muted">
                    {sector.count} {sector.count === 1 ? 'visita' : 'visitas'}{' '}
                    <span className="font-normal text-subtle">({sector.pct}%)</span>
                  </p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-brand-50">
                  <div className="h-full rounded bg-brand" style={{ width: `${sector.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
