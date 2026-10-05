// No máximo UMA entrada em aberto por pessoa e por veículo (regra do backend:
// access-logs.service.js#assertNotInside). Aqui é só o aviso antecipado na
// tela — quem garante é a API (e o índice do banco).

function formatEntryTime(value) {
  return new Date(value).toLocaleString('pt-BR')
}

/** Mensagem de bloqueio (ou null) para a pessoa/veículo escolhidos. */
export function openEntryConflicts(activeLogs, { personId, vehicleId }) {
  const conflicts = {}
  const personLog = personId ? activeLogs.find((log) => log.personId === personId) : null
  if (personLog) {
    conflicts.person = `Já está dentro (entrada em ${formatEntryTime(personLog.entryTime)}). Registre a saída antes de uma nova entrada.`
  }
  const vehicleLog = vehicleId ? activeLogs.find((log) => log.vehicleId === vehicleId) : null
  if (vehicleLog) {
    const who = vehicleLog.person?.name ? `, com ${vehicleLog.person.name}` : ''
    conflicts.vehicle = `Veículo já está dentro (entrada em ${formatEntryTime(vehicleLog.entryTime)}${who}). Registre a saída antes de uma nova entrada.`
  }
  return conflicts
}
