import axios from 'axios'

const api = axios.create({
  baseURL: `http://${import.meta.env.VITE_API_URL}`,
  headers: {
    Accept: 'application/json',
  },
})

// Request interceptor adds the bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle 401 (Unauthorized) errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api
