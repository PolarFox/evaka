// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { type MobileDeviceDetails } from 'lib-common/generated/api-types/pairing'

import { type EmployeeFeatures } from '../generated/api-types/shared'
import { type UUID } from '../types'

export interface User {
  id: UUID
  name: string
  userType: 'EMPLOYEE'
  accessibleFeatures: EmployeeFeatures
}

export interface MobileUser extends MobileDeviceDetails {
  userType: 'MOBILE'
  pinLoginActive: boolean
}

export const globalRoles = [
  'ADMIN',
  'SERVICE_WORKER',
  'FINANCE_ADMIN',
  'REPORT_VIEWER',
  'DIRECTOR',
  'MESSAGING'
] as const

export type GlobalRole = typeof globalRoles[number]

export const scopedRoles = [
  'UNIT_SUPERVISOR',
  'SPECIAL_EDUCATION_TEACHER',
  'EARLY_CHILDHOOD_EDUCATION_SECRETARY',
  'STAFF'
] as const

export type ScopedRole = typeof scopedRoles[number]

export type AdRole = GlobalRole | ScopedRole

export interface AuthStatus<U extends User | MobileUser> {
  loggedIn: boolean
  user?: U
  roles?: AdRole[]
  apiVersion: string
}
