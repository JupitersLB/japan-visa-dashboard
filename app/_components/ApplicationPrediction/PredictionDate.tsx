import React, { FC } from 'react'
import { DateTime } from 'luxon'

export const PredictionDisplay: FC<{
  averagePrediction: DateTime | null
  weightedPrediction: DateTime | null
}> = ({ averagePrediction, weightedPrediction }) => {
  const displayText = (() => {
    const validDates = [averagePrediction, weightedPrediction].filter(
      (date) => date?.isValid
    ) as DateTime[]

    if (validDates.length === 0) return '-'

    if (
      validDates.length === 1 ||
      validDates[0].toFormat('MMMM yyyy') ===
        validDates[1]?.toFormat('MMMM yyyy')
    ) {
      return validDates[0].toFormat('MMMM yyyy')
    }

    validDates.sort((a, b) => a.toMillis() - b.toMillis())

    return `${validDates[0].toFormat('MMMM yyyy')} - ${validDates[1].toFormat(
      'MMMM yyyy'
    )}`
  })()

  return (
    <div className="flex flex-col items-center justify-center text-center rounded-lg text-foreground">
      <h2 className="text-base md:text-xl font-semibold">Prediction</h2>
      <p className="text-lg md:text-2xl font-bold">{displayText}</p>
    </div>
  )
}
