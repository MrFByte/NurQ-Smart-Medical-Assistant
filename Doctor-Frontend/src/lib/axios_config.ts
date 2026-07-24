import axios from 'axios'
import { supabase } from './supabase'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If we receive a 401 Unauthorized, we log out and redirect to login
    if (error.response?.status === 401) {
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
