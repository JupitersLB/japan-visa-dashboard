import React, { FC } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { DateTime } from 'luxon'

interface DatePickerWrapperProps {
  value: DateTime | null
  onChange: (value: DateTime | null) => void
  placeholder?: string
  maxDate?: DateTime
}

export const DatePickerWrapper: FC<DatePickerWrapperProps> = ({
  value,
  onChange,
  placeholder = 'Select a month',
  maxDate = DateTime.now().minus({ months: 2 }),
}) => (
  <DatePicker
    selected={value ? value.toJSDate() : null}
    onChange={(date: Date | null) => {
      if (date) {
        onChange(DateTime.fromJSDate(date).startOf('month'))
      } else {
        onChange(null)
      }
    }}
    showMonthYearPicker
    dateFormat="LLLL yyyy"
    placeholderText={placeholder}
    minDate={DateTime.fromISO('2020-11-01T00:00:00+09:00').toJSDate()}
    maxDate={maxDate.toJSDate()}
    className="react-datepicker-input"
    calendarClassName="react-datepicker"
    popperClassName="react-datepicker-popper"
  />
)
