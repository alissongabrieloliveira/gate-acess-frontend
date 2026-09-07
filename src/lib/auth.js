import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react'
import { api, setAccessToken, setOnUnauthorized } from './api'

const AuthContext = createContext(null)

function decodeAccessToken(token) {
  // Decodifica só o payload (base64url) — a assinatura já foi validada pelo backend.
  const payload = token.split('.')[1]
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
  const { sub, company_id, rules, must_change_password } = JSON.parse(json)
  return { userId: sub, companyId: company_id, rules, mustChangePassword: Boolean(must_change_password) }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  function applyToken(accessToken) {
    setAccessToken(accessToken)
    const decoded = decodeAccessToken(accessToken)
    setUser(decoded)
    // Access token só carrega userId/companyId/rules — nome/e-mail vêm à parte
    // (fire-and-forget) pra não travar o login/refresh caso essa chamada falhe.
    api
      .get(`/users/${decoded.userId}`)
      .then(({ data }) => {
        setUser((current) => (current?.userId === decoded.userId ? { ...current, name: data.name } : current))
      })
      .catch(() => {})
  }

  function clearSession() {
    setAccessToken(null)
    setUser(null)
  }

  useEffect(() => {
    setOnUnauthorized(clearSession)
    // Tenta restaurar a sessão via cookie de refresh (access token só vive em memória).
    api
      .post('/auth/refresh')
      .then(({ data }) => applyToken(data.accessToken))
      .catch(() => clearSession())
      .finally(() => setIsLoading(false))
  }, [])

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    applyToken(data.accessToken)
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => {})
    clearSession()
  }

  // Usado pela tela de Configurações depois de salvar o próprio perfil, pra
  // sidebar/topbar refletirem o nome novo sem precisar de reload de página.
  async function refreshUser() {
    if (!user) return
    const { data } = await api.get(`/users/${user.userId}`)
    setUser((current) => (current ? { ...current, name: data.name } : current))
  }

  // Usado pela tela de troca de senha obrigatória: o access token atual
  // ainda carrega `mustChangePassword: true` (foi emitido antes da troca),
  // então só trocar a senha não basta pra liberar o resto do app — precisa
  // de um token novo. Reaproveita o mesmo /auth/refresh já usado pra
  // restaurar sessão, que relê o campo do banco e emite o token atualizado.
  async function refreshAccessToken() {
    const { data } = await api.post('/auth/refresh')
    applyToken(data.accessToken)
  }

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, isLoading, login, logout, refreshUser, refreshAccessToken }),
    [user, isLoading],
  )

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return context
}
