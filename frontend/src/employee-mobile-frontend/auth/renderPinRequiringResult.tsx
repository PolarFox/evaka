// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'

import type { Result } from 'lib-common/api'

import type { RenderResultFn } from '../async-rendering'
import { renderResult } from '../async-rendering'

import { PinLogin } from './PinLogin'
import { PinLoginRequired } from './api'

function isResultT<T>(res: Result<T | PinLoginRequired>): res is Result<T> {
  return !(res.isSuccess && res.value === PinLoginRequired)
}

export function renderPinRequiringResult<T>(
  result: Result<T | PinLoginRequired>,
  renderer: RenderResultFn<T>
) {
  return isResultT(result) ? renderResult(result, renderer) : <PinLogin />
}
