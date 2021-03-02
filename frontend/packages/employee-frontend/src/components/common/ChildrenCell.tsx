// SPDX-FileCopyrightText: 2017-2020 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'
import { useTranslation } from '../../state/i18n'
import NameWithSsn from '../common/NameWithSsn'
import { formatName } from '../../utils'
import LocalDate from '@evaka/lib-common/src/local-date'

type Props = {
  people: {
    firstName: string
    lastName: string
    dateOfBirth: LocalDate
    ssn: string | null
  }[]
}

function ChildrenCell({ people }: Props) {
  const { i18n } = useTranslation()

  if (people.length === 0) {
    return <span />
  }

  const visibleContent =
    people.length > 1 ? (
      i18n.common.multipleChildren
    ) : (
      <NameWithSsn {...people[0]} i18n={i18n} />
    )

  const htmlTitle = people
    .map(
      ({ firstName, lastName, dateOfBirth, ssn }) =>
        `${formatName(firstName, lastName, i18n, true)} (${
          ssn || dateOfBirth.format()
        })`
    )
    .join('\n')

  return <span title={htmlTitle}>{visibleContent}</span>
}

export default ChildrenCell
