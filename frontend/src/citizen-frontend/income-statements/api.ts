// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { Paged, Result } from 'lib-common/api'
import { Failure, Success } from 'lib-common/api'
import type { IncomeStatement } from 'lib-common/api-types/incomeStatement'
import { deserializeIncomeStatement } from 'lib-common/api-types/incomeStatement'
import type { ChildBasicInfo } from 'lib-common/generated/api-types/incomestatement'
import type { JsonOf } from 'lib-common/json'
import LocalDate from 'lib-common/local-date'
import type { UUID } from 'lib-common/types'

import { client } from '../api-client'

import type { IncomeStatementBody } from './types/body'

export async function getIncomeStatements(
  page: number,
  pageSize: number
): Promise<Result<Paged<IncomeStatement>>> {
  return client
    .get<JsonOf<Paged<IncomeStatement>>>('/citizen/income-statements', {
      params: { page, pageSize }
    })
    .then(({ data: { data, ...rest } }) => ({
      ...rest,
      data: data.map(deserializeIncomeStatement)
    }))
    .then((data) => Success.of(data))
    .catch((e) => Failure.fromError(e))
}

export async function getChildIncomeStatements(
  childId: string,
  page: number,
  pageSize: number
): Promise<Result<Paged<IncomeStatement>>> {
  return client
    .get<JsonOf<Paged<IncomeStatement>>>(
      `/citizen/income-statements/child/${childId}`,
      {
        params: { page, pageSize }
      }
    )
    .then(({ data: { data, ...rest } }) => ({
      ...rest,
      data: data.map(deserializeIncomeStatement)
    }))
    .then((data) => Success.of(data))
    .catch((e) => Failure.fromError(e))
}

export async function getChildIncomeStatement(
  childId: UUID,
  id: UUID
): Promise<Result<IncomeStatement>> {
  return client
    .get<JsonOf<IncomeStatement>>(
      `/citizen/income-statements/child/${childId}/${id}`
    )
    .then((res) => deserializeIncomeStatement(res.data))
    .then((data) => Success.of(data))
    .catch((e) => Failure.fromError(e))
}

export async function getIncomeStatement(
  id: UUID
): Promise<Result<IncomeStatement>> {
  return client
    .get<JsonOf<IncomeStatement>>(`/citizen/income-statements/${id}`)
    .then((res) => deserializeIncomeStatement(res.data))
    .then((data) => Success.of(data))
    .catch((e) => Failure.fromError(e))
}

export const getIncomeStatementStartDates = (): Promise<Result<LocalDate[]>> =>
  client
    .get<JsonOf<LocalDate[]>>(`/citizen/income-statements/start-dates/`)
    .then(({ data }) => data.map((d) => LocalDate.parseIso(d)))
    .then((data) => Success.of(data))
    .catch((e) => Failure.fromError(e))

export const getChildIncomeStatementStartDates = (
  childId: string
): Promise<Result<LocalDate[]>> =>
  client
    .get<JsonOf<LocalDate[]>>(
      `/citizen/income-statements/child/start-dates/${childId}`
    )
    .then(({ data }) => data.map((d) => LocalDate.parseIso(d)))
    .then((data) => Success.of(data))
    .catch((e) => Failure.fromError(e))

export async function createIncomeStatement(
  body: IncomeStatementBody
): Promise<Result<void>> {
  return client
    .post('/citizen/income-statements', body)
    .then(() => Success.of())
    .catch((e) => Failure.fromError(e))
}

export async function createChildIncomeStatement(
  childId: string,
  body: IncomeStatementBody
): Promise<Result<void>> {
  return client
    .post(`/citizen/income-statements/child/${childId}`, body)
    .then(() => Success.of())
    .catch((e) => Failure.fromError(e))
}

export async function updateIncomeStatement(
  id: UUID,
  body: IncomeStatementBody
): Promise<Result<void>> {
  return client
    .put(`/citizen/income-statements/${id}`, body)
    .then(() => Success.of())
    .catch((e) => Failure.fromError(e))
}

export async function updateChildIncomeStatement(
  childId: UUID,
  id: UUID,
  body: IncomeStatementBody
): Promise<Result<void>> {
  return client
    .put(`/citizen/income-statements/child/${childId}/${id}`, body)
    .then(() => Success.of())
    .catch((e) => Failure.fromError(e))
}

export async function deleteIncomeStatement(id: UUID): Promise<Result<void>> {
  return client
    .delete(`/citizen/income-statements/${id}`)
    .then(() => Success.of())
    .catch((err) => Failure.fromError(err))
}

export async function deleteChildIncomeStatement(
  childId: UUID,
  id: UUID
): Promise<Result<void>> {
  return client
    .delete(`/citizen/income-statements/child/${childId}/${id}`)
    .then(() => Success.of())
    .catch((err) => Failure.fromError(err))
}

export function getGuardianIncomeStatementChildren(): Promise<
  Result<ChildBasicInfo[]>
> {
  return client
    .get<JsonOf<ChildBasicInfo[]>>('/citizen/income-statements/children')
    .then((res) => Success.of(res.data))
    .catch((e) => Failure.fromError(e))
}
