// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useCallback } from 'react'
import styled from 'styled-components'

import { BoundFormState } from 'lib-common/form/hooks'
import { autocomplete } from 'lib-common/time'

import InputField, { TextInputProps } from './InputField'

export interface TimeInputProps
  extends Pick<
    TextInputProps,
    | 'placeholder'
    | 'hideErrorsBeforeTouched'
    | 'onBlur'
    | 'info'
    | 'id'
    | 'name'
    | 'required'
    | 'readonly'
    | 'inputRef'
    | 'aria-describedby'
    | 'data-qa'
  > {
  wide?: boolean
  value: string
  onChange: (v: string) => void
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void
}

const TimeInput = React.memo(function TimeInput({
  value,
  onChange,
  onFocus,
  wide,
  ...props
}: TimeInputProps) {
  const onChangeWithAutocomplete = useCallback(
    (v: string) => onChange(autocomplete(value, v)),
    [value, onChange]
  )

  const InputComponent = wide ? ScalingInput : ShorterInput

  return (
    <InputComponent
      {...props}
      value={value}
      onChange={onChangeWithAutocomplete}
      type="text"
      inputMode="numeric"
      onFocus={(event) => {
        event.target.select()
        onFocus?.(event)
      }}
    />
  )
})

export default TimeInput

const ShorterInput = styled(InputField)`
  width: calc(3.2em + 24px);
  max-width: calc(3.2em + 24px);

  input {
    font-size: 1em;
  }
`

const ScalingInput = styled(InputField)`
  div.warning {
    line-height: 1.125rem;
  }

  input {
    font-size: 1em;
    min-width: 80px;
  }
`

export interface TimeInputFProps
  extends Omit<TimeInputProps, 'value' | 'onChange'> {
  bind: BoundFormState<string>
}

export const TimeInputF = React.memo(function TimeInputF({
  bind,
  ...props
}: TimeInputFProps) {
  const { state, set, inputInfo } = bind
  return (
    <TimeInput
      {...props}
      value={state}
      onChange={set}
      info={'info' in props ? props.info : inputInfo()}
    />
  )
})
