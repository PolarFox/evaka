// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { Result, Response } from 'lib-common/api'
import { Failure, Success } from 'lib-common/api'
import type { GroupStaffAttendanceForDates } from 'lib-common/api-types/codegen-excluded'
import type {
  AbsenceDelete,
  AbsenceGroup,
  AbsenceUpsert,
  GroupStaffAttendance,
  StaffAttendanceUpdate
} from 'lib-common/generated/api-types/daycare'
import HelsinkiDateTime from 'lib-common/helsinki-date-time'
import type { JsonOf } from 'lib-common/json'
import LocalDate from 'lib-common/local-date'
import type { UUID } from 'lib-common/types'

import { deserializeChild } from '../types/absence'

import { client } from './client'

interface SearchParams {
  year: number
  month: number
}

export async function getGroupAbsences(
  groupId: UUID,
  params: SearchParams
): Promise<Result<AbsenceGroup>> {
  return client
    .get<JsonOf<AbsenceGroup>>(`/absences/${groupId}`, { params })
    .then((res) => res.data)
    .then((data) => ({
      ...data,
      children: data.children
        .map(deserializeChild)
        .sort(({ child: childA }, { child: childB }) => {
          const lastNameCmp = childA.lastName.localeCompare(
            childB.lastName,
            'fi',
            { ignorePunctuation: true }
          )
          return lastNameCmp !== 0
            ? lastNameCmp
            : childA.firstName.localeCompare(childB.firstName, 'fi', {
                ignorePunctuation: true
              })
        }),
      operationDays: data.operationDays.map((date) => LocalDate.parseIso(date))
    }))
    .then((v) => Success.of(v))
    .catch((e) => Failure.fromError(e))
}

export async function postGroupAbsences(
  groupId: UUID,
  absences: AbsenceUpsert[]
): Promise<Result<void>> {
  return client
    .post<void>(`/absences/${groupId}`, absences)
    .then((res) => Success.of(res.data))
    .catch((e) => Failure.fromError(e))
}

export async function deleteGroupAbsences(
  groupId: UUID,
  deletions: AbsenceDelete[]
): Promise<Result<void>> {
  return client
    .post<void>(`/absences/${groupId}/delete`, deletions)
    .then((res) => Success.of(res.data))
    .catch((e) => Failure.fromError(e))
}

export async function deleteChildAbsences(
  childId: UUID,
  date: LocalDate
): Promise<Result<void>> {
  return client
    .post<void>(`/absences/by-child/${childId}/delete`, { date })
    .then(() => Success.of())
    .catch((e) => Failure.fromError(e))
}

export async function getStaffAttendances(
  groupId: UUID,
  params: SearchParams
): Promise<Result<GroupStaffAttendanceForDates>> {
  return client
    .get<JsonOf<Response<GroupStaffAttendanceForDates>>>(
      `/staff-attendances/group/${groupId}`,
      {
        params
      }
    )
    .then((res) => res.data.data)
    .then((group) => ({
      ...group,
      startDate: LocalDate.parseIso(group.startDate),
      endDate: LocalDate.parseNullableIso(group.endDate),
      attendances: Object.entries(group.attendances).reduce(
        (attendanceMap, [key, attendance]) => {
          attendanceMap.set(key, {
            ...attendance,
            date: LocalDate.parseIso(attendance.date),
            updated: HelsinkiDateTime.parseIso(attendance.updated)
          })
          return attendanceMap
        },
        new Map<string, GroupStaffAttendance>()
      )
    }))
    .then((v) => Success.of(v))
    .catch((e) => Failure.fromError(e))
}

export async function postStaffAttendance(
  staffAttendance: StaffAttendanceUpdate
): Promise<Result<void>> {
  return client
    .post(
      `/staff-attendances/group/${staffAttendance.groupId}`,
      staffAttendance
    )
    .then((res) => Success.of(res.data))
    .catch((e) => Failure.fromError(e))
}
