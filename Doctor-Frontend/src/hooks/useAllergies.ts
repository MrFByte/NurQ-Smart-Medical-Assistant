import { useQuery } from '@tanstack/react-query'
import { fetchPatientAllergies } from '@/lib/patient_data_lib'

export function useAllergies(patientId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['allergies', patientId],
    queryFn: () => fetchPatientAllergies(patientId!),
    enabled: !!patientId && enabled,
  })
}
