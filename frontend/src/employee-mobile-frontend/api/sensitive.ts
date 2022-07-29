// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { Result } from 'lib-common/api'
import { Success } from 'lib-common/api'
import type { ChildSensitiveInformation } from 'lib-common/generated/api-types/sensitive'
import type { JsonOf } from 'lib-common/json'
import LocalDate from 'lib-common/local-date'
import type { UUID } from 'lib-common/types'

import type { PinLoginRequired } from './auth-pin-login'
import { mapPinLoginRequiredError } from './auth-pin-login'
import { client } from './client'

export const getChildSensitiveInformation = (
  childId: UUID
): Promise<Result<ChildSensitiveInformation | PinLoginRequired>> =>
  client
    .get<JsonOf<ChildSensitiveInformation>>(
      `/children/${childId}/sensitive-info`
    )
    .then(({ data: { dateOfBirth, ...rest } }) => ({
      ...rest,
      dateOfBirth: LocalDate.parseIso(dateOfBirth)
    }))
    .then((v) => Success.of(v))
    .catch(mapPinLoginRequiredError)
