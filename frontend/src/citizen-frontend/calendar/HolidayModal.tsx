// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'
import { UnwrapResult } from 'citizen-frontend/async-rendering'
import { useLang, useTranslation } from 'citizen-frontend/localization'
import { ReservationChild } from 'lib-common/generated/api-types/reservations'
import ExternalLink from 'lib-components/atoms/ExternalLink'
import ErrorSegment from 'lib-components/atoms/state/ErrorSegment'
import Spinner from 'lib-components/atoms/state/Spinner'
import { AsyncFormModal } from 'lib-components/molecules/modals/FormModal'
import { useHolidayPeriods } from '../holiday-periods/state'

interface Props {
  close: () => void
  reload: () => void
  availableChildren: ReservationChild[]
}

export const HolidayModal = React.memo(function HolidayModal({
  close,
  reload,
  availableChildren
}: Props) {
  const i18n = useTranslation()
  const [lang] = useLang()
  const { holidayPeriods } = useHolidayPeriods()

  return (
    <AsyncFormModal
      mobileFullScreen
      title={i18n.calendar.holidayModal.title}
      resolveAction={(_cancel) => {
        return Promise.resolve()
      }}
      onSuccess={() => {
        close()
        reload()
      }}
      resolveLabel={i18n.common.confirm}
      rejectAction={close}
      rejectLabel={i18n.common.cancel}
    >
      <UnwrapResult
        result={holidayPeriods}
        loading={() => <Spinner />}
        failure={() => (
          <ErrorSegment title={i18n.common.errors.genericGetError} />
        )}
      >
        {([holidayPeriod]) =>
          holidayPeriod && (
            <>
              <div>
                <div>{holidayPeriod.description[lang]}</div>
                <ExternalLink
                  text={i18n.calendar.holidayModal.additionalInformation}
                  href={holidayPeriod.descriptionLink[lang]}
                  newTab
                />
              </div>
              {availableChildren
                .map(
                  (child) =>
                    child.preferredName || child.firstName.split(' ')[0]
                )
                .join(', ')}
            </>
          )
        }
      </UnwrapResult>
    </AsyncFormModal>
  )
})

export default HolidayModal
