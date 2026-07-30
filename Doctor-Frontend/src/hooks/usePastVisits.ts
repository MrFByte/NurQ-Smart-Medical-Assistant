import { useQuery } from '@tanstack/react-query'
import { fetchPatientVisits } from '@/lib/patient_data_lib'

export function usePastVisits(patientId: string | undefined, excludeSessionId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['visits', patientId, excludeSessionId],
    queryFn: () => fetchPatientVisits(patientId!, excludeSessionId),
    enabled: !!patientId && enabled,
  })
}
