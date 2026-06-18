import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../services/api'
import type { UnidadMedida } from '../types'

export function useUnidadesMedida() {
  return useQuery({
    queryKey: ['unidades-medida'],
    queryFn: async (): Promise<UnidadMedida[]> => {
      const res = await apiClient.get('/api/v1/unidades-medida')
      return res.data
    }
  })
}

export function useCreateUnidadMedida() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { nombre: string }) => {
      const res = await apiClient.post('/api/v1/unidades-medida/', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades-medida'] })
    }
  })
}

export function useDeleteUnidadMedida() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete(`/api/v1/unidades-medida/${id}`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades-medida'] })
    }
  })
}
