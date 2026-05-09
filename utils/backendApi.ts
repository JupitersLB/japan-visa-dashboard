import { DateTime } from 'luxon'
import { PredictedData } from './types'

export type LatestMetadataResponse = {
  latest_month: string
  latest_date: string
  row_count: number
}

type BackendBurnDownRow = {
  month: string
  remaining_actual: number | null
  remaining_average_predicted_burn: number | null
  remaining_weighted_predicted_burn: number | null
}

export type BackendPredictionResponse = {
  filters: {
    location: string
    application_type: string
    submitted_from: string
    stats_from: string
    stats_to: string
  }
  burn_down_data: BackendBurnDownRow[]
  predicted_zero_month_average: string | null
  predicted_zero_month_weighted: string | null
  monthly_average: number
  monthly_weighted: number
}

const toDateTime = (month: string | null): DateTime | null => {
  if (!month) return null
  const date = DateTime.fromFormat(month, 'yyyy-MM')
  return date.isValid ? date : null
}

export const mapPredictionResponse = (
  response: BackendPredictionResponse
): Pick<
  PredictedData,
  | 'burnDownData'
  | 'predictedZeroMonthAverage'
  | 'predictedZeroMonthWeighted'
  | 'monthlyAverage'
  | 'monthlyWeighted'
> => ({
  burnDownData: response.burn_down_data.map((row) => ({
    month: row.month,
    remainingActual: row.remaining_actual,
    remainingAveragePredictedBurn: row.remaining_average_predicted_burn,
    remainingWeightedPredictedBurn: row.remaining_weighted_predicted_burn,
  })),
  predictedZeroMonthAverage: toDateTime(response.predicted_zero_month_average),
  predictedZeroMonthWeighted: toDateTime(response.predicted_zero_month_weighted),
  monthlyAverage: response.monthly_average,
  monthlyWeighted: response.monthly_weighted,
})
