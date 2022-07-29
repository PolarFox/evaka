// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import React from 'react'
import styled from 'styled-components'

import { faTimes } from 'lib-icons'

import RoundIcon from '../atoms/RoundIcon'
import IconButton from '../atoms/buttons/IconButton'
import { tabletMin } from '../breakpoints'
import { FixedSpaceRow } from '../layout/flex-helpers'
import { modalZIndex } from '../layout/z-helpers'
import { defaultMargins } from '../white-space'

export interface Props {
  icon: IconDefinition
  iconColor: string
  onClick?: () => void
  onClose?: () => void
  offsetTop?: string
  offsetTopDesktop?: string
  children?: React.ReactNode
  dataQa?: string
}

export default React.memo(function Toast({
  icon,
  iconColor,
  onClick,
  onClose,
  children,
  dataQa
}: Props) {
  return (
    <ToastRoot role="dialog" showPointer={!!onClick} data-qa={dataQa}>
      <FixedSpaceRow alignItems="center">
        <RoundIcon
          content={icon}
          color={iconColor}
          size="L"
          onClick={onClick}
        />
        <ToastContent onClick={onClick}>{children}</ToastContent>
        {onClose && (
          <CloseButton icon={faTimes} onClick={onClose} altText="Close" />
        )}
      </FixedSpaceRow>
    </ToastRoot>
  )
})

const ToastRoot = styled.div<{
  showPointer: boolean
}>`
  width: 100%;
  @media (min-width: ${tabletMin}) {
    right: 16px;
    width: 480px;
    max-width: 360px;
  }
  padding: ${defaultMargins.s};
  background-color: ${(p) => p.theme.colors.grayscale.g0};
  border-radius: 16px;
  box-shadow: 4px 4px 8px rgba(15, 15, 15, 0.15),
    -2px 0 4px rgba(15, 15, 15, 0.15);
  z-index: ${modalZIndex - 5};
  cursor: ${(p) => (p.showPointer ? 'pointer' : 'auto')};
`

const ToastContent = styled.div`
  flex-grow: 1;
`

const CloseButton = styled(IconButton)`
  align-self: flex-start;
  color: ${(p) => p.theme.colors.main.m2};
`
