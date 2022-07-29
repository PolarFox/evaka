// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'

import { apiDataToFormData } from 'lib-common/api-types/application/ApplicationFormData'
import type { UUID } from 'lib-common/types'
import useNonNullableParams from 'lib-common/useNonNullableParams'
import { useApiState } from 'lib-common/utils/useRestApi'
import Container from 'lib-components/layout/Container'

import Footer from '../../Footer'
import ApplicationReadViewContents from '../../applications/read-view/ApplicationReadViewContents'
import { renderResult } from '../../async-rendering'
import { useUser } from '../../auth/state'
import { useTranslation } from '../../localization'
import useTitle from '../../useTitle'
import { getApplication } from '../api'

export default React.memo(function ApplicationReadView() {
  const { applicationId } = useNonNullableParams<{ applicationId: UUID }>()
  const t = useTranslation()
  const user = useUser()
  const [apiData] = useApiState(
    () => getApplication(applicationId),
    [applicationId]
  )

  useTitle(
    t,
    apiData
      .map(({ type }) => t.applications.editor.heading.title[type])
      .getOrElse('')
  )

  return (
    <>
      <Container>
        {renderResult(apiData, (value) => (
          <ApplicationReadViewContents
            application={value}
            formData={apiDataToFormData(value, user)}
          />
        ))}
      </Container>
      <Footer />
    </>
  )
})
