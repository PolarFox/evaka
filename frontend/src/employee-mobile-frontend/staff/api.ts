// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { Result } from 'lib-common/api'
import { Failure, Success } from 'lib-common/api'
import FiniteDateRange from 'lib-common/finite-date-range'
import type {
  StaffAttendanceUpdate,
  UnitStaffAttendance
} from 'lib-common/generated/api-types/daycare'
import HelsinkiDateTime from 'lib-common/helsinki-date-time'
import type { JsonOf } from 'lib-common/json'
import LocalDate from 'lib-common/local-date'
import type { UUID } from 'lib-common/types'

import { client } from '../client'

export async function getUnitStaffAttendances(
  unitId: UUID
): Promise<Result<UnitStaffAttendance>> {
  return client
    .get<JsonOf<UnitStaffAttendance>>(`/staff-attendances/unit/${unitId}`)
    .then((res) => res.data)
    .then((res) => ({
      ...res,
      date: LocalDate.parseIso(res.date),
      updated: res.updated ? HelsinkiDateTime.parseIso(res.updated) : null,
      groups: res.groups.map((group) => ({
        ...group,
        date: LocalDate.parseIso(group.date),
        updated: HelsinkiDateTime.parseIso(group.updated)
      }))
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

interface OccupancyResponse {
  occupancies: OccupancyPeriod[]
  max: OccupancyPeriod | null
  min: OccupancyPeriod | null
}

export type OccupancyResponseGroupLevel = Array<{
  groupId: UUID
  occupancies: OccupancyResponse
}>

interface OccupancyPeriod {
  period: FiniteDateRange
  sum: number
  headcount: number
  caretakers: number
  percentage: number
}

export async function getRealizedOccupancyToday(
  unitId: string,
  groupId: string | undefined
): Promise<Result<number>> {
  if (groupId) {
    return (await getRealizedGroupOccupanciesToday(unitId)).map(
      (response: OccupancyResponseGroupLevel) => {
        // There's only one occupancy, because we only fetch today's occupancy, so we can use `min`
        const percentage = response.find((group) => group.groupId === groupId)
          ?.occupancies.min?.percentage
        return percentage ?? 0
      }
    )
  } else {
    return (await getRealizedUnitOccupancyToday(unitId)).map(
      (response) => response.min?.percentage ?? 0
    )
  }
}

async function getRealizedUnitOccupancyToday(
  unitId: UUID
): Promise<Result<OccupancyResponse>> {
  const today = LocalDate.todayInSystemTz().toString()
  return await client
    .get<JsonOf<OccupancyResponse>>(`/occupancy/by-unit/${unitId}`, {
      params: { from: today, to: today, type: 'REALIZED' }
    })
    .then((res) => res.data)
    .then(mapOccupancyResponse)
    .then((v) => Success.of(v))
    .catch((e) => Failure.fromError(e))
}

export async function getRealizedGroupOccupanciesToday(
  unitId: UUID
): Promise<Result<OccupancyResponseGroupLevel>> {
  const today = LocalDate.todayInSystemTz().toString()
  return await client
    .get<JsonOf<OccupancyResponseGroupLevel>>(
      `/occupancy/by-unit/${unitId}/groups`,
      { params: { from: today, to: today, type: 'REALIZED' } }
    )
    .then((res) => res.data)
    .then(
      (data): OccupancyResponseGroupLevel =>
        data.map((group) => ({
          ...group,
          occupancies: mapOccupancyResponse(group.occupancies)
        }))
    )
    .then((v) => Success.of(v))
    .catch((e) => Failure.fromError(e))
}

function mapOccupancyResponse(
  response: JsonOf<OccupancyResponse>
): OccupancyResponse {
  return {
    occupancies: response.occupancies.map(mapOccupancyPeriod),
    max: mapOccupancyPeriod(response.max),
    min: mapOccupancyPeriod(response.min)
  }
}

function mapOccupancyPeriod(
  period: JsonOf<OccupancyPeriod> | null
): OccupancyPeriod | null
function mapOccupancyPeriod(period: JsonOf<OccupancyPeriod>): OccupancyPeriod
function mapOccupancyPeriod(
  period: JsonOf<OccupancyPeriod> | null
): OccupancyPeriod | null {
  if (!period) return null
  return {
    ...period,
    period: FiniteDateRange.parseJson(period.period)
  }
}
