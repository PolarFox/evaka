// SPDX-FileCopyrightText: 2017-2023 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

// GENERATED FILE: no manual modifications
/* eslint-disable import/order, prettier/prettier, @typescript-eslint/no-namespace */

import type HelsinkiDateTime from '../../helsinki-date-time'
import type LocalTime from '../../local-time'
import { type UUID } from '../../types'

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
  hasStaffOccupancyEffect: boolean | null
  id: UUID
  lastName: string
  temporary: boolean
}

/**
* Generated from fi.espoo.evaka.shared.security.EmployeeFeatures
*/
export interface EmployeeFeatures {
  applications: boolean
  assistanceNeedDecisionsReport: boolean
  createDraftInvoices: boolean
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
  submitPatuReport: boolean
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
* Generated from fi.espoo.evaka.shared.domain.TimeRange
*/
export interface TimeRange {
  end: LocalTime
  start: LocalTime
}

/**
* Generated from fi.espoo.evaka.shared.domain.Translatable
*/
export interface Translatable {
  en: string
  fi: string
  sv: string
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
  | 'MESSAGING'
  | 'UNIT_SUPERVISOR'
  | 'STAFF'
  | 'SPECIAL_EDUCATION_TEACHER'
  | 'EARLY_CHILDHOOD_EDUCATION_SECRETARY'
  | 'MOBILE'
  | 'GROUP_STAFF'
