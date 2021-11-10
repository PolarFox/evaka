// SPDX-FileCopyrightText: 2017-2021 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import customizations from '@evaka/customizations/employee'
import type { EmployeeCustomizations } from './types'
import { fi } from './espoo/employee/assets/i18n/fi'
import { sv } from './espoo/employee/assets/i18n/sv'
import { mergeWith } from 'lodash'
import { ApplicationType } from 'lib-common/generated/enums'
import { translationsMergeCustomizer } from './common'
import { fi as vasuFI } from './espoo/employee/assets/i18n/vasu/fi'
import { sv as vasuSV } from './espoo/employee/assets/i18n/vasu/sv'

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const {
  appConfig,
  cityLogo,
  featureFlags,
  assistanceMeasures,
  placementTypes,
  placementPlanRejectReasons,
  unitProviderTypes
}: EmployeeCustomizations = customizations
export {
  appConfig,
  cityLogo,
  featureFlags,
  assistanceMeasures,
  placementTypes,
  placementPlanRejectReasons,
  unitProviderTypes
}

export type Lang = 'fi' | 'sv'

export type Translations = typeof fi

export const translations: { [K in Lang]: Translations } = {
  fi: mergeWith(
    fi,
    (customizations as EmployeeCustomizations).translations.fi,
    translationsMergeCustomizer
  ),
  sv: mergeWith(
    sv,
    (customizations as EmployeeCustomizations).translations.fi,
    translationsMergeCustomizer
  )
}

export type VasuTranslations = typeof vasuFI

export const vasuTranslations: { [K in Lang]: VasuTranslations } = {
  fi: mergeWith(
    vasuFI,
    (customizations as EmployeeCustomizations).vasuTranslations.fi,
    translationsMergeCustomizer
  ),
  sv: mergeWith(
    vasuSV,
    (customizations as EmployeeCustomizations).vasuTranslations.sv,
    translationsMergeCustomizer
  )
}

export const applicationTypes: ApplicationType[] = (
  ['DAYCARE', 'PRESCHOOL', 'CLUB'] as const
).filter((type) => featureFlags.preschoolEnabled || type !== 'PRESCHOOL')
