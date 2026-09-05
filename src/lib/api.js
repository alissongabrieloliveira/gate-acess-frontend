import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api/v1'

export const api = axios.create({
  baseURL,
  withCredentials: true, // envia o cookie httpOnly do refresh token
})

let accessToken = null
let onUnauthorized = null

export function setAccessToken(token) {
  accessToken = token
}

export function setOnUnauthorized(handler) {
  onUnauthorized = handler
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

let refreshPromise = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error
    const isAuthRoute = config?.url?.startsWith('/auth/')

    if (response?.status !== 401 || isAuthRoute || config._retried) {
      return Promise.reject(error)
    }
    config._retried = true

    try {
      // Coalesce chamadas concorrentes: só um /auth/refresh em voo por vez.
      refreshPromise ??= api.post('/auth/refresh').finally(() => {
        refreshPromise = null
      })
      const { data } = await refreshPromise
      setAccessToken(data.accessToken)
      config.headers.Authorization = `Bearer ${data.accessToken}`
      return api(config)
    } catch (refreshError) {
      setAccessToken(null)
      onUnauthorized?.()
      return Promise.reject(refreshError)
    }
  },
)
