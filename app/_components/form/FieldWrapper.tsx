import React, { ReactElement } from 'react'
import {
  useFormContext,
  Controller,
  FieldValues,
  Control,
} from 'react-hook-form'

interface FieldWrapperProps<TFieldValue> {
  name: string
  label?: string
  children: (fieldProps: {
    value: TFieldValue
    onChange: (value: TFieldValue) => void
  }) => ReactElement
}

export const FieldWrapper = <TFieldValue,>({
  name,
  label,
  children,
}: FieldWrapperProps<TFieldValue>) => {
  const { control } = useFormContext()

  return (
    <div className="flex flex-col space-y-2">
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <Controller
        name={name}
        control={control as unknown as Control<FieldValues>}
        render={({ field }) =>
          children({
            value: field.value as TFieldValue,
            onChange: field.onChange as (value: TFieldValue) => void,
          })
        }
      />
    </div>
  )
}
