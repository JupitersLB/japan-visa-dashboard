'use client'

import React, { FC } from 'react'
import dynamic from 'next/dynamic'
import { StylesConfig } from 'react-select'

const Select = dynamic(() => import('react-select'), { ssr: false })

export const JBSelect: FC<{
  name?: string
  options: { value: string; label: string }[]
  isMulti?: boolean
  value?: any
  onChange?: (value: any) => void
}> = ({ name, options, isMulti = false, value, onChange }) => {
  const customStyles: StylesConfig = {
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
  }

  return (
    <Select
      name={name}
      options={options}
      isMulti={isMulti}
      value={value}
      onChange={onChange}
      styles={customStyles}
      classNamePrefix="react-select"
    />
  )
}
