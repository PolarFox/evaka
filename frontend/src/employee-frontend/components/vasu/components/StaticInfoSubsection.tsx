// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'

import type FiniteDateRange from 'lib-common/finite-date-range'
import type {
  CurriculumType,
  VasuBasics
} from 'lib-common/generated/api-types/vasu'
import { FixedSpaceColumn } from 'lib-components/layout/flex-helpers'
import { Label } from 'lib-components/typography'
import { Gap } from 'lib-components/white-space'
import type { VasuTranslations } from 'lib-customizations/employee'

type Props = {
  basics: VasuBasics
  translations: VasuTranslations
  type: CurriculumType
  templateRange: FiniteDateRange
}

export default React.memo(function StaticInfoSubsection({
  basics,
  translations,
  type,
  templateRange
}: Props) {
  const t = translations.staticSections.basics

  return (
    <FixedSpaceColumn spacing="xxs">
      <Label>{t.name}</Label>
      <div data-qa="vasu-basic-info-child-name">
        {basics.child.firstName} {basics.child.lastName}
      </div>

      <Gap size="s" />

      <Label>{t.dateOfBirth}</Label>
      <div data-qa="vasu-basic-info-child-dob">
        {basics.child.dateOfBirth.format()}
      </div>

      <Gap size="s" />

      <Label>{t.placements[type]}</Label>
      {basics.placements?.map((p) => (
        <div
          key={p.range.start.formatIso()}
          data-qa="vasu-basic-info-placement"
        >
          {p.unitName} ({p.groupName}) {p.range.start.format()} -{' '}
          {p.range.end.isAfter(templateRange.end) ? '' : p.range.end.format()}
        </div>
      ))}

      <Gap size="s" />

      <Label>{t.guardians}</Label>
      {basics.guardians.map((g) => (
        <div key={g.id} data-qa="vasu-basic-info-guardian">
          {g.firstName} {g.lastName}
        </div>
      ))}
    </FixedSpaceColumn>
  )
})
