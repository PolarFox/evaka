// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'

import { useMutationResult } from 'lib-common/query'
import type { UUID } from 'lib-common/types'

import { returnToComingMutation } from '../../child-attendance/queries'
import { InlineWideAsyncButton } from '../../common/components'
import { useTranslation } from '../../common/i18n'

interface Props {
  childId: UUID
  unitId: UUID
}

export default React.memo(function AttendanceChildAbsent({
  childId,
  unitId
}: Props) {
  const { i18n } = useTranslation()

  const { mutateAsync: returnToComing } = useMutationResult(
    returnToComingMutation
  )

  return (
    <InlineWideAsyncButton
      text={i18n.attendances.actions.returnToComing}
      onClick={() => returnToComing({ unitId, childId })}
      onSuccess={() => undefined}
      data-qa="delete-attendance"
    />
  )
})
