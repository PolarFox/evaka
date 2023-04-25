// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { faInfo } from 'Icons'
import React, { useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import { useTranslation } from 'citizen-frontend/localization'
import type FiniteDateRange from 'lib-common/finite-date-range'
import type { ReservationResponseDay } from 'lib-common/generated/api-types/reservations'
import LocalDate from 'lib-common/local-date'
import { useQuery } from 'lib-common/query'
import { NotificationsContext } from 'lib-components/Notifications'
import type { Translations } from 'lib-customizations/citizen'
import colors from 'lib-customizations/common'
import { faTreePalm } from 'lib-icons'

import { useCalendarModalState } from './CalendarPage'
import {
  activeQuestionnaireQuery,
  holidayPeriodsQuery,
  incomeExpirationDatesQuery
} from './queries'

type NoCta = { type: 'none' }
type HolidayCta =
  | NoCta
  | { type: 'holiday'; period: FiniteDateRange; deadline: LocalDate }
  | { type: 'questionnaire'; deadline: LocalDate }

interface Props {
  calendarDays: ReservationResponseDay[]
}

export default React.memo(function CalendarNotifications({
  calendarDays
}: Props) {
  const navigate = useNavigate()

  const { addNotification, removeNotification } =
    useContext(NotificationsContext)
  const i18n = useTranslation()

  const { openHolidayModal, openReservationModal } = useCalendarModalState()

  const { data: incomeExpirationDate } = useQuery(incomeExpirationDatesQuery, {
    onSuccess: (incomeExpirationDate) => {
      if (incomeExpirationDate) {
        addNotification(
          {
            icon: faInfo,
            iconColor: colors.main.m2,
            children: i18n.ctaToast.incomeExpirationCta(
              incomeExpirationDate.format()
            ),
            onClick: () => {
              navigate('/income')
              removeNotification('expiring-income-cta')
            },
            dataQa: 'expiring-income-cta'
          },
          'expiring-income-cta'
        )
      }
    }
  })
  const { data: activeQuestionnaire } = useQuery(activeQuestionnaireQuery)
  const { data: holidayPeriods } = useQuery(holidayPeriodsQuery, {
    enabled: activeQuestionnaire !== undefined,
    onSuccess: (periods) => {
      let cta: HolidayCta
      if (activeQuestionnaire) {
        cta = {
          type: 'questionnaire',
          deadline: activeQuestionnaire.questionnaire.active.end
        }
      } else {
        const today = LocalDate.todayInSystemTz()
        const activeHolidayPeriod = periods.find((p) =>
          p.reservationDeadline.isEqualOrAfter(today)
        )
        cta =
          activeHolidayPeriod !== undefined &&
          !reservationsExistForPeriod(activeHolidayPeriod.period, calendarDays)
            ? {
                type: 'holiday',
                deadline: activeHolidayPeriod.reservationDeadline,
                period: activeHolidayPeriod.period
              }
            : { type: 'none' }
      }

      if (cta.type === 'none') {
        removeNotification('holiday-period-cta')
      } else {
        addNotification(
          {
            icon: faTreePalm,
            iconColor: colors.status.warning,
            onClick() {
              switch (cta.type) {
                case 'questionnaire':
                  openHolidayModal()
                  break
                case 'holiday':
                  openReservationModal(cta.period)
                  removeNotification('holiday-period-cta')
                  break
              }
              return 'close'
            },
            children: getHolidayCtaText(cta, i18n),
            dataQa: 'holiday-period-cta'
          },
          'holiday-period-cta'
        )
      }
    }
  })

  return (
    <div
      data-holiday-period-cta-status={
        activeQuestionnaire !== undefined && holidayPeriods !== undefined
          ? 'success'
          : 'loading'
      }
      data-expiring-income-cta-status={
        incomeExpirationDate !== undefined ? 'success' : 'loading'
      }
    />
  )
})

function getHolidayCtaText(
  cta: Exclude<HolidayCta, NoCta>,
  i18n: Translations
) {
  switch (cta.type) {
    case 'holiday':
      return i18n.ctaToast.holidayPeriodCta(cta.period, cta.deadline)
    case 'questionnaire':
      return i18n.ctaToast.fixedPeriodCta(cta.deadline)
  }
}

function reservationsExistForPeriod(
  period: FiniteDateRange,
  calendarDays: ReservationResponseDay[]
) {
  return calendarDays.every((day) => {
    if (period.includes(day.date)) {
      return day.children.every((child) => {
        return child.reservations.length > 0 || child.absence !== null
      })
    } else {
      return true
    }
  })
}
