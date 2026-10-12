import { describe, expect, it } from 'vitest'
import { buildAlertItems, formatElapsed } from './alerts'

const now = new Date(2026, 9, 12, 15, 0)
const hoursAgo = (hours) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString()

const empty = {
  peopleInsideTooLong: [],
  fleetOnTripTooLong: [],
  gatewayOffline: null,
  recentRetroactive: null,
}

describe('alertas', () => {
  it('formata o tempo decorrido em minutos, horas e, a partir de 48h, em dias', () => {
    expect(formatElapsed(hoursAgo(0.05), now)).toBe('3 min')
    expect(formatElapsed(hoursAgo(13), now)).toBe('13h')
    expect(formatElapsed(hoursAgo(47), now)).toBe('47h')
    expect(formatElapsed(hoursAgo(53), now)).toBe('2d 5h')
    expect(formatElapsed(hoursAgo(72), now)).toBe('3d')
  })

  it('sem dados ou sem alertas -> lista vazia', () => {
    expect(buildAlertItems(null)).toEqual([])
    expect(buildAlertItems(empty, { now })).toEqual([])
  })

  it('gateway primeiro; link para Controle de Portões só para admin', () => {
    const data = {
      ...empty,
      gatewayOffline: { name: 'Gateway', offlineSince: hoursAgo(3) },
      peopleInsideTooLong: [{ logId: 7, entryTime: hoursAgo(13), person: { name: 'Ana' }, vehicle: null }],
    }
    const operatorItems = buildAlertItems(data, { now })
    expect(operatorItems.map((i) => i.key)).toEqual(['gateway', 'access-7'])
    expect(operatorItems[0].to).toBeNull()
    expect(operatorItems[0].description).toContain('3h')
    expect(buildAlertItems(data, { isAdmin: true, now })[0].to).toBe('/gate-control')
  })

  it('pessoa dentro e frota na rua levam ao registro', () => {
    const items = buildAlertItems(
      {
        ...empty,
        peopleInsideTooLong: [
          { logId: 7, entryTime: hoursAgo(13), person: { name: 'Ana' }, vehicle: { licensePlate: 'ABC1D23' } },
        ],
        fleetOnTripTooLong: [
          {
            logId: 9,
            departureTime: hoursAgo(30),
            destination: 'Goiânia - GO',
            isCarried: false,
            vehicle: { licensePlate: 'XYZ9A88', identificationCode: '701' },
            driver: { name: 'Beto' },
          },
        ],
      },
      { now },
    )
    expect(items[0]).toMatchObject({ title: 'Ana dentro há 13h', to: '/access-control/7', group: 'people' })
    expect(items[0].description).toContain('ABC1D23')
    expect(items[1]).toMatchObject({ title: 'XYZ9A88 (Nº 701) na rua há 30h', to: '/fleet/9', group: 'fleet' })
    expect(items[1].description).toContain('Beto · Goiânia - GO')
  })

  it('lançamento retroativo: passagens, quem lançou e motivo', () => {
    const items = buildAlertItems(
      {
        ...empty,
        recentRetroactive: [
          {
            kind: 'ACCESS',
            logId: 3,
            events: [
              { event: 'ENTRY', reason: 'Esqueceu' },
              { event: 'EXIT', reason: 'Esqueceu' },
            ],
            recordedAt: hoursAgo(1),
            operatorName: 'Carla',
            person: { name: 'Ana' },
          },
          {
            kind: 'FLEET',
            logId: 4,
            events: [{ event: 'RETURN', reason: 'Voltou de madrugada' }],
            recordedAt: hoursAgo(2),
            operatorName: null,
            vehicle: { licensePlate: 'XYZ9A88' },
          },
        ],
      },
      { now },
    )
    expect(items[0]).toMatchObject({ title: 'Lançamento retroativo: Ana', to: '/access-control/3' })
    expect(items[0].description).toMatch(/^Entrada e saída · por Carla em .* · Motivo: Esqueceu$/)
    expect(items[1]).toMatchObject({ title: 'Lançamento retroativo: XYZ9A88', to: '/fleet/4' })
    expect(items[1].description).toMatch(/^Retorno · por usuário removido em/)
  })
})
