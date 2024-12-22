import { DateTime } from 'luxon'
import { ApplicationType, ImmigrationResponse, StatResponse } from './types'

interface IBurnDownHash {
  month: string
  remainingActual: number | null
  remainingAveragePredictedBurn: number | null
  remainingWeightedPredictedBurn: number | null
  [key: string]: string | number | null // Arbitrary for echarts
}

export interface PredictedData {
  burnDownData: IBurnDownHash[]
  predictedZeroMonthAverage: DateTime | null
  predictedZeroMonthWeighted: DateTime | null
  monthlyAverage: number
  monthlyWeighted: number
}

export const predictionEngine = (
  data: ImmigrationResponse[],
  stats: StatResponse[ApplicationType]
): PredictedData => {
  // Step 1: Filter relevant processing categories and group data by month
  const groupedData = new Map<
    string,
    { total_accepted: number; total_processed: number }
  >()

  data.forEach((entry) => {
    const { processing_category, date, count } = entry

    if (
      processing_category !== 'total_accepted' &&
      processing_category !== 'total_processed'
    )
      return

    const monthKey = DateTime.fromISO(date).toFormat('yyyy-MM')

    if (!groupedData.has(monthKey)) {
      groupedData.set(monthKey, { total_accepted: 0, total_processed: 0 })
    }

    const current = groupedData.get(monthKey)!
    if (processing_category === 'total_accepted') {
      current.total_accepted += count
    } else if (processing_category === 'total_processed') {
      current.total_processed += count
    }
  })

  // Step 2: Sort months in ascending order and initialize burnDownData
  const sortedMonths = Array.from(groupedData.keys()).sort()
  const burnDownData: IBurnDownHash[] = []
  let remaining: number | undefined

  sortedMonths.forEach((monthKey) => {
    const { total_accepted, total_processed } = groupedData.get(monthKey)!

    if (remaining === undefined) {
      remaining = total_accepted
    }

    if (remaining === 0) {
      return
    }

    remaining -= total_processed
    remaining = Math.max(remaining, 0)

    burnDownData.push({
      month: DateTime.fromFormat(monthKey, 'yyyy-MM').toFormat('MMM yyyy'),
      remainingActual: remaining,
      remainingAveragePredictedBurn: null,
      remainingWeightedPredictedBurn: null,
    })
  })

  // If we already reach zero, return early
  if (remaining === 0) {
    const finalMonth = DateTime.fromFormat(
      burnDownData[burnDownData.length - 1].month,
      'MMM yyyy'
    )
    return {
      burnDownData,
      predictedZeroMonthAverage: finalMonth,
      predictedZeroMonthWeighted: finalMonth,
      monthlyAverage: stats?.total_processed?.monthly_average || 0,
      monthlyWeighted: stats?.total_processed?.weighted_monthly_average || 0,
    }
  }

  // Step 3: Fetch averages from stats object
  const monthlyAverage = stats?.total_processed?.monthly_average || 0
  const monthlyWeighted = stats?.total_processed?.weighted_monthly_average || 0

  // Step 4: Generate predictions for both average and weighted burns
  const generatePredictions = (
    startRemaining: number,
    averages: { average: number; weighted: number },
    startMonth: string
  ): IBurnDownHash[] => {
    const predictions: IBurnDownHash[] = []
    let remainingAverage = startRemaining
    let remainingWeighted = startRemaining
    let currentMonth = DateTime.fromFormat(startMonth, 'MMM yyyy').plus({
      months: 1,
    })

    while (remainingAverage > 0 || remainingWeighted > 0) {
      remainingAverage -= averages.average
      remainingWeighted -= averages.weighted
      remainingAverage = Math.max(remainingAverage, 0)
      remainingWeighted = Math.max(remainingWeighted, 0)

      predictions.push({
        month: currentMonth.toFormat('MMM yyyy'),
        remainingActual: null,
        remainingAveragePredictedBurn: remainingAverage,
        remainingWeightedPredictedBurn: remainingWeighted,
      })

      currentMonth = currentMonth.plus({ months: 1 })
    }

    return predictions
  }

  const lastActualRemaining =
    burnDownData.length > 0
      ? burnDownData[burnDownData.length - 1].remainingActual || 0
      : 0

  const lastMonth =
    burnDownData.length > 0
      ? burnDownData[burnDownData.length - 1].month
      : DateTime.now().toFormat('MMM yyyy')

  const predictions = generatePredictions(
    lastActualRemaining,
    { average: monthlyAverage, weighted: monthlyWeighted },
    lastMonth
  )

  // Step 5: Combine actual and predicted data
  const combinedBurnDownData = burnDownData.map((entry, index, array) => {
    const isLastActual = index === array.length - 1

    return {
      ...entry,
      remainingAveragePredictedBurn: isLastActual
        ? entry.remainingActual
        : entry.remainingAveragePredictedBurn,
      remainingWeightedPredictedBurn: isLastActual
        ? entry.remainingActual
        : entry.remainingWeightedPredictedBurn,
    }
  })

  const finalBurnDownData = [...combinedBurnDownData, ...predictions]

  const predictedZeroMonthAverage = predictions.find(
    (pred) => pred.remainingAveragePredictedBurn === 0
  )
    ? DateTime.fromFormat(
        predictions.find((pred) => pred.remainingAveragePredictedBurn === 0)!
          .month,
        'MMM yyyy'
      )
    : null

  const predictedZeroMonthWeighted = predictions.find(
    (pred) => pred.remainingWeightedPredictedBurn === 0
  )
    ? DateTime.fromFormat(
        predictions.find((pred) => pred.remainingWeightedPredictedBurn === 0)!
          .month,
        'MMM yyyy'
      )
    : null

  return {
    burnDownData: finalBurnDownData,
    predictedZeroMonthAverage,
    predictedZeroMonthWeighted,
    monthlyAverage,
    monthlyWeighted,
  }
}
