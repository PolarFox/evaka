// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

// GENERATED FILE: no manual modifications
/* eslint-disable import/order, prettier/prettier */

import type HelsinkiDateTime from '../../helsinki-date-time'
import type { UUID } from '../../types'

/**
* Generated from fi.espoo.evaka.shared.security.CitizenFeatures
*/
export interface CitizenFeatures {
  childDocumentation: boolean
  messages: boolean
  reservations: boolean
}

/**
* Generated from fi.espoo.evaka.shared.domain.Coordinate
*/
export interface Coordinate {
  lat: number
  lon: number
}

/**
* Generated from fi.espoo.evaka.shared.auth.DaycareAclRow
*/
export interface DaycareAclRow {
  employee: DaycareAclRowEmployee
  groupIds: UUID[]
  role: UserRole
}

/**
* Generated from fi.espoo.evaka.shared.auth.DaycareAclRowEmployee
*/
export interface DaycareAclRowEmployee {
  email: string | null
  firstName: string
  id: UUID
  lastName: string
}

/**
* Generated from fi.espoo.evaka.shared.security.EmployeeFeatures
*/
export interface EmployeeFeatures {
  applications: boolean
  createUnits: boolean
  employees: boolean
  finance: boolean
  financeBasics: boolean
  holidayPeriods: boolean
  messages: boolean
  personSearch: boolean
  personalMobileDevice: boolean
  pinCode: boolean
  reports: boolean
  settings: boolean
  unitFeatures: boolean
  units: boolean
  vasuTemplates: boolean
}

/**
* Generated from fi.espoo.evaka.shared.domain.HelsinkiDateTimeRange
*/
export interface HelsinkiDateTimeRange {
  end: HelsinkiDateTime
  start: HelsinkiDateTime
}

/**
* Generated from fi.espoo.evaka.shared.security.PilotFeature
*/
export const pilotFeatures = [
  'MESSAGING',
  'MOBILE',
  'RESERVATIONS',
  'VASU_AND_PEDADOC',
  'MOBILE_MESSAGING',
  'PLACEMENT_TERMINATION',
  'REALTIME_STAFF_ATTENDANCE'
] as const

export type PilotFeature = typeof pilotFeatures[number]

/**
* Generated from fi.espoo.evaka.shared.job.ScheduledJob
*/
export type ScheduledJob =
  | 'CancelOutdatedTransferApplications'
  | 'DvvUpdate'
  | 'EndOfDayAttendanceUpkeep'
  | 'EndOfDayStaffAttendanceUpkeep'
  | 'EndOfDayReservationUpkeep'
  | 'FreezeVoucherValueReports'
  | 'KoskiUpdate'
  | 'RemoveOldAsyncJobs'
  | 'RemoveOldDaycareDailyNotes'
  | 'RemoveOldDraftApplications'
  | 'SendPendingDecisionReminderEmails'
  | 'VardaUpdate'
  | 'VardaReset'
  | 'InactivePeopleCleanup'
  | 'InactiveEmployeesRoleReset'

/**
* Generated from fi.espoo.evaka.shared.domain.Translatable
*/
export interface Translatable {
  en: string
  fi: string
  sv: string
}

/**
* Generated from fi.espoo.evaka.shared.controllers.ScheduledJobTriggerController.TriggerBody
*/
export interface TriggerBody {
  type: ScheduledJob
}

/**
* Generated from fi.espoo.evaka.shared.auth.UserRole
*/
export type UserRole =
  | 'END_USER'
  | 'CITIZEN_WEAK'
  | 'ADMIN'
  | 'REPORT_VIEWER'
  | 'DIRECTOR'
  | 'FINANCE_ADMIN'
  | 'SERVICE_WORKER'
  | 'UNIT_SUPERVISOR'
  | 'STAFF'
  | 'SPECIAL_EDUCATION_TEACHER'
  | 'MOBILE'
  | 'GROUP_STAFF'
