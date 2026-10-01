import { ArrowLeft, Car, Clock, MapPin, Truck, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TopBarControls } from '../../components/TopBar'
import { api } from '../../lib/api'
import { formatPlateInput } from '../../lib/format'
import { noReturnReasonLabel, statusBadge, statusLabel, transportSummary } from './fleetStatus'
import { displayKmDeparture, displayKmReturn } from './kmRules'
import ReturnDrawer from './ReturnDrawer'
import { PERSON_TYPE_LABELS } from './useFleetData'
import { useFleetLogDetail } from './useFleetLogDetail'

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString('pt-BR') : '----'
}

function SectionHeader({ number, icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
        {number}
      </span>
      {icon}
      <p className="text-sm font-bold text-ink">{title}</p>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <p className="text-[11px] font-semibold uppercase text-subtle">{label}</p>
      <p className="text-sm text-ink">{value ?? '—'}</p>
    </div>
  )
}

/**
 * Mesmo formato de `AccessLogDetailPage.jsx` (página própria, não modal —
 * breadcrumb + "Voltar"), adaptado pra `fleet_logs`: sem "Imprimir" (não
 * existe conceito de recibo/ticket pra saída de frota, diferente de
 * access_logs) e com seções extras (Motorista/Transporte) que só existem aqui.
 * Numeração das seções calculada dinamicamente — Veículo é sempre a 1ª,
 * Motorista/Transporte só aparecem quando o registro realmente tem essa
 * informação, então os números seguintes se ajustam. Transporte: no guincho,
 * os veículos levados em cima; no veículo levado, o guincho (com link pro
 * registro dele).
 */
