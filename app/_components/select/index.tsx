'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import type ReactSelect from 'react-select'
import type {
  GroupBase,
  OnChangeValue,
  Props as SelectProps,
  StylesConfig,
} from 'react-select'
import type { SelectOption } from '@/utils/types'

type JBSelectOption = SelectOption<string>

const Select = dynamic(() => import('react-select'), { ssr: false }) as <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>(
  props: SelectProps<Option, IsMulti, Group>
) => ReturnType<typeof ReactSelect<Option, IsMulti, Group>>

const getCustomStyles = <
  TOption extends JBSelectOption,
  TIsMulti extends boolean,
>(): StylesConfig<TOption, TIsMulti> => ({
  control: (styles, { isFocused }) => ({
    ...styles,
    padding: '0.5rem 0.75rem',
    width: '100%',
    backgroundColor: 'transparent',
    color: 'var(--foreground)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: isFocused ? 'var(--primary-dark)' : 'var(--secondary)',
    borderRadius: '0.375rem',
    outline: 'none',
    boxShadow: isFocused ? '0 0 0 1px var(--primary-dark)' : 'none',
    minHeight: 'unset',
    '&:hover': {
      borderColor: 'none',
    },
  }),
  menu: (styles) => ({
    ...styles,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--secondary)',
    borderRadius: '0.375rem',
    marginTop: '4px',
    zIndex: 2,
    overflow: 'hidden',
  }),
  menuList: (styles) => ({
    ...styles,
    padding: 0,
    backgroundColor: 'var(--neutral)',
  }),
  option: (styles, { isFocused, isSelected }) => ({
    ...styles,
    backgroundColor: isSelected
      ? 'var(--primary-dark)'
      : isFocused
        ? 'var(--highlight)'
        : 'var(--background)',
    color: isSelected || isFocused ? 'white' : 'var(--foreground)',
    padding: '8px 12px',
    cursor: 'pointer',
  }),
  valueContainer: (styles) => ({
    ...styles,
    padding: 0,
  }),
  singleValue: (styles) => ({
    ...styles,
    color: 'var(--foreground)',
    margin: 0,
  }),
  input: (styles) => ({
    ...styles,
    color: 'var(--foreground)',
    margin: 0,
    padding: 0,
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (styles, { isFocused }) => ({
    ...styles,
    padding: 0,
    svg: {
      fill: isFocused ? 'var(--primary-dark)' : 'var(--secondary)',
    },
  }),
})

type JBSelectProps<
  TOption extends JBSelectOption,
  TIsMulti extends boolean = false,
> = {
  name?: string
  options: readonly TOption[]
  isMulti?: TIsMulti
  value?: OnChangeValue<TOption, TIsMulti>
  onChange?: (value: OnChangeValue<TOption, TIsMulti>) => void
}

export const JBSelect = <
  TOption extends JBSelectOption,
  TIsMulti extends boolean = false,
>({
  name,
  options,
  isMulti,
  value,
  onChange,
}: JBSelectProps<TOption, TIsMulti>) => {
  return (
    <Select<TOption, TIsMulti>
      name={name}
      options={options}
      isMulti={isMulti}
      value={value}
      onChange={onChange}
      styles={getCustomStyles<TOption, TIsMulti>()}
      classNamePrefix="react-select"
    />
  )
}
