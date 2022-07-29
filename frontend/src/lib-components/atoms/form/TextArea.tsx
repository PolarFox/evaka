// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import classNames from 'classnames'
import type { RefObject } from 'react'
import React, { useMemo, useState } from 'react'
import TextareaAutosize from 'react-autosize-textarea'
import styled from 'styled-components'

import type { BaseProps } from '../../utils'
import UnderRowStatusIcon from '../StatusIcon'

import type { InputInfo } from './InputField'
import { InputFieldUnderRow } from './InputField'

interface TextAreaInputProps extends BaseProps {
  value: string
  onChange?: (value: string) => void
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void
  onKeyPress?: (e: React.KeyboardEvent) => void
  readonly?: boolean
  rows?: number
  maxLength?: number
  type?: string
  autoFocus?: boolean
  placeholder?: string
  info?: InputInfo
  align?: 'left' | 'right'
  id?: string
  'data-qa'?: string
  className?: string
  'aria-describedby'?: string
  hideErrorsBeforeTouched?: boolean
  required?: boolean
  inputRef?: RefObject<HTMLTextAreaElement>
  wrapperClassName?: string
}

export default React.memo(function TextArea({
  value,
  onChange,
  onFocus,
  onBlur,
  onKeyPress,
  readonly,
  rows,
  maxLength,
  type,
  autoFocus,
  placeholder,
  info,
  id,
  'data-qa': dataQa,
  className,
  'aria-describedby': ariaId,
  hideErrorsBeforeTouched,
  required,
  inputRef
}: TextAreaInputProps) {
  const [touched, setTouched] = useState(false)

  const hideError =
    hideErrorsBeforeTouched && !touched && info?.status === 'warning'
  const infoText = hideError ? undefined : info?.text
  const infoStatus = hideError ? undefined : info?.status

  const handleChange = useMemo(
    () =>
      onChange
        ? (e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onChange(e.target.value)
        : undefined,
    [onChange]
  )

  return (
    <>
      <StyledTextArea
        value={value}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={(e) => {
          setTouched(true)
          onBlur && onBlur(e)
        }}
        onKeyPress={onKeyPress}
        placeholder={placeholder}
        readOnly={readonly}
        disabled={readonly}
        maxLength={maxLength}
        type={type}
        autoFocus={autoFocus}
        className={classNames(className, infoStatus)}
        data-qa={dataQa}
        id={id}
        aria-describedby={ariaId}
        required={required ?? false}
        ref={inputRef}
        rows={rows}
      />
      {!!infoText && (
        <InputFieldUnderRow className={classNames(infoStatus)}>
          <span data-qa={dataQa ? `${dataQa}-info` : undefined}>
            {infoText}
          </span>
          <UnderRowStatusIcon status={info?.status} />
        </InputFieldUnderRow>
      )}
    </>
  )
})

const StyledTextArea = styled(TextareaAutosize)`
  display: block;
  position: relative;

  width: 100%;
  max-width: 100%;
  height: 38px;
  min-height: 2.5em;
  padding: 6px 10px;

  font-size: 1rem;
  font-family: 'Open Sans', Arial, sans-serif;
  color: ${(p) => p.theme.colors.grayscale.g100};
  line-height: 1.5;
  overflow: hidden;
  overflow-wrap: break-word;
  resize: none;

  background-color: transparent;
  margin: 0;
  border: none;
  border-top: 2px solid transparent;
  border-bottom: 1px solid ${(p) => p.theme.colors.grayscale.g70};
  border-radius: 0;
  box-shadow: none;
  outline: none;

  &:focus,
  &.success,
  &.warning {
    border-bottom-width: 2px;
  }

  &:focus {
    border: 2px solid ${(p) => p.theme.colors.main.m2Focus};
    border-radius: 2px;
    padding-left: 8px;
    padding-right: 8px;
  }

  &.success {
    border-bottom-color: ${(p) => p.theme.colors.status.success};

    &:focus {
      border-color: ${(p) => p.theme.colors.status.success};
    }
  }

  &.warning {
    border-bottom-color: ${(p) => p.theme.colors.status.warning};

    &:focus {
      border-color: ${(p) => p.theme.colors.status.warning};
    }
  }
`
