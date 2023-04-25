// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { Result } from 'lib-common/api'
import { Failure, Success } from 'lib-common/api'
import DateRange from 'lib-common/date-range'
import type { FeeThresholds } from 'lib-common/generated/api-types/invoicing'
import type { JsonOf } from 'lib-common/json'

import type { FeeThresholdsWithId } from '../types/finance-basics'

import { client } from './client'

export async function getFeeThresholds(): Promise<
  Result<FeeThresholdsWithId[]>
> {
  return client
    .get<JsonOf<FeeThresholdsWithId[]>>('/finance-basics/fee-thresholds')
    .then((res) =>
      Success.of(
        res.data.map((json) => ({
          ...json,
          thresholds: {
            ...json.thresholds,
            validDuring: DateRange.parseJson(json.thresholds.validDuring)
          }
        }))
      )
    )
    .catch((e) => Failure.fromError(e))
}

export type FeeThresholdsSaveError = 'date-overlap'

export async function createFeeThresholds(
  thresholds: FeeThresholds
): Promise<Result<void>> {
  return client
    .post('/finance-basics/fee-thresholds', thresholds)
    .then((res) => Success.of(res.data))
    .catch((e) => Failure.fromError(e))
}

export async function updateFeeThresholds(
  id: string,
  thresholds: FeeThresholds
): Promise<Result<void>> {
  return client
    .put(`/finance-basics/fee-thresholds/${id}`, thresholds)
    .then((res) => Success.of(res.data))
    .catch((e) => Failure.fromError(e))
}
