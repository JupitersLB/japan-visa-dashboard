import { FC } from 'react'

export const DateGraphSkeleton: FC = () => {
  return (
    <div className="col-span-2 flex flex-col gap-4">
      {/* Prediction Display Box */}
      <div className="bg-neutral rounded-lg p-6 space-y-4 animate-pulse flex flex-col justify-center items-center">
        <div className="h-4 w-1/3 bg-secondary rounded-md"></div>
        <div className="h-6 w-2/3 bg-secondary rounded-md"></div>
      </div>

      {/* Chart Skeleton */}
      <div className="bg-neutral rounded-lg h-96 animate-pulse"></div>
    </div>
  )
}
