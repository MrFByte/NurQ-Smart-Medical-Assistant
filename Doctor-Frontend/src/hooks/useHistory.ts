import { useQuery } from '@tanstack/react-query'
import { fetchPatientHistory } from '@/lib/patient_data_lib'

export function useHistory(patientId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['history', patientId],
    queryFn: () => fetchPatientHistory(patientId!),
    enabled: !!patientId && enabled,
  })
}
