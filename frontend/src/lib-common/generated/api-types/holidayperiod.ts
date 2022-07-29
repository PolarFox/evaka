// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

// GENERATED FILE: no manual modifications
/* eslint-disable import/order, prettier/prettier */

import type FiniteDateRange from '../../finite-date-range'
import type LocalDate from '../../local-date'
import type { AbsenceType } from './daycare'
import type { Translatable } from './shared'
import type { UUID } from '../../types'

/**
* Generated from fi.espoo.evaka.holidayperiod.ActiveQuestionnaire
*/
export interface ActiveQuestionnaire {
  eligibleChildren: UUID[]
  previousAnswers: HolidayQuestionnaireAnswer[]
  questionnaire: FixedPeriodQuestionnaire
}

/**
* Generated from fi.espoo.evaka.holidayperiod.FixedPeriodQuestionnaire
*/
export interface FixedPeriodQuestionnaire {
  absenceType: AbsenceType
  active: FiniteDateRange
  conditions: QuestionnaireConditions
  description: Translatable
  descriptionLink: Translatable
  id: UUID
  periodOptionLabel: Translatable
  periodOptions: FiniteDateRange[]
  requiresStrongAuth: boolean
  title: Translatable
  type: QuestionnaireType
}

/**
* Generated from fi.espoo.evaka.holidayperiod.FixedPeriodQuestionnaireBody
*/
export interface FixedPeriodQuestionnaireBody {
  absenceType: AbsenceType
  active: FiniteDateRange
  conditions: QuestionnaireConditions
  description: Translatable
  descriptionLink: Translatable
  periodOptionLabel: Translatable
  periodOptions: FiniteDateRange[]
  requiresStrongAuth: boolean
  title: Translatable
}

/**
* Generated from fi.espoo.evaka.holidayperiod.FixedPeriodsBody
*/
export interface FixedPeriodsBody {
  fixedPeriods: Record<string, FiniteDateRange | null>
}

/**
* Generated from fi.espoo.evaka.holidayperiod.HolidayPeriod
*/
export interface HolidayPeriod {
  id: UUID
  period: FiniteDateRange
  reservationDeadline: LocalDate | null
}

/**
* Generated from fi.espoo.evaka.holidayperiod.HolidayPeriodBody
*/
export interface HolidayPeriodBody {
  period: FiniteDateRange
  reservationDeadline: LocalDate | null
}

/**
* Generated from fi.espoo.evaka.holidayperiod.HolidayQuestionnaireAnswer
*/
export interface HolidayQuestionnaireAnswer {
  childId: UUID
  fixedPeriod: FiniteDateRange | null
  questionnaireId: UUID
}

/**
* Generated from fi.espoo.evaka.holidayperiod.QuestionnaireConditions
*/
export interface QuestionnaireConditions {
  continuousPlacement: FiniteDateRange | null
}

/**
* Generated from fi.espoo.evaka.holidayperiod.QuestionnaireType
*/
export type QuestionnaireType =
  | 'FIXED_PERIOD'
  | 'OPEN_RANGES'
