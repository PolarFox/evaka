// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'

import { Label } from 'lib-components/typography'
import type { VasuTranslations } from 'lib-customizations/employee'

import { ValueOrNoRecord } from './ValueOrNoRecord'

interface Props {
  label: string
  value?: string
  translations: VasuTranslations
}

export function ReadOnlyValue({ label, value, translations }: Props) {
  return (
    <>
      <Label>{label}</Label>
      <ValueOrNoRecord text={value} translations={translations} />
    </>
  )
}
