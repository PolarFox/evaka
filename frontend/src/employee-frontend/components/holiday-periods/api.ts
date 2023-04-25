// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import {
  deserializeFixedPeriodQuestionnaire,
  deserializeHolidayPeriod
} from 'lib-common/api-types/holiday-period'
import type {
  FixedPeriodQuestionnaire,
  FixedPeriodQuestionnaireBody,
  HolidayPeriod,
  HolidayPeriodBody
} from 'lib-common/generated/api-types/holidayperiod'
import type { JsonOf } from 'lib-common/json'
import type { UUID } from 'lib-common/types'

import { client } from '../../api/client'

export function getHolidayPeriods(): Promise<HolidayPeriod[]> {
  return client
    .get<JsonOf<HolidayPeriod[]>>('/holiday-period')
    .then((res) => res.data.map(deserializeHolidayPeriod))
}

export function getHolidayPeriod(id: UUID): Promise<HolidayPeriod> {
  return client
    .get<JsonOf<HolidayPeriod>>(`/holiday-period/${id}`)
    .then((res) => deserializeHolidayPeriod(res.data))
}

export function createHolidayPeriod(data: HolidayPeriodBody): Promise<void> {
  return client.post('/holiday-period', data).then(() => undefined)
}

export function updateHolidayPeriod({
  id,
  data
}: {
  id: UUID
  data: HolidayPeriodBody
}): Promise<void> {
  return client.put(`/holiday-period/${id}`, data).then(() => undefined)
}

export function deleteHolidayPeriod(id: UUID): Promise<void> {
  return client.delete(`/holiday-period/${id}`).then(() => undefined)
}

export function getQuestionnaires(): Promise<FixedPeriodQuestionnaire[]> {
  return client
    .get<JsonOf<FixedPeriodQuestionnaire[]>>('/holiday-period/questionnaire')
    .then((res) => res.data.map(deserializeFixedPeriodQuestionnaire))
}

export function getQuestionnaire(id: UUID): Promise<FixedPeriodQuestionnaire> {
  return client
    .get<JsonOf<FixedPeriodQuestionnaire>>(
      `/holiday-period/questionnaire/${id}`
    )
    .then((res) => deserializeFixedPeriodQuestionnaire(res.data))
}

export function createFixedPeriodQuestionnaire(
  data: FixedPeriodQuestionnaireBody
): Promise<void> {
  return client
    .post(`/holiday-period/questionnaire`, data)
    .then(() => undefined)
}

export function updateFixedPeriodQuestionnaire({
  id,
  data
}: {
  id: UUID
  data: FixedPeriodQuestionnaireBody
}): Promise<void> {
  return client
    .put(`/holiday-period/questionnaire/${id}`, data)
    .then(() => undefined)
}

export function deleteQuestionnaire(id: UUID): Promise<void> {
  return client
    .delete(`/holiday-period/questionnaire/${id}`)
    .then(() => undefined)
}