export default function FleetLogDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { error, detail, refetch } = useFleetLogDetail(id)
  const [gatesList, setGatesList] = useState([])
  const [selectedGateId, setSelectedGateId] = useState('all')
  const [isReturnDrawerOpen, setIsReturnDrawerOpen] = useState(false)

  useEffect(() => {
    api.get('/gates', { params: { limit: 100 } }).then(({ data }) => setGatesList(data.data))
  }, [])

  const transport = transportSummary(detail?.log)
  let sectionNumber = 1
  const vehicleSectionNumber = sectionNumber++
  const driverSectionNumber = detail?.driver ? sectionNumber++ : null
  const transportSectionNumber = transport ? sectionNumber++ : null
  const destinationSectionNumber = sectionNumber++
  const registrySectionNumber = sectionNumber++

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-ink">Detalhes do Registro</h1>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Link to="/fleet" className="font-medium hover:underline">
              Controle de Frota
            </Link>
            <span>{'>'}</span>
            <span className="font-semibold">Detalhes do Registro</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink"
          >
            <ArrowLeft className="size-4" strokeWidth={2} />
            Voltar
          </button>
        </div>
        <TopBarControls gates={gatesList} selectedGateId={selectedGateId} onGateChange={setSelectedGateId} />
      </div>

      {error && (
        <p className="text-sm text-red-600">
          Não foi possível carregar este registro. Ele pode não existir ou ter sido removido.
        </p>
      )}

      {detail && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-gray-200 bg-white px-6 pb-4 pt-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <p className="text-lg font-bold text-ink">
              {detail.vehicle.licensePlate ? formatPlateInput(detail.vehicle.licensePlate) : '—'}
            </p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusBadge(detail.log.status).className}`}>
              {statusLabel(detail.log)}
            </span>
          </div>
          <p className="-mt-3 text-[13px] text-subtle">
            {[detail.vehicle.brand, detail.vehicle.model].filter(Boolean).join(' ') || 'Sem marca/modelo cadastrado'}
          </p>

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-2">
            <SectionHeader number={vehicleSectionNumber} icon={<Car className="size-4 text-ink" strokeWidth={1.75} />} title="Veículo" />
            <div className="flex gap-4">
              <Field label="Placa" value={formatPlateInput(detail.vehicle.licensePlate)} />
              <Field label="Marca / Modelo" value={[detail.vehicle.brand, detail.vehicle.model].filter(Boolean).join(' ') || '—'} />
            </div>
          </div>

          {detail.driver && (
            <>
              <hr className="border-gray-200" />
              <div className="flex flex-col gap-2">
                <SectionHeader number={driverSectionNumber} icon={<User className="size-4 text-ink" strokeWidth={1.75} />} title="Motorista" />
                <div className="flex gap-4">
                  <Field label="Nome Completo" value={detail.driver.name} />
                  <Field label="CPF" value={detail.driver.cpf} />
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <p className="text-[11px] font-semibold uppercase text-subtle">Tipo de Pessoa</p>
                    <span className="w-fit rounded-lg bg-brand-50 px-3 py-1.5 text-[13px] font-semibold text-brand">
                      {PERSON_TYPE_LABELS[detail.driver.personType] ?? '—'}
                    </span>
                  </div>
                  <div className="flex-1" />
                </div>
              </div>
            </>
          )}

          {transport && (
            <>
              <hr className="border-gray-200" />
              <div className="flex flex-col gap-2">
                <SectionHeader
                  number={transportSectionNumber}
                  icon={<Truck className="size-4 text-ink" strokeWidth={1.75} />}
                  title={transport.label === 'Levando' ? 'Veículo Transportado' : 'Transportado por (Guincho)'}
                />
                {(detail.log.carriedLogs ?? []).map((carried) => (
                  <div key={carried.id} className="flex items-end gap-4">
                    <Field label="Placa" value={formatPlateInput(carried.vehicle?.licensePlate)} />
                    <Field
                      label="Marca / Modelo"
                      value={[carried.vehicle?.brand, carried.vehicle?.model].filter(Boolean).join(' ') || '—'}
                    />
                    <div className="flex flex-1 items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusBadge(carried.status).className}`}>
                        {statusLabel(carried)}
                      </span>
                      <Link to={`/fleet/${carried.id}`} className="text-[13px] font-semibold text-brand hover:underline">
                        Ver registro
                      </Link>
                    </div>
                  </div>
                ))}
                {detail.log.carriedVehiclePlate && (
                  <div className="flex gap-4">
                    <Field label="Placa" value={formatPlateInput(detail.log.carriedVehiclePlate)} />
                    <Field label="Marca / Modelo" value="Veículo de terceiro (não cadastrado)" />
                    <div className="flex-1" />
                  </div>
                )}
                {detail.transportingVehicle && (
                  <div className="flex items-end gap-4">
                    <Field label="Placa" value={formatPlateInput(detail.transportingVehicle?.licensePlate)} />
                    <Field
                      label="Marca / Modelo"
                      value={[detail.transportingVehicle?.brand, detail.transportingVehicle?.model].filter(Boolean).join(' ') || '—'}
                    />
                    <div className="flex flex-1 items-center">
                      {detail.log.transportLogId && (
                        <Link
                          to={`/fleet/${detail.log.transportLogId}`}
                          className="text-[13px] font-semibold text-brand hover:underline"
                        >
                          Ver registro do guincho
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-2">
            <SectionHeader number={destinationSectionNumber} icon={<MapPin className="size-4 text-ink" strokeWidth={1.75} />} title="Destino & Motivo" />
            <div className="flex gap-4">
              <Field label="Destino" value={detail.log.destination} />
              <Field label="Motivo" value={detail.log.purpose} />
            </div>
          </div>

          <hr className="border-gray-200" />

          <div className="flex flex-col gap-2.5">
            <SectionHeader number={registrySectionNumber} icon={<Clock className="size-4 text-ink" strokeWidth={1.75} />} title="Registro de Saída/Retorno" />
            <div className="flex gap-4">
              <Field label="Data de Saída" value={`${formatDateTime(detail.log.departureTime)} — ${detail.departureGate.name}`} />
              <Field
                label="Data de Retorno"
                value={
                  detail.log.returnTime
                    ? `${formatDateTime(detail.log.returnTime)} — ${detail.returnGate?.name}`
                    : detail.log.noReturnReason
                      ? `Não retorna — ${noReturnReasonLabel(detail.log.noReturnReason)}`
                      : '----'
                }
              />
            </div>
            <div className="flex gap-4">
              <Field label="KM de Saída" value={displayKmDeparture(detail.log)} />
              <Field label="KM de Retorno" value={displayKmReturn(detail.log)} />
            </div>
            <div className="flex gap-4">
              <Field label="Combustível na Saída" value={detail.log.fuelLevelDeparture != null ? `${detail.log.fuelLevelDeparture}%` : '—'} />
              <Field label="Combustível no Retorno" value={detail.log.fuelLevelReturn != null ? `${detail.log.fuelLevelReturn}%` : '—'} />
            </div>
            <div className="flex gap-4">
              <Field label="Observações" value={detail.log.observation} />
              <div className="flex flex-1 flex-col gap-1.5">
                <p className="text-[11px] font-semibold uppercase text-subtle">Status</p>
                <span
                  className={`w-fit rounded-full px-2.5 py-1 text-[13px] font-bold ${statusBadge(detail.log.status).className}`}
                >
                  {statusLabel(detail.log)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-end gap-3 pt-2">
            {detail.log.status === 'ON_TRIP' && (
              <button
                type="button"
                onClick={() => setIsReturnDrawerOpen(true)}
                className="rounded-[10px] bg-brand px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
              >
                Registrar Retorno
              </button>
            )}
            <Link
              to={`/fleet/${id}/edit`}
              className="rounded-[10px] border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Editar Registro
            </Link>
          </div>
        </div>
      )}

      {isReturnDrawerOpen && detail && (
        <ReturnDrawer
          logId={id}
          vehiclePlate={detail.vehicle.licensePlate}
          vehicleLabel={[detail.vehicle.brand, detail.vehicle.model].filter(Boolean).join(' ') || null}
          driverName={detail.driver?.name}
          isCarried={!!detail.log.transportLogId}
          destination={detail.log.destination}
          purpose={detail.log.purpose}
          transport={transport}
          departureTime={detail.log.departureTime}
          kmDeparture={detail.log.kmDeparture}
          defaultGateId={selectedGateId !== 'all' ? selectedGateId : gatesList[0]?.id}
          onClose={() => setIsReturnDrawerOpen(false)}
          onReturned={() => {
            setIsReturnDrawerOpen(false)
            refetch()
          }}
        />
      )}
    </div>
  )
}
