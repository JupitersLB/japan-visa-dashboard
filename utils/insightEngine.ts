import { DateTime } from 'luxon'
import { ImmigrationResponse, Insight } from './types'

/**
 * Calculates averages, variance, and bounds for monthly counts.
 *
 * @param monthlyCounts - Array of monthly counts.
 * @returns Object containing average, weighted average, standard deviation, and bounds.
 */
const calculateStatisticsMetrics = (monthlyCounts: number[]) => {
  const numMonths = monthlyCounts.length

  const { sum, sumOfSquares } = monthlyCounts.reduce(
    (acc, count) => ({
      sum: acc.sum + count,
      sumOfSquares: acc.sumOfSquares + count * count,
    }),
    { sum: 0, sumOfSquares: 0 }
  )

  const monthlyAverage = sum / numMonths
  const weightedAverage = sum > 0 ? sumOfSquares / sum : 0
  const variance =
    numMonths > 1
      ? (sumOfSquares - (sum * sum) / numMonths) / (numMonths - 1)
      : 0
  const standardDeviation = Math.sqrt(Math.max(variance, 0))
  const bounds = {
    upper: monthlyAverage + 2 * standardDeviation,
    lower: monthlyAverage - 2 * standardDeviation,
  }

  return { monthlyAverage, weightedAverage, standardDeviation, bounds }
}

/**
 * Calculates month-over-month changes for a list of counts.
 *
 * @param monthlyCounts - Array of monthly counts.
 * @returns Array of month-over-month changes.
 */
const calculateMonthOverMonthChanges = (
  monthlyCounts: number[]
): (number | null)[] =>
  monthlyCounts.reduce(
    (acc, count) => {
      const momChange =
        acc.prevCount !== null && acc.prevCount !== 0
          ? ((count - acc.prevCount) / acc.prevCount) * 100
          : null
      acc.changes.push(momChange)
      acc.prevCount = count
      return acc
    },
    { changes: [] as (number | null)[], prevCount: null as number | null }
  ).changes

/**
 * Detects anomalies in monthly data based on given bounds.
 *
 * @param monthlyCounts - Array of monthly counts.
 * @param sortedTimestamps - Array of sorted timestamps.
 * @param procCategory - The processing category for anomaly detection.
 * @param bounds - Object containing upper and lower bounds.
 * @returns Array of anomalies.
 */
const findAnomalies = (
  monthlyCounts: number[],
  sortedTimestamps: number[],
  procCategory: string,
  bounds: { upper: number; lower: number }
): [number, string, number][] =>
  monthlyCounts.reduce(
    (anomalies, count, i) => {
      if (count > bounds.upper || count < bounds.lower) {
        anomalies.push([sortedTimestamps[i], procCategory, count])
      }
      return anomalies
    },
    [] as [number, string, number][]
  )

/**
 * Calculates statistical insights from monthly counts.
 *
 * @param sortedTimestamps - Array of sorted timestamps (months).
 * @param monthlyCounts - Array of counts corresponding to the timestamps.
 * @param procCategory - The processing category for anomaly detection.
 * @returns Calculated statistical insights for the given data.
 */
const calculateStatistics = (
  sortedTimestamps: number[],
  monthlyCounts: number[],
  procCategory: string
): Insight => {
  const numMonths = monthlyCounts.length

  if (numMonths === 0) {
    return {
      monthly_average: 0,
      recent_monthly_change: null,
      sorted_monthly_data: [],
      standard_deviation: 0,
      weighted_monthly_average: 0,
      anomalies: [],
    }
  }

  const { monthlyAverage, weightedAverage, standardDeviation, bounds } =
    calculateStatisticsMetrics(monthlyCounts)

  const momChanges = calculateMonthOverMonthChanges(monthlyCounts)

  const anomalies = findAnomalies(
    monthlyCounts,
    sortedTimestamps,
    procCategory,
    bounds
  )

  const sortedMonthlyData = sortedTimestamps.map((timestamp, i) => ({
    timestamp,
    count: monthlyCounts[i],
    mom_change: momChanges[i],
  }))

  const recentMonthlyChange =
    numMonths > 1 && monthlyCounts[numMonths - 2] > 0
      ? ((monthlyCounts[numMonths - 1] - monthlyCounts[numMonths - 2]) /
          monthlyCounts[numMonths - 2]) *
        100
      : null

  return {
    monthly_average: Math.round(monthlyAverage),
    recent_monthly_change: recentMonthlyChange,
    sorted_monthly_data: sortedMonthlyData,
    standard_deviation: standardDeviation,
    weighted_monthly_average: weightedAverage,
    anomalies,
  }
}

/**
 * Calculates insights for grouped immigration data.
 *
 * @param groupedData - A nested record containing immigration data grouped
 *                      by application type and processing category.
 *                      Each entry contains a list of responses with dates and counts.
 * @returns A nested record containing calculated insights for each application type
 *          and processing category, including averages, standard deviations,
 *          recent monthly changes, anomalies, and sorted monthly data.
 */
export const calculateInsights = (
  groupedData: Record<string, Record<string, ImmigrationResponse[]>>
): Record<string, Record<string, Insight>> => {
  const result: Record<string, Record<string, Insight>> = {}

  Object.entries(groupedData).forEach(([appType, categories]) => {
    result[appType] = {}

    Object.entries(categories).forEach(([procCategory, entries]) => {
      const monthMap = entries.reduce((map, { date, count }) => {
        const monthStart = DateTime.fromISO(date).startOf('month').toMillis()
        map.set(monthStart, (map.get(monthStart) || 0) + count)
        return map
      }, new Map<number, number>())

      const sortedTimestamps = Array.from(monthMap.keys()).sort((a, b) => a - b)
      const monthlyCounts = sortedTimestamps.map((ts) => monthMap.get(ts) || 0)

      result[appType][procCategory] = calculateStatistics(
        sortedTimestamps,
        monthlyCounts,
        procCategory
      )
    })
  })

  return result
}
