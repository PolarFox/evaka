// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import {
  type ActiveQuestionnaire,
  type FixedPeriodQuestionnaire,
  type HolidayPeriod
} from 'lib-common/generated/api-types/holidayperiod'

import FiniteDateRange from '../finite-date-range'
import { type JsonOf } from '../json'
import LocalDate from '../local-date'

export const deserializeHolidayPeriod = ({
  period,
  reservationDeadline,
  ...rest
}: JsonOf<HolidayPeriod>): HolidayPeriod => ({
  ...rest,
  reservationDeadline: LocalDate.parseIso(reservationDeadline),
  period: FiniteDateRange.parseJson(period)
})

export const deserializeFixedPeriodQuestionnaire = ({
  conditions: { continuousPlacement },
  active,
  periodOptions,
  ...rest
}: JsonOf<FixedPeriodQuestionnaire>): FixedPeriodQuestionnaire => ({
  ...rest,
  conditions: {
    continuousPlacement: continuousPlacement
      ? FiniteDateRange.parseJson(continuousPlacement)
      : null
  },
  active: FiniteDateRange.parseJson(active),
  periodOptions: periodOptions.map((o) => FiniteDateRange.parseJson(o))
})

export const deserializeActiveQuestionnaire = ({
  questionnaire,
  eligibleChildren,
  previousAnswers
}: JsonOf<ActiveQuestionnaire>): ActiveQuestionnaire => ({
  questionnaire: deserializeFixedPeriodQuestionnaire(questionnaire),
  eligibleChildren,
  previousAnswers: previousAnswers.map(({ fixedPeriod, ...rest }) => ({
    ...rest,
    fixedPeriod: fixedPeriod ? FiniteDateRange.parseJson(fixedPeriod) : null
  }))
})
