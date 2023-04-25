// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { UnitStaffAttendance } from 'lib-common/generated/api-types/daycare'
import type HelsinkiDateTime from 'lib-common/helsinki-date-time'
import type { UUID } from 'lib-common/types'

export interface AttendanceValues {
  count: number
  countOther: number
  updated: HelsinkiDateTime | null
}

export function staffAttendanceForGroupOrUnit(
  unitStaffAttendance: UnitStaffAttendance,
  groupId: UUID | undefined
): AttendanceValues {
  if (groupId === undefined) {
    // Return unit's combined attendance
    return {
      count: unitStaffAttendance.count,
      countOther: unitStaffAttendance.countOther,
      updated: unitStaffAttendance.updated
    }
  } else {
    const groupAttendance = unitStaffAttendance.groups.find(
      (group) => group.groupId === groupId
    )
    return groupAttendance
      ? {
          count: groupAttendance.count,
          countOther: groupAttendance.countOther,
          updated: groupAttendance.updated
        }
      : {
          count: 0,
          countOther: 0,
          updated: null
        }
  }
}
