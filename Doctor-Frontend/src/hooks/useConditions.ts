import { useQuery } from '@tanstack/react-query'
import { fetchPatientConditions } from '@/lib/patient_data_lib'

export function useConditions(patientId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['conditions', patientId],
    queryFn: () => fetchPatientConditions(patientId!),
    enabled: !!patientId && enabled,
  })
}
