// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { Result } from 'lib-common/api'
import { Failure, Success } from 'lib-common/api'
import type {
  CurrentDayStaffAttendanceResponse,
  ExternalStaffArrivalRequest,
  ExternalStaffDepartureRequest,
  StaffArrivalRequest,
  StaffDepartureRequest
} from 'lib-common/generated/api-types/attendance'
import HelsinkiDateTime from 'lib-common/helsinki-date-time'
import type { JsonOf } from 'lib-common/json'
import type { UUID } from 'lib-common/types'

import { client } from '../client'

export async function getUnitStaffAttendances(
  unitId: UUID
): Promise<Result<CurrentDayStaffAttendanceResponse>> {
  return client
    .get<JsonOf<CurrentDayStaffAttendanceResponse>>(
      `/mobile/realtime-staff-attendances`,
      {
        params: { unitId }
      }
    )
    .then((res) =>
      Success.of({
        ...res.data,
        staff: res.data.staff.map((staff) => ({
          ...staff,
          latestCurrentDayAttendance: staff.latestCurrentDayAttendance
            ? {
                ...staff.latestCurrentDayAttendance,
                arrived: HelsinkiDateTime.parseIso(
                  staff.latestCurrentDayAttendance.arrived
                ),
                departed: staff.latestCurrentDayAttendance.departed
                  ? HelsinkiDateTime.parseIso(
                      staff.latestCurrentDayAttendance.departed
                    )
                  : null
              }
            : null,
          plannedAttendances: staff.plannedAttendances.map(
            ({ start, end, ...plan }) => ({
              ...plan,
              start: HelsinkiDateTime.parseIso(start),
              end: HelsinkiDateTime.parseIso(end)
            })
          ),
          attendances: staff.attendances.map(
            ({ arrived, departed, ...attendance }) => ({
              ...attendance,
              arrived: HelsinkiDateTime.parseIso(arrived),
              departed: departed ? HelsinkiDateTime.parseIso(departed) : null
            })
          ),
          spanningPlan: staff.spanningPlan
            ? {
                start: HelsinkiDateTime.parseIso(staff.spanningPlan.start),
                end: HelsinkiDateTime.parseIso(staff.spanningPlan.end)
              }
            : null
        })),
        extraAttendances: res.data.extraAttendances.map((att) => ({
          ...att,
          arrived: HelsinkiDateTime.parseIso(att.arrived)
        }))
      })
    )
    .catch((e) => Failure.fromError(e))
}

export async function postStaffArrival(
  request: StaffArrivalRequest
): Promise<Result<void>> {
  return client
    .post(`/mobile/realtime-staff-attendances/arrival`, request)
    .then(() => Success.of())
    .catch((e) => Failure.fromError(e))
}

export async function postStaffDeparture(
  request: StaffDepartureRequest
): Promise<Result<void>> {
  return client
    .post(`/mobile/realtime-staff-attendances/departure`, request)
    .then(() => Success.of())
    .catch((e) => Failure.fromError(e))
}

export async function postExternalStaffArrival(
  body: ExternalStaffArrivalRequest
): Promise<Result<void>> {
  return client
    .post(`/mobile/realtime-staff-attendances/arrival-external`, body)
    .then(() => Success.of())
    .catch((e) => Failure.fromError(e))
}

export async function postExternalStaffDeparture(
  body: ExternalStaffDepartureRequest
): Promise<Result<void>> {
  return client
    .post(`/mobile/realtime-staff-attendances/departure-external`, body)
    .then(() => Success.of())
    .catch((e) => Failure.fromError(e))
}
