// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type {
  DailyServiceTimes,
  TimeRange
} from 'lib-common/api-types/child/common'
import {
  isIrregular,
  isRegular,
  isVariableTime
} from 'lib-common/api-types/child/common'
import { mockNow } from 'lib-common/utils/helpers'

const dayNames = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday'
] as const

type DayName = typeof dayNames[number]

function getToday(): DayName | undefined {
  // Sunday is 0
  const dayIndex = ((mockNow() ?? new Date()).getDay() + 6) % 7
  return dayNames[dayIndex]
}

export function getTodaysServiceTimes(
  times: DailyServiceTimes | null
): TimeRange | 'not_today' | 'not_set' | 'variable_times' {
  if (times === null) return 'not_set'

  if (isRegular(times)) return times.regularTimes

  if (isVariableTime(times)) return 'variable_times'

  if (isIrregular(times)) {
    const today = getToday()
    if (!today) return 'not_today'

    return times[today] ?? 'not_today'
  }

  return 'not_set'
}
