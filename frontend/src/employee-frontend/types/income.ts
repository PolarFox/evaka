// SPDX-FileCopyrightText: 2017-2020 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { IncomeEffect, IncomeValue } from 'lib-common/api-types/income'
import { JsonOf } from 'lib-common/json'
import LocalDate from 'lib-common/local-date'
import { UUID } from 'lib-common/types'

export type IncomeId = 'new' | UUID

export type IncomeFields = Partial<Record<string, IncomeValue>>

export interface IncomeBody {
  effect: IncomeEffect
  data: IncomeFields
  isEntrepreneur: boolean
  worksAtECHA: boolean
  validFrom: LocalDate
  validTo?: LocalDate
  notes: string
}

export interface Income extends IncomeBody {
  id: UUID
  personId: UUID
  total: number
  totalIncome: number
  totalExpenses: number
  updatedAt: Date
  updatedBy: string
  applicationId: UUID | null
  notes: string
}

export interface IncomeOption {
  value: string
  nameFi: string
  multiplier: number
  withCoefficient: boolean
  isSubType: boolean
}

export const deserializeIncome = (json: JsonOf<Income>): Income => ({
  ...json,
  validFrom: LocalDate.parseIso(json.validFrom),
  validTo: json.validTo ? LocalDate.parseIso(json.validTo) : undefined,
  updatedAt: new Date(json.updatedAt)
})
