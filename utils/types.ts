import { DateTime } from 'luxon'

export type ProcessingCategory =
  | 'approved'
  | 'newly_accepted'
  | 'not_approved'
  | 'other_processed'
  | 'pending'
  | 'previously_accepted'
  | 'total_accepted'
  | 'total_processed'

export type ApplicationLocation =
  | 'fukuoka'
  | 'hiroshima'
  | 'kobe'
  | 'nagoya'
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

export type FilterValues = {
  processing_category?: SelectOption<ProcessingCategory>
  location: SelectOption<ApplicationLocation>
  application_type: SelectOption<ApplicationType>
  date?: string
}

export type PredictionFormData = {
  location: SelectOption<ApplicationLocation>
  application_type: SelectOption<ApplicationType>
  date: DateTime
}

export type ImmigrationResponse = {
  processing_category: ProcessingCategory
  application_type: ApplicationType
  location: ApplicationLocation
  date: string
  count: number
}

export type StatResponse = {
  [K in ApplicationType]: {
    [P in ProcessingCategory]: {
      monthly_average: number
      recent_monthly_change: number
      sorted_monthly_data: {
        timestamp: number
        count: number
        mom_change: number
      }[]
      standard_deviation: number
      weighted_monthly_average: number
      anomalies: [number, ProcessingCategory, number] // timestamp _ count
    }
  }
}
