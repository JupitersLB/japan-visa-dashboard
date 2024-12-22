import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
  useMutation,
} from '@tanstack/react-query'

export function useJBQuery<
  TData = unknown,
  TError = Error,
  TQueryFnData = TData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> {
  return useQuery(options) // to enable overrides
}

export const useJBMutation = <TData, TError, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: Omit<
    UseMutationOptions<TData, TError, TVariables>,
    'mutationFn'
  > = {}
): UseMutationResult<TData, TError, TVariables> => {
  return useMutation<TData, TError, TVariables>({
    mutationFn,
    ...options, // to enable overrides
  })
}
