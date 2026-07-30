import { useQuery } from '@tanstack/react-query'
import { fetchPatientMedications } from '@/lib/patient_data_lib'

export function useMedications(patientId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['medications', patientId],
    queryFn: () => fetchPatientMedications(patientId!),
    enabled: !!patientId && enabled,
  })
}
