import { DateTime } from 'luxon'
import {
  ApplicationType,
  IBurnDownHash,
  ImmigrationResponse,
  PredictedData,
  StatResponse,
} from './types'

/**
 * Groups immigration data by month and category.
 *
 * @param data - Array of immigration response data.
 * @returns A map with keys as month (yyyy-MM) and values as total accepted and processed counts.
 */
const groupDataByMonth = (
  data: ImmigrationResponse[]
): Map<string, { total_accepted: number; total_processed: number }> => {
  const groupedData = new Map<
    string,
    { total_accepted: number; total_processed: number }
  >()

  for (const { processing_category, date, count } of data) {
    if (
      processing_category !== 'total_accepted' &&
      processing_category !== 'total_processed'
    )
      continue

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
  }

  return groupedData
}

/**
 * Generates burndown data based on grouped monthly data.
 *
 * @param groupedData - Aggregated data grouped by month.
 * @returns Burndown data and remaining applications after processing.
 */
const generateBurnDownData = (
  groupedData: Map<string, { total_accepted: number; total_processed: number }>
): { burnDownData: IBurnDownHash[]; remaining: number } => {
  const sortedMonths = Array.from(groupedData.keys()).sort()
  const burnDownData: IBurnDownHash[] = []
  let remaining: number | undefined

  for (const monthKey of sortedMonths) {
    const { total_accepted, total_processed } = groupedData.get(monthKey)!

    if (remaining === undefined) {
      remaining = total_accepted
    }

    if (remaining === 0) break

    // Deduct processed applications from remaining
    remaining -= total_processed
    remaining = Math.max(remaining, 0)

    burnDownData.push({
      month: DateTime.fromFormat(monthKey, 'yyyy-MM').toFormat('MMM yyyy'),
      remainingActual: remaining,
      remainingAveragePredictedBurn: null,
      remainingWeightedPredictedBurn: null,
    })
  }

  return { burnDownData, remaining: remaining || 0 }
}

/**
 * Generates predictions for future months using averages and weights and identifies when the values reach zero.
 *
 * @param startRemaining - Starting count of remaining applications.
 * @param averages - Object containing monthly averages and weighted averages.
 * @param startMonth - Month from which predictions start (formatted as 'MMM yyyy').
 * @returns Object containing predicted burndown data and the zero months.
 */
const generatePredictions = (
  startRemaining: number,
  averages: { average: number; weighted: number },
  startMonth: string
): {
  predictions: IBurnDownHash[]
  zeroMonthAverage: DateTime | null
  zeroMonthWeighted: DateTime | null
} => {
  const predictions: IBurnDownHash[] = [
    {
      month: startMonth,
      remainingActual: null,
      remainingAveragePredictedBurn: startRemaining,
      remainingWeightedPredictedBurn: startRemaining,
    },
  ]
  let remainingAverage = startRemaining
  let remainingWeighted = startRemaining
  let currentMonth = DateTime.fromFormat(startMonth, 'MMM yyyy').plus({
    months: 1,
  })

  let zeroMonthAverage: DateTime | null = null
  let zeroMonthWeighted: DateTime | null = null

  while (remainingAverage > 0 || remainingWeighted > 0) {
    remainingAverage = Math.max(remainingAverage - averages.average, 0)
    remainingWeighted = Math.max(remainingWeighted - averages.weighted, 0)

    if (zeroMonthAverage === null && remainingAverage === 0) {
      zeroMonthAverage = currentMonth
    }

    if (zeroMonthWeighted === null && remainingWeighted === 0) {
      zeroMonthWeighted = currentMonth
    }

    predictions.push({
      month: currentMonth.toFormat('MMM yyyy'),
      remainingActual: null,
      remainingAveragePredictedBurn: remainingAverage,
      remainingWeightedPredictedBurn: remainingWeighted,
    })

    currentMonth = currentMonth.plus({ months: 1 })
  }

  return {
    predictions,
    zeroMonthAverage,
    zeroMonthWeighted,
  }
}

export const predictionEngine = (
  data: ImmigrationResponse[],
  stats: StatResponse[ApplicationType]
): PredictedData => {
  // Step 1: Group data by month
  const groupedData = groupDataByMonth(data)

  // Step 2: Generate burndown data
  const { burnDownData, remaining } = generateBurnDownData(groupedData)

  // Step 3: Handle case where all applications are processed
  if (remaining === 0) {
    const lastEntry = burnDownData[burnDownData.length - 1]
    const finalMonth = lastEntry
      ? DateTime.fromFormat(lastEntry.month, 'MMM yyyy')
      : DateTime.now() // Fallback to current date if no entries

    return {
      burnDownData,
      predictedZeroMonthAverage: finalMonth,
      predictedZeroMonthWeighted: finalMonth,
      monthlyAverage: stats?.total_processed?.monthly_average || 0,
      monthlyWeighted: stats?.total_processed?.weighted_monthly_average || 0,
    }
  }

  // Step 4: Generate predictions
  const monthlyAverage = stats?.total_processed?.monthly_average || 0
  const monthlyWeighted = stats?.total_processed?.weighted_monthly_average || 0

  const lastActualRemaining =
    burnDownData.length > 0
      ? burnDownData[burnDownData.length - 1].remainingActual || 0
      : 0

  const lastMonth =
    burnDownData.length > 0
      ? burnDownData[burnDownData.length - 1].month
      : DateTime.now().toFormat('MMM yyyy')

  const { predictions, zeroMonthAverage, zeroMonthWeighted } =
    generatePredictions(
      lastActualRemaining,
      { average: monthlyAverage, weighted: monthlyWeighted },
      lastMonth
    )

  // Step 5: Combine actual and predicted data
  const finalBurnDownData = [...burnDownData, ...predictions]

  return {
    burnDownData: finalBurnDownData,
    predictedZeroMonthAverage: zeroMonthAverage,
    predictedZeroMonthWeighted: zeroMonthWeighted,
    monthlyAverage,
    monthlyWeighted,
  }
}
