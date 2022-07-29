// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { Response, Result } from 'lib-common/api'
import { Failure, Success } from 'lib-common/api'
import type { JsonOf } from 'lib-common/json'
import LocalDate from 'lib-common/local-date'
import type { UUID } from 'lib-common/types'

import type {
  FeeAlteration,
  PartialFeeAlteration
} from '../../types/fee-alteration'
import { client } from '../client'

export async function getFeeAlterations(
  personId: UUID
): Promise<Result<FeeAlteration[]>> {
  return client
    .get<JsonOf<Response<FeeAlteration[]>>>(
      `/fee-alterations?personId=${personId}`
    )
    .then((res) => res.data.data)
    .then((data) =>
      data.map((feeAlteration) => ({
        ...feeAlteration,
        validFrom: LocalDate.parseIso(feeAlteration.validFrom),
        validTo: LocalDate.parseNullableIso(feeAlteration.validTo),
        updatedAt: new Date(feeAlteration.updatedAt)
      }))
    )
    .then((v) => Success.of(v))
    .catch((e) => Failure.fromError(e))
}

export async function createFeeAlteration(
  feeAlteration: PartialFeeAlteration
): Promise<Result<void>> {
  return client
    .post<void>('/fee-alterations', feeAlteration)
    .then((res) => Success.of(res.data))
    .catch((e) => Failure.fromError(e))
}

export async function updateFeeAlteration(
  feeAlteration: FeeAlteration
): Promise<Result<void>> {
  return client
    .put<void>(`/fee-alterations/${feeAlteration.id}`, feeAlteration)
    .then((res) => Success.of(res.data))
    .catch((e) => Failure.fromError(e))
}

export async function deleteFeeAlteration(id: UUID): Promise<Result<void>> {
  return client
    .delete<void>(`/fee-alterations/${id}`)
    .then((res) => Success.of(res.data))
    .catch((e) => Failure.fromError(e))
}
