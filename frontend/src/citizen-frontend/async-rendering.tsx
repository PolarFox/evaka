// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { makeHelpers } from 'lib-components/async-rendering'

import { useTranslation } from './localization'

function useFailureMessage() {
  return useTranslation().common.errors.genericGetError
}

const { UnwrapResult, renderResult } = makeHelpers(useFailureMessage)
export type {
  UnwrapResultProps,
  RenderResultFn
} from 'lib-components/async-rendering'
export { UnwrapResult, renderResult }
