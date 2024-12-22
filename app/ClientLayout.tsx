'use client'

import React, { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

interface ClientLayoutProps {
  children: ReactNode
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60 * 24 * 30, // 30 days
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
})

export const ClientLayout = ({ children }: ClientLayoutProps) => (
  <QueryClientProvider client={queryClient}>
    {children}
    {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
  </QueryClientProvider>
)
