// backend/src/middlewares/errorHandler.js sempre responde { error: mensagem }.
export function getErrorMessage(err, fallback = 'Ocorreu um erro inesperado. Tente novamente.') {
  return err?.response?.data?.error ?? fallback
}
