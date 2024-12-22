import { FC } from 'react'
import { DateGraphSkeleton } from './DateGraphSkeleton'

export const LoadingSkeleton: FC = () => {
  return (
    <div className="w-full flex flex-col md:grid md:grid-cols-3 gap-4 md:gap-8">
      {/* Skeleton for the Form */}
      <div className="col-span-1 bg-neutral rounded-lg p-6 py-16 space-y-4 animate-pulse">
        <div className="flex flex-col gap-y-2">
          <div className="h-4 w-1/3 bg-secondary rounded-md"></div>
          <div className="h-10 w-full bg-secondary rounded-md"></div>
        </div>
        <div className="flex flex-col gap-y-2">
          <div className="h-4 w-1/3 bg-secondary rounded-md"></div>
          <div className="h-10 w-full bg-secondary rounded-md"></div>
        </div>
        <div className="flex flex-col gap-y-2">
          <div className="h-4 w-1/3 bg-secondary rounded-md"></div>
          <div className="h-10 w-full bg-secondary rounded-md"></div>
        </div>
        <div className="h-12 w-full bg-primary/50 dark:bg-primary-dark/50 rounded-md"></div>
      </div>

      {/* Skeleton for the Prediction Display */}
      <DateGraphSkeleton />
    </div>
  )
}
