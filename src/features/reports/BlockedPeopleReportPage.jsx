import { useState } from 'react'
import { getErrorMessage } from '../../lib/errors'
import { formatCpf } from '../../lib/format'
import { PERSON_TYPE_LABELS } from '../people/usePeopleData'
import { PAGE_SIZE, useBlockedPeopleReportData } from './useBlockedPeopleReportData'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Só leitura — bloquear/desbloquear já é feito em Pessoas (PATCH
// /people/:id/block). Este relatório é pra revisar rápido quem está
// bloqueado e por quê, sem precisar folhear o cadastro inteiro.
export default function BlockedPeopleReportPage() {
  const [page, setPage] = useState(1)
  const { isLoading, error, people, pagination } = useBlockedPeopleReportData({ page })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink">Pessoas Bloqueadas</h1>
        <p className="text-sm text-muted">Visitantes, prestadores e funcionários impedidos de novos acessos.</p>
      </div>

      {error && (
        <p className="text-sm text-red-600">
          {getErrorMessage(error, 'Não foi possível carregar as pessoas bloqueadas. Tente novamente mais tarde.')}
        </p>
      )}

      <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* min-w preserva as larguras fixas das colunas (880px = soma delas)
            em vez de espremê-las — abaixo disso a tabela rola na horizontal
            (overflow-x-auto) ao invés de quebrar o layout num tablet. */}
        <div className="overflow-x-auto">
          <div className="min-w-[880px]">
            <div className="flex justify-between bg-canvas px-5 py-3 text-xs font-bold uppercase text-muted">
              <p className="w-[200px]">Nome</p>
              <p className="w-[130px]">CPF</p>
              <p className="w-[110px]">Tipo</p>
              <p className="w-[280px]">Motivo do Bloqueio</p>
              <p className="w-[160px]">Bloqueado/Atualizado em</p>
            </div>

            {isLoading ? null : people.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted">Nenhuma pessoa bloqueada no momento.</p>
            ) : (
              people.map((person) => (
                <div key={person.id} className="flex items-center justify-between border-t border-gray-200 px-5 py-3.5">
                  <p className="w-[200px] truncate text-sm font-semibold text-ink">{person.name}</p>
                  <p className="w-[130px] text-sm text-gray-700">{person.cpf ? formatCpf(person.cpf) : '—'}</p>
                  <p className="w-[110px] text-sm text-gray-700">{PERSON_TYPE_LABELS[person.personType] ?? '—'}</p>
                  <p className="w-[280px] truncate text-sm text-gray-700" title={person.blockReason ?? ''}>
                    {person.blockReason ?? '—'}
                  </p>
                  <p className="w-[160px] text-[13px] text-gray-700">{formatDate(person.updatedAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-canvas px-5 py-3.5">
          <p className="text-[13px] text-muted">
            {pagination ? `Mostrando ${people.length} de ${pagination.total} registros` : ''}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-[10px] border border-gray-200 bg-white px-4 py-2 text-[13px] font-semibold text-gray-700 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={!pagination || page * PAGE_SIZE >= pagination.total}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-[10px] bg-brand px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
