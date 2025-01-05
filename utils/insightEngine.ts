import { DateTime } from 'luxon'
import { ImmigrationResponse, Insight } from './types'

/**
 * Aggregates counts and precomputes metrics by month for each application type and processing category.
 *
 * @param data - Array of immigration data entries.
 * @returns A nested object containing precomputed sums grouped by application type and processing category.
 */
const preAggregateData = (
  data: ImmigrationResponse[]
): Record<
  string,
  Record<
    string,
    {
      counts: number[]
      sum: number
      sumOfSquares: number
    }
  >
> => {
  const aggregatedData: Record<
    string,
    Record<
      string,
      {
        counts: number[]
        sum: number
        sumOfSquares: number
      }
    >
  > = {}

  data.forEach(({ application_type, processing_category, date, count }) => {
    const monthStart = DateTime.fromISO(date).startOf('month').toMillis()

    if (!aggregatedData[application_type]) {
      aggregatedData[application_type] = {}
    }

    if (!aggregatedData[application_type][processing_category]) {
      aggregatedData[application_type][processing_category] = {
        counts: [],
        sum: 0,
        sumOfSquares: 0,
      }
    }

    const categoryData = aggregatedData[application_type][processing_category]
    categoryData.sum += count
    categoryData.sumOfSquares += count * count

    const lastIndex = categoryData.counts.length - 1
    if (
      lastIndex === -1 ||
      DateTime.fromMillis(categoryData.counts[lastIndex]).toMillis() !==
        monthStart
    ) {
      categoryData.counts.push(count)
    } else {
      categoryData.counts[lastIndex] += count
    }
  })

  return aggregatedData
}

/**
 * Calculates insights for pre-aggregated data.
 *
 * @param preAggregated - Object containing counts, sum, and sum of squares.
 * @returns Calculated insights including averages, changes, and deviations.
 */
const calculateCategoryInsights = ({
  counts,
  sum,
  sumOfSquares,
}: {
  counts: number[]
  sum: number
  sumOfSquares: number
}): Insight => {
  const numMonths = counts.length

  if (numMonths === 0) {
    return {
      monthly_average: 0,
      recent_monthly_change: null,
      standard_deviation: 0,
      weighted_monthly_average: 0,
    }
  }

  const monthlyAverage = sum / numMonths
  const weightedAverage = sum > 0 ? sumOfSquares / sum : 0
  const variance =
    numMonths > 1
      ? (sumOfSquares - (sum * sum) / numMonths) / (numMonths - 1)
      : 0
  const standardDeviation = Math.sqrt(Math.max(variance, 0))

  const recentMonthlyChange =
    numMonths > 1 && counts[numMonths - 2] > 0
      ? ((counts[numMonths - 1] - counts[numMonths - 2]) /
          counts[numMonths - 2]) *
        100
      : null

  return {
    monthly_average: Math.round(monthlyAverage),
    recent_monthly_change: recentMonthlyChange,
    standard_deviation: standardDeviation,
    weighted_monthly_average: weightedAverage,
  }
}

/**
 * Calculates insights for immigration data.
 *
 * @param data - Array of immigration data entries, already sorted by date.
 * @returns A nested object containing calculated insights for each application type
 *          and processing category, including averages, standard deviations,
 *          and recent monthly changes.
 */
export const calculateInsights = (
  data: ImmigrationResponse[]
): Record<string, Record<string, Insight>> => {
  const preAggregatedData = preAggregateData(data)

  const result: Record<string, Record<string, Insight>> = {}

  for (const appType in preAggregatedData) {
    result[appType] = {}

    for (const procCategory in preAggregatedData[appType]) {
      const aggregated = preAggregatedData[appType][procCategory]
      result[appType][procCategory] = calculateCategoryInsights(aggregated)
    }
  }

  return result
}
