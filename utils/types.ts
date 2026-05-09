import { DateTime } from 'luxon'

export type ApplicationLocation =
  | 'chubu_airport'
  | 'fukuoka'
  | 'haneda_airport'
  | 'hiroshima'
  | 'kansai_airport'
  | 'kobe'
  | 'nagoya'
  | 'narita_airport'
  | 'naha'
  | 'osaka'
  | 'sapporo'
  | 'sendai'
  | 'takamatsu'
  | 'tokyo'
  | 'total'
  | 'yokohama'

export type ApplicationType =
  | 'activities_outside_scope'
  | 'extension'
  | 'permanent_residence'
  | 're_entry'
  | 'residence_status_acquisition'
  | 'status_change'

export type SelectOption<T> = { value: T; label: string }

export type PredictionFormData = {
  location: SelectOption<ApplicationLocation>
  application_type: SelectOption<ApplicationType>
  date: DateTime
}

export interface IBurnDownHash {
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
