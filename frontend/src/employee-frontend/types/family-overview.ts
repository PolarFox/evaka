// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { IncomeEffect } from 'lib-common/api-types/income'
import type LocalDate from 'lib-common/local-date'

export interface FamilyOverviewPerson {
  personId: string
  firstName: string
  lastName: string
  dateOfBirth: LocalDate
  restrictedDetailsEnabled: boolean
  streetAddress: string
  postalCode: string
  postOffice: string
  headOfChild: string
  income?: FamilyOverviewIncome
}

export interface FamilyOverview {
  headOfFamily: FamilyOverviewPerson
  partner?: FamilyOverviewPerson
  children: FamilyOverviewPerson[]
  totalIncome?: FamilyOverviewIncome
}

export type FamilyOverviewPersonRole = 'HEAD' | 'PARTNER' | 'CHILD'

export interface FamilyOverviewRow {
  personId: string
  name: string
  role: FamilyOverviewPersonRole
  age: number
  restrictedDetailsEnabled: boolean
  address: string
  income?: FamilyOverviewIncome
}

interface FamilyOverviewIncome {
  effect?: IncomeEffect
  total?: number
}

export type FamilyContactRole =
  | 'LOCAL_GUARDIAN'
  | 'LOCAL_ADULT'
  | 'LOCAL_SIBLING'
  | 'REMOTE_GUARDIAN'

export interface FamilyContact {
  id: string
  role: FamilyContactRole
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  backupPhone: string | null
  streetAddress: string
  postalCode: string
  postOffice: string
  priority: number
}
