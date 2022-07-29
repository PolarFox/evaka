// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'
import styled from 'styled-components'

import InlineButton from 'lib-components/atoms/buttons/InlineButton'

import type { Action } from './ApplicationActions'

type Props = {
  action: Action | undefined
}

const PrimaryActionContainer = styled.div`
  padding-right: 16px;
`

export default React.memo(function PrimaryAction({ action }: Props) {
  return (
    <>
      {action && (
        <PrimaryActionContainer onClick={(e) => e.stopPropagation()}>
          <InlineButton
            text={action.label}
            onClick={action.onClick}
            disabled={!action.enabled}
            data-qa={`primary-action-${action.id}`}
          />
        </PrimaryActionContainer>
      )}
    </>
  )
})
