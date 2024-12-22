import { DateTime } from 'luxon'
import { ImmigrationResponse } from './types'

export const calculateInsights = (
  groupedData: Record<string, Record<string, ImmigrationResponse[]>>
) => {
  const result: Record<string, Record<string, any>> = {}

  Object.entries(groupedData).forEach(([appType, categories]) => {
    result[appType] = {}

    Object.entries(categories).forEach(([procCategory, entries]) => {
      // Prepare the monthly data map
      const monthMap: Record<number, number> = {}

      entries.forEach((entry) => {
        const timestamp = DateTime.fromISO(entry.date)
          .startOf('month')
          .toMillis()
        monthMap[timestamp] = (monthMap[timestamp] || 0) + entry.count
      })

      const sortedTimestamps = Object.keys(monthMap)
        .map(Number)
        .sort((a, b) => a - b)

      const monthlyCounts = sortedTimestamps.map((ts) => monthMap[ts])
      const length = sortedTimestamps.length

      if (length === 0) {
        result[appType][procCategory] = {
          monthly_average: 0,
          recent_monthly_change: null,
          sorted_monthly_data: [],
          standard_deviation: 0,
          weighted_monthly_average: 0,
          anomalies: [],
        }
        return
      }

      // Insight calculations
      let totalApplications = 0
      let sumOfSquares = 0
      let weightedSum = 0

      let firstCount = monthlyCounts[0]
      let lastCount = monthlyCounts[length - 1]
      let secondToLastCount = length >= 2 ? monthlyCounts[length - 2] : 0

      const momChanges: (number | null)[] = []
      let prevCount: number | null = null

      monthlyCounts.forEach((count) => {
        totalApplications += count
        sumOfSquares += count * count
        weightedSum += count * count

        if (prevCount !== null && prevCount !== 0) {
          momChanges.push(((count - prevCount) / prevCount) * 100)
        } else {
          momChanges.push(null)
        }

        prevCount = count
      })

      const rawMonthlyAverage = totalApplications / length
      const weightedMonthlyAverage =
        totalApplications > 0 ? weightedSum / totalApplications : 0

      const variance =
        (sumOfSquares - (totalApplications * totalApplications) / length) /
        (length - 1)
      const standardDeviation = Math.sqrt(Math.max(variance, 0))

      const recentMonthlyChange =
        length > 1 && secondToLastCount > 0
          ? ((lastCount - secondToLastCount) / secondToLastCount) * 100
          : null

      const upperBound = rawMonthlyAverage + 2 * standardDeviation
      const lowerBound = rawMonthlyAverage - 2 * standardDeviation

      const anomalies: [number, string, number][] = []

      sortedTimestamps.forEach((timestamp, index) => {
        const count = monthlyCounts[index]
        if (count > upperBound || count < lowerBound) {
          anomalies.push([timestamp, procCategory, count])
        }
      })

      const sortedMonthlyData = sortedTimestamps.map((timestamp, index) => ({
        timestamp,
        count: monthlyCounts[index],
        mom_change: momChanges[index],
      }))

      // Assign insights to the nested structure
      result[appType][procCategory] = {
        monthly_average: Math.round(rawMonthlyAverage),
        recent_monthly_change: recentMonthlyChange,
        sorted_monthly_data: sortedMonthlyData,
        standard_deviation: standardDeviation,
        weighted_monthly_average: weightedMonthlyAverage,
        anomalies,
      }
    })
  })

  return result
}
