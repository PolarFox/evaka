// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import mapValues from 'lodash/mapValues'

import type { Result } from 'lib-common/api'
import { Failure, Success } from 'lib-common/api'
import { parseDailyServiceTimes } from 'lib-common/api-types/daily-service-times'
import type FiniteDateRange from 'lib-common/finite-date-range'
import type {
  AbsenceThreshold,
  Child,
  ChildAttendanceStatusResponse
} from 'lib-common/generated/api-types/attendance'
import type {
  Absence,
  AbsenceType
} from 'lib-common/generated/api-types/daycare'
import HelsinkiDateTime from 'lib-common/helsinki-date-time'
import type { JsonOf } from 'lib-common/json'
import LocalDate from 'lib-common/local-date'
import { parseReservation } from 'lib-common/reservations'
import type { UUID } from 'lib-common/types'

import { client } from '../client'

export async function getUnitChildren(unitId: string): Promise<Child[]> {
  return client
    .get<JsonOf<Child[]>>(`/attendances/units/${unitId}/children`)
    .then((res) => deserializeChildren(res.data))
}

export async function getUnitAttendanceStatuses(
  unitId: string
): Promise<Record<UUID, ChildAttendanceStatusResponse | undefined>> {
  return client
    .get<JsonOf<Record<UUID, ChildAttendanceStatusResponse>>>(
      `/attendances/units/${unitId}/attendances`
    )
    .then((res) =>
      mapValues(res.data, deserializeChildAttendanceStatusResponse)
    )
}

export async function createArrival({
  unitId,
  childId,
  arrived
}: {
  unitId: string
  childId: string
  arrived: string
}): Promise<void> {
  return client
    .post(`/attendances/units/${unitId}/children/${childId}/arrival`, {
      arrived
    })
    .then(() => undefined)
}

export async function returnToComing({
  unitId,
  childId
}: {
  unitId: string
  childId: string
}): Promise<void> {
  return client
    .post(`/attendances/units/${unitId}/children/${childId}/return-to-coming`)
    .then(() => undefined)
}

export async function returnToPresent({
  unitId,
  childId
}: {
  unitId: string
  childId: string
}): Promise<void> {
  return client
    .post(`/attendances/units/${unitId}/children/${childId}/return-to-present`)
    .then(() => undefined)
}

export async function createFullDayAbsence({
  unitId,
  childId,
  absenceType
}: {
  unitId: string
  childId: string
  absenceType: AbsenceType
}): Promise<void> {
  return client
    .post(`/attendances/units/${unitId}/children/${childId}/full-day-absence`, {
      absenceType
    })
    .then(() => undefined)
}

export async function postAbsenceRange(
  unitId: string,
  childId: string,
  absenceType: AbsenceType,
  startDate: LocalDate,
  endDate: LocalDate
): Promise<Result<void>> {
  return client
    .post<JsonOf<void>>(
      `/attendances/units/${unitId}/children/${childId}/absence-range`,
      {
        absenceType,
        startDate,
        endDate
      }
    )
    .then(() => Success.of())
    .catch((e) => Failure.fromError(e))
}

export async function getFutureAbsencesByChild(
  childId: UUID
): Promise<Result<Absence[]>> {
  return client
    .get<JsonOf<Absence[]>>(`/absences/by-child/${childId}/future`)
    .then((res) =>
      res.data.map((absence) => ({
        ...absence,
        date: LocalDate.parseIso(absence.date)
      }))
    )
    .then((v) => Success.of(v))
    .catch((e) => Failure.fromError(e))
}

export async function getChildDeparture({
  unitId,
  childId
}: {
  unitId: string
  childId: string
}): Promise<AbsenceThreshold[]> {
  return client
    .get<JsonOf<AbsenceThreshold[]>>(
      `/attendances/units/${unitId}/children/${childId}/departure`
    )
    .then((res) => res.data)
}

export async function createDeparture({
  unitId,
  childId,
  absenceType,
  departed
}: {
  unitId: string
  childId: string
  absenceType: AbsenceType | null
  departed: string
}): Promise<void> {
  return client
    .post(`/attendances/units/${unitId}/children/${childId}/departure`, {
      absenceType,
      departed
    })
    .then(() => undefined)
}

export async function deleteAbsenceRange(
  unitId: UUID,
  childId: UUID,
  dateRange: FiniteDateRange
): Promise<Result<void>> {
  return client
    .delete(`/attendances/units/${unitId}/children/${childId}/absence-range`, {
      params: {
        from: dateRange.start.formatIso(),
        to: dateRange.end.formatIso()
      }
    })
    .then((res) => Success.of(res.data))
    .catch((e) => Failure.fromError(e))
}

function compareByProperty(
  a: Child,
  b: Child,
  property: 'firstName' | 'lastName'
) {
  if (a[property] < b[property]) {
    return -1
  }
  if (a[property] > b[property]) {
    return 1
  }
  return 0
}

function deserializeChildren(data: JsonOf<Child[]>): Child[] {
  return data
    .map((child) => ({
      ...child,
      dateOfBirth: LocalDate.parseIso(child.dateOfBirth),
      dailyNote: child.dailyNote
        ? {
            ...child.dailyNote,
            modifiedAt: HelsinkiDateTime.parseIso(child.dailyNote.modifiedAt)
          }
        : null,
      stickyNotes: child.stickyNotes.map((note) => ({
        ...note,
        modifiedAt: HelsinkiDateTime.parseIso(note.modifiedAt),
        expires: LocalDate.parseIso(note.expires)
      })),
      reservations: child.reservations.map(parseReservation),
      dailyServiceTimes: child.dailyServiceTimes
        ? parseDailyServiceTimes(child.dailyServiceTimes)
        : null
    }))
    .sort((a, b) => compareByProperty(a, b, 'firstName'))
}

function deserializeChildAttendanceStatusResponse(
  data: JsonOf<ChildAttendanceStatusResponse>
): ChildAttendanceStatusResponse {
  return {
    ...data,
    attendances: data.attendances.map((attendance) => ({
      arrived: HelsinkiDateTime.parseIso(attendance.arrived),
      departed: attendance.departed
        ? HelsinkiDateTime.parseIso(attendance.departed)
        : null
    }))
  }
}

export async function uploadChildImage({
  childId,
  file
}: {
  childId: string
  file: File
}): Promise<void> {
  const formData = new FormData()
  formData.append('file', file)

  return client
    .put(`/children/${childId}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    .then(() => undefined)
}

export async function deleteChildImage(childId: string): Promise<void> {
  return client.delete(`/children/${childId}/image`).then(() => undefined)
}
