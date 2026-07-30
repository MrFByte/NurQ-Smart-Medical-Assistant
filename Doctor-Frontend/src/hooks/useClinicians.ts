import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addClinician, fetchClinicians } from '@/lib/clinicians_lib'
import { AddClinicianPayload } from '@/types'

export function useClinicians() {
  return useQuery({
    queryKey: ['clinicians'],
    queryFn: fetchClinicians,
  })
}

export function useAddClinician() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AddClinicianPayload) => addClinician(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinicians'] })
    },
  })
}
