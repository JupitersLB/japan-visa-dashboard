import React, { FC } from 'react'
import { FormWrapper } from '@/app/_components/form/FormWrapper'
import { FieldWrapper } from '@/app/_components/form/FieldWrapper'
import { JBSelect } from '@/app/_components/select'
import { PredictionFormData } from '@/utils/types'
import { applicationTypeOptions, locationOptions } from '@/utils/options'
import { DatePickerWrapper } from '../form/DatePickerWrapper'
import { DateTime } from 'luxon'

const initialValues: PredictionFormData = {
  location: { value: 'tokyo', label: 'Tokyo' },
  application_type: {
    value: 'permanent_residence',
    label: 'Permanent Resident',
  },
  date: DateTime.now().startOf('year'),
}

export const PredictionForm: FC<{
  onFormSubmit: (formData: PredictionFormData) => void
  initialDateTime: DateTime
}> = ({ onFormSubmit, initialDateTime }) => {
  return (
    <FormWrapper<PredictionFormData>
      onSubmit={onFormSubmit}
      defaultValues={{
        ...initialValues,
        date:
          initialDateTime.toMillis() < initialValues.date.toMillis()
            ? initialDateTime
            : initialValues.date,
      }}
      submitButton={
        <button className="px-4 py-2 bg-primary-dark hover:bg-highlight text-foreground rounded-md">
          Submit
        </button>
      }
      className="p-4 w-full rounded-lg flex flex-col gap-4 border border-secondary"
    >
      <FieldWrapper<PredictionFormData['location']>
        name="location"
        label="Location"
      >
        {({ value, onChange }) => (
          <JBSelect
            name="location"
            options={locationOptions}
            value={value}
            onChange={(selectedValue) => {
              if (selectedValue) onChange(selectedValue)
            }}
          />
        )}
      </FieldWrapper>
      <FieldWrapper<PredictionFormData['application_type']>
        name="application_type"
        label="Application Type"
      >
        {({ value, onChange }) => (
          <JBSelect
            name="application_type"
            options={applicationTypeOptions}
            value={value}
            onChange={(selectedValue) => {
              if (selectedValue) onChange(selectedValue)
            }}
          />
        )}
      </FieldWrapper>
      <FieldWrapper name="date" label="Submission Date">
        {({ value, onChange }) => (
          <DatePickerWrapper
            onChange={onChange}
            value={value as DateTime | null}
            maxDate={initialDateTime}
          />
        )}
      </FieldWrapper>
    </FormWrapper>
  )
}
