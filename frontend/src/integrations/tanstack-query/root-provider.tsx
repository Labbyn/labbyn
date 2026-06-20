import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'

export function getContext() {
  const queryClient = new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.hideErrorToast) return

        let errorMessage = 'An unknown error occurred'

        if (isAxiosError<{ detail: string; code: string }>(error)) {
          errorMessage = error.response?.data.detail || error.message
        } else if (error instanceof Error) {
          errorMessage = error.message
        }

        toast.error('Operation failed', { description: errorMessage })
      },
    }),
  })

  return {
    queryClient,
  }
}

export function Provider({
  children,
  queryClient,
}: {
  children: React.ReactNode
  queryClient: QueryClient
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
