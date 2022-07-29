// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'
import styled from 'styled-components'

import type FiniteDateRange from 'lib-common/finite-date-range'
import { Label } from 'lib-components/typography'
import { Gap } from 'lib-components/white-space'

import { useTranslation } from '../../../localization'

const Ul = styled.ul`
  margin: 0;
`

interface Props {
  clubTerms: FiniteDateRange[]
}

export function ClubTermsInfo({ clubTerms }: Props) {
  const i18n = useTranslation()

  return (
    <>
      <Label>
        {
          i18n.applications.editor.serviceNeed.startDate[
            clubTerms.length === 1 ? 'clubTerm' : 'clubTerms'
          ]
        }
      </Label>
      <Gap size="s" />
      <Ul data-qa="club-terms">
        {clubTerms.map((term, i) => (
          <li key={i}>{term.format()}</li>
        ))}
      </Ul>
      <Gap size="m" />
    </>
  )
}
