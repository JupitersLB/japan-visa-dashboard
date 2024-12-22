import React, { ReactNode, ReactElement, FormEvent, useEffect } from 'react'
import {
  FormProvider,
  useForm,
  UseFormProps,
  SubmitHandler,
  FieldValues,
} from 'react-hook-form'

interface FormWrapperProps<TFormValues extends FieldValues>
  extends UseFormProps<TFormValues> {
  onSubmit: SubmitHandler<TFormValues>
  submitButton: ReactElement | null
  className?: string
  children: ReactNode // Form fields
}

export const FormWrapper = <TFormValues extends FieldValues>({
  onSubmit,
  children,
  submitButton,
  className,
  ...formOptions
}: FormWrapperProps<TFormValues>) => {
  const methods = useForm<TFormValues>(formOptions)
  const { watch, getValues } = methods

  const preventFormSubmit = (e: FormEvent<HTMLFormElement>) =>
    e.preventDefault()

  useEffect(() => {
    if (!submitButton && onSubmit) {
      const subscription = watch((_, { name }) => {
        const currentValues = getValues()
        onSubmit(currentValues as TFormValues) // Dynamically trigger onSubmit
      })
      return () => subscription.unsubscribe()
    }
  }, [watch, onSubmit, submitButton, getValues])

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={
          submitButton && onSubmit
            ? methods.handleSubmit(onSubmit)
            : preventFormSubmit
        }
        className={`rounded-lg p-6 text-foreground ${className}`}
      >
        {children}
        {submitButton}
      </form>
    </FormProvider>
  )
}
