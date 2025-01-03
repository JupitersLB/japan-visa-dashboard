'use client'

import React, { FC, useMemo } from 'react'
import { DateTime } from 'luxon'
import {
  ApplicationType,
  ImmigrationResponse,
  PredictionFormData,
  StatResponse,
} from '@/utils/types'
import axios, { AxiosError } from 'axios'
import { useJBMutation, useJBQuery } from '../queryWrappers'
import { BurnDownChart } from './BurnDownChart'
import { predictionEngine } from '@/utils/predictionEngine'
import { PredictionForm } from './PredictionForm'
import { PredictionDisplay } from './PredictionDate'
import { isPresent } from '@/utils/isPresent'
import { WaitForLoad } from '../WaitForLoad'
import { LoadingSkeleton } from './LoadingSkeleton'
import { DateGraphSkeleton } from './DateGraphSkeleton'

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
    mutateAsync: calcStats,
    data: computedStats,
    isPending: isPendingStats,
  } = useJBMutation<
    StatResponse[ApplicationType],
    AxiosError,
    PredictionFormData
  >(({ location, application_type }: PredictionFormData) =>
    axios
      .post(`/api/immigration/stats`, {
        location: location.value,
        application_type: application_type.value,
      })
      .then(({ data }) => data[application_type.value])
  )

  const {
    mutateAsync: submit,
    data = [],
    isPending: isPendingPredictions,
  } = useJBMutation<ImmigrationResponse[], AxiosError, PredictionFormData>(
    ({ location, application_type, date }: PredictionFormData) =>
      axios
        .post(`/api/immigration`, {
          location: location.value,
          application_type: application_type.value,
          from: date.toISO(),
        })
        .then(({ data }) => data)
  )

  const { data: latestDateTimeString, isLoading } = useJBQuery({
    queryKey: ['immigration stats', 'latest'],
    queryFn: () =>
      axios
        .get<ImmigrationResponse>('/api/immigration/latest')
        .then(({ data }) => data),
    select: (data) => data.date,
    refetchOnWindowFocus: false,
  })

  const initialDateTime = useMemo(
    () =>
      isPresent(latestDateTimeString)
        ? DateTime.fromISO(latestDateTimeString)
        : initialValues.date,
    [latestDateTimeString]
  )

  const {
    burnDownData,
    predictedZeroMonthAverage,
    predictedZeroMonthWeighted,
  } = useMemo(() => {
    if (!isPresent(data) || !isPresent(computedStats)) {
      return {
        burnDownData: [],
        predictedZeroMonthAverage: null,
        predictedZeroMonthWeighted: null,
      }
    }

    return predictionEngine(data, computedStats)
  }, [data, computedStats])

  const handleFormSubmit = (formData: PredictionFormData) => {
    calcStats(formData)
    submit(formData)
  }

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
            isLoading={isPendingPredictions || isPendingStats}
            loadingComponent={<DateGraphSkeleton />}
          >
            <div className="col-span-2 flex flex-col gap-4">
              <div className="bg-neutral p-6 rounded-lg">
                <PredictionDisplay
                  averagePrediction={predictedZeroMonthAverage}
                  weightedPrediction={predictedZeroMonthWeighted}
                />
              </div>

              <div className="bg-neutral p-6 rounded-lg h-96">
                <BurnDownChart burnDownData={burnDownData} />
              </div>
            </div>
          </WaitForLoad>
        </div>
      </WaitForLoad>
    </div>
  )
}
