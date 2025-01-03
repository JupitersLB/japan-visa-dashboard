'use client'

import { useRollbar } from '@rollbar/react'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const rollbar = useRollbar()

  useEffect(() => {
    rollbar.error(error)
  }, [error, rollbar])

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Something went wrong!</h1>
        <button
          className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          onClick={reset}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
