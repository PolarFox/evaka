// SPDX-FileCopyrightText: 2017-2021 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'
import Container, {
  ContentArea
} from '@evaka/lib-components/src/layout/Container'
import { ApplicationFormData } from '~applications/editor/ApplicationFormData'
import { H1, P } from '~../../lib-components/src/typography'
import { useTranslation } from '~localization'
import BasicsSection from '~applications/editor/verification/BasicsSection'
import { Gap } from '@evaka/lib-components/src/white-space'
import HorizontalLine from '@evaka/lib-components/src/atoms/HorizontalLine'
import UnitPreferenceSection from '~applications/editor/verification/UnitPreferenceSection'
import { ApplicationDetails } from '@evaka/lib-common/src/api-types/application/ApplicationDetails'

type DaycareApplicationVerificationViewProps = {
  application: ApplicationDetails
  formData: ApplicationFormData
}

const applicationType = 'DAYCARE'

export default React.memo(function DaycareApplicationVerificationView({
  application,
  formData
}: DaycareApplicationVerificationViewProps) {
  const t = useTranslation()
  return (
    <Container>
      <ContentArea opaque>
        <H1>{t.applications.editor.verification.title[applicationType]}</H1>
        <P
          dangerouslySetInnerHTML={{
            __html: t.applications.editor.verification.notYetSent
          }}
        />
      </ContentArea>

      <Gap size="m" />

      <ContentArea opaque>
        <BasicsSection application={application} formData={formData} />
        <HorizontalLine />
        <UnitPreferenceSection formData={formData.unitPreference} />
      </ContentArea>
    </Container>
  )
})
