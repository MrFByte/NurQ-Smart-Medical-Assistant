import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addPrescription, fetchPrescriptions } from '@/lib/prescriptions_lib'
import { AddPrescriptionPayload } from '@/types'

export function usePrescriptions(sessionId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['prescriptions', sessionId],
    queryFn: () => fetchPrescriptions(sessionId!),
    enabled: !!sessionId && enabled,
  })
}

export function useAddPrescription(sessionId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AddPrescriptionPayload) => addPrescription(sessionId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions', sessionId] })
    },
  })
}
