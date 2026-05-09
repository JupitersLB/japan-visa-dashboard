'use client'

import React, { FC, useMemo } from 'react'
import { DateTime } from 'luxon'
import { PredictionFormData, PredictedData } from '@/utils/types'
import axios, { AxiosError } from 'axios'
import { useJBMutation, useJBQuery } from '../queryWrappers'
import { BurnDownChart } from './BurnDownChart'
import { PredictionForm } from './PredictionForm'
import { PredictionDisplay } from './PredictionDate'
import { isPresent } from '@/utils/isPresent'
import { WaitForLoad } from '../WaitForLoad'
import { LoadingSkeleton } from './LoadingSkeleton'
import { DateGraphSkeleton } from './DateGraphSkeleton'
import {
  backendBaseUrl,
  BackendPredictionResponse,
  LatestMetadataResponse,
  mapPredictionResponse,
} from '@/utils/backendApi'

const initialValues: PredictionFormData = {
  location: { value: 'tokyo', label: 'Tokyo' },
  application_type: {
    value: 'permanent_residence',
    label: 'Permanent Resident',
  },
  date: DateTime.now().startOf('year'),
}

export const ApplicationPrediction: FC = () => {
  const {
    mutateAsync: fetchPrediction,
    data: prediction,
    isPending: isPendingPredictions,
  } = useJBMutation<
    Pick<
      PredictedData,
      | 'burnDownData'
      | 'predictedZeroMonthAverage'
      | 'predictedZeroMonthWeighted'
      | 'monthlyAverage'
      | 'monthlyWeighted'
    >,
    AxiosError,
    PredictionFormData
  >(({ location, application_type, date }: PredictionFormData) =>
    axios
      .get<BackendPredictionResponse>(`${backendBaseUrl}/predictions`, {
        params: {
          location: location.value,
          application_type: application_type.value,
          submitted_from: date.toISO(),
        },
      })
      .then(({ data }) => mapPredictionResponse(data))
  )

  const { data: latestDateTimeString, isLoading } = useJBQuery({
    queryKey: ['immigration stats', 'latest'],
    queryFn: () =>
      axios
        .get<LatestMetadataResponse>(`${backendBaseUrl}/meta/latest`)
        .then(({ data }) => data),
    select: (data) => data.latest_date,
    refetchOnWindowFocus: false,
  })

  const initialDateTime = useMemo(
    () =>
      isPresent(latestDateTimeString)
        ? DateTime.fromISO(latestDateTimeString)
        : initialValues.date,
    [latestDateTimeString]
  )

  const handleFormSubmit = (formData: PredictionFormData) =>
    fetchPrediction(formData)

  return (
    <div className="flex w-full flex-col items-center justify-center h-full bg-background text-foreground md:p-8">
      <WaitForLoad isLoading={isLoading} loadingComponent={<LoadingSkeleton />}>
        <div className="w-full flex flex-col md:grid md:grid-cols-3 gap-4 md:gap-8">
          <div className="col-span-1 bg-neutral p-6 rounded-lg">
            <PredictionForm
              onFormSubmit={handleFormSubmit}
              initialDateTime={initialDateTime}
            />
          </div>

          <WaitForLoad
            isLoading={isPendingPredictions}
            loadingComponent={<DateGraphSkeleton />}
          >
            <div className="col-span-2 flex flex-col gap-4">
              <div className="bg-neutral p-6 rounded-lg">
                <PredictionDisplay
                  averagePrediction={
                    prediction?.predictedZeroMonthAverage || null
                  }
                  weightedPrediction={
                    prediction?.predictedZeroMonthWeighted || null
                  }
                />
              </div>

              <div className="bg-neutral p-6 rounded-lg h-96">
                <BurnDownChart burnDownData={prediction?.burnDownData || []} />
              </div>
            </div>
          </WaitForLoad>
        </div>
      </WaitForLoad>
    </div>
  )
}
