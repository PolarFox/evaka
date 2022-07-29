// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import type { Property } from 'csstype'
import { readableColor } from 'polished'
import React, { useCallback } from 'react'
import styled, { css } from 'styled-components'

import { useUniqueId } from 'lib-common/utils/useUniqueId'
import { faCheck } from 'lib-icons'

import { tabletMin } from '../breakpoints'
import { fontWeights } from '../typography'
import { defaultMargins } from '../white-space'

export const StaticChip = styled.div<{ color: string; fitContent?: boolean }>`
  display: inline-block;
  font-family: 'Open Sans', sans-serif;
  font-weight: ${fontWeights.semibold};
  font-size: ${defaultMargins.s};
  line-height: ${defaultMargins.s};
  user-select: none;
  border: 1px solid ${(p) => p.color};
  border-radius: 1000px;
  background-color: ${(p) => p.color};
  color: ${(p) =>
    readableColor(
      p.color,
      p.theme.colors.grayscale.g0,
      p.theme.colors.grayscale.g100
    )};
  padding: ${defaultMargins.xxs}
    calc(${defaultMargins.xs} + ${defaultMargins.xxs});

  outline: none;
  &:focus {
    outline: 2px solid ${(p) => p.theme.colors.main.m3};
    outline-offset: 2px;
  }
  ${(p) => (p.fitContent ? 'width: fit-content;' : '')}
`

type SelectionChipProps = {
  text: string
  selected: boolean
  onChange: (selected: boolean) => void
  'data-qa'?: string
  showIcon?: boolean
}

function preventDefault(e: React.UIEvent<unknown>) {
  e.preventDefault()
}

export const SelectionChip = React.memo(function SelectionChip({
  text,
  selected,
  onChange,
  'data-qa': dataQa,
  showIcon = true
}: SelectionChipProps) {
  const ariaId = useUniqueId('selection-chip')

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault()
      onChange(!selected)
    },
    [onChange, selected]
  )

  return (
    <div data-qa={dataQa} onClick={onClick}>
      <SelectionChipWrapper>
        <SelectionChipInnerWrapper
          className={classNames({ checked: selected })}
        >
          <HiddenInput
            type="checkbox"
            onChange={() => onChange(!selected)}
            onClick={preventDefault}
            checked={selected}
            id={ariaId}
          />
          {showIcon && selected && (
            <IconWrapper>
              <FontAwesomeIcon icon={faCheck} />
            </IconWrapper>
          )}
          <StyledLabel
            className={classNames({ checked: showIcon && selected })}
            htmlFor={ariaId}
            onClick={preventDefault}
          >
            {text}
          </StyledLabel>
        </SelectionChipInnerWrapper>
      </SelectionChipWrapper>
    </div>
  )
})

export const ChoiceChip = React.memo(function ChoiceChip({
  text,
  selected,
  onChange,
  'data-qa': dataQa
}: SelectionChipProps) {
  return (
    <SelectionChip
      text={text}
      selected={selected}
      onChange={onChange}
      data-qa={dataQa}
      showIcon={false}
    />
  )
})

const StyledLabel = styled.label`
  cursor: pointer;
`

const SelectionChipWrapper = styled.div`
  font-family: 'Open Sans', sans-serif;
  font-weight: ${fontWeights.semibold};
  font-size: 14px;
  line-height: 18px;
  user-select: none;
  border-radius: 1000px;
  cursor: pointer;
  outline: none;

  &:focus,
  &:focus-within {
    border: 2px solid ${(p) => p.theme.colors.main.m1};
    border-radius: 1000px;
    margin: -2px;
  }
  padding: 2px;
`

const SelectionChipInnerWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  border-radius: 1000px;
  padding: 0 calc(${defaultMargins.xs} + ${defaultMargins.xxs});
  background-color: ${(p) => p.theme.colors.grayscale.g0};
  color: ${(p) => p.theme.colors.main.m2};
  border: 1px solid ${(p) => p.theme.colors.main.m2};
  &.checked {
    background-color: ${(p) => p.theme.colors.main.m2};
    color: ${(p) => p.theme.colors.grayscale.g0};
  }

  @media (max-width: ${tabletMin}) {
    height: 40px;
  }
`

const HiddenInput = styled.input`
  outline: none;
  appearance: none;
  border: none;
  background: none;
  margin: 0;
  height: 32px;
  width: 0;
`

const IconWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: ${defaultMargins.xs};

  font-size: 24px;
  color: ${(p) => p.theme.colors.grayscale.g0};
`

export const ChipWrapper = styled.div<{
  margin?: keyof typeof defaultMargins
  $justifyContent?: Property.JustifyContent
}>`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: ${(p) => p.$justifyContent ?? 'flex-start'};

  ${(p) => css`
    > div {
      margin-bottom: ${defaultMargins[p.margin ?? 's']};
    }
  `};
`
