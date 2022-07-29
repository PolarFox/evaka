// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useContext, useEffect, useState } from 'react'
import styled from 'styled-components'

import type { Result } from 'lib-common/api'
import { combine, Loading, Success } from 'lib-common/api'
import type { ApplicationDetails } from 'lib-common/api-types/application/ApplicationDetails'
import type FiniteDateRange from 'lib-common/finite-date-range'
import type { PublicUnit } from 'lib-common/generated/api-types/daycare'
import type { ServiceNeedOptionPublicInfo } from 'lib-common/generated/api-types/serviceneed'
import LocalDate from 'lib-common/local-date'
import type { UUID } from 'lib-common/types'
import useNonNullableParams from 'lib-common/useNonNullableParams'
import { scrollToPos } from 'lib-common/utils/scrolling'
import { useDebounce } from 'lib-common/utils/useDebounce'
import { useRestApi } from 'lib-common/utils/useRestApi'
import ReturnButton from 'lib-components/atoms/buttons/ReturnButton'
import { Container, ContentArea } from 'lib-components/layout/Container'
import { FixedSpaceRow } from 'lib-components/layout/flex-helpers'
import { featureFlags } from 'lib-customizations/employee'

import {
  getApplication,
  getClubTerms,
  getPreschoolTerms
} from '../api/applications'
import { getServiceNeedOptionPublicInfos } from '../api/child/service-needs'
import { getApplicationUnits } from '../api/daycare'
import ApplicationActionsBar from '../components/application-page/ApplicationActionsBar'
import ApplicationEditView from '../components/application-page/ApplicationEditView'
import ApplicationNotes from '../components/application-page/ApplicationNotes'
import ApplicationReadView from '../components/application-page/ApplicationReadView'
import type { Translations } from '../state/i18n'
import { useTranslation } from '../state/i18n'
import type { TitleState } from '../state/title'
import { TitleContext } from '../state/title'
import type { ApplicationResponse } from '../types/application'
import { isSsnValid, isTimeValid } from '../utils/validation/validations'

import { renderResult, UnwrapResult } from './async-rendering'

const ApplicationArea = styled(ContentArea)`
  width: 77%;
`

const NotesArea = styled(ContentArea)`
  width: 23%;
  padding: 0;
`

export default React.memo(function ApplicationPage() {
  const { id: applicationId } = useNonNullableParams<{ id: UUID }>()

  const { i18n } = useTranslation()
  const { setTitle, formatTitleName } = useContext<TitleState>(TitleContext)
  const [position, setPosition] = useState(0)
  const [application, setApplication] = useState<Result<ApplicationResponse>>(
    Loading.of()
  )
  const creatingNew = window.location.href.includes('create=true')
  const [editing, setEditing] = useState(creatingNew)
  const [editedApplication, setEditedApplication] =
    useState<ApplicationDetails>()
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({})
  const [units, setUnits] = useState<Result<PublicUnit[]>>(Loading.of())

  useEffect(() => {
    if (editing && editedApplication?.type) {
      const applicationType =
        editedApplication.type === 'PRESCHOOL' &&
        editedApplication.form.preferences.preparatory
          ? 'PREPARATORY'
          : editedApplication.type

      void getApplicationUnits(
        applicationType,
        editedApplication.form.preferences.preferredStartDate ??
          LocalDate.todayInSystemTz()
      ).then(setUnits)
    }
  }, [editing, editedApplication?.type, editedApplication?.form.preferences.preferredStartDate, editedApplication?.form.preferences.preparatory])

  const [terms, setTerms] = useState<FiniteDateRange[]>()
  useEffect(() => {
    switch (
      application.map(({ application: { type } }) => type).getOrElse(undefined)
    ) {
      case 'PRESCHOOL':
        void getPreschoolTerms().then((res) =>
          setTerms(
            res
              .map((terms) => terms.map((term) => term.extendedTerm))
              .getOrElse([])
          )
        )
        break
      case 'CLUB':
        void getClubTerms().then((res) =>
          setTerms(
            res.map((terms) => terms.map(({ term }) => term)).getOrElse([])
          )
        )
        break
    }
  }, [application, setTerms])

  // this is used because text inputs become too sluggish without it
  const debouncedEditedApplication = useDebounce(editedApplication, 50)

  const reloadApplication = () => {
    setPosition(window.scrollY)

    setApplication(Loading.of())
    void getApplication(applicationId).then((result) => {
      setApplication(result)
      if (result.isSuccess) {
        const { firstName, lastName } =
          result.value.application.form.child.person
        setTitle(
          `${i18n.application.tabTitle} - ${formatTitleName(
            firstName,
            lastName
          )}`
        )
        setEditedApplication(result.value.application)
      }
    })
  }

  useEffect(reloadApplication, [applicationId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (debouncedEditedApplication && units.isSuccess) {
      setValidationErrors(
        validateApplication(
          debouncedEditedApplication,
          units.value,
          terms,
          i18n
        )
      )
    }
  }, [debouncedEditedApplication]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollToPos({ left: 0, top: position })
  }, [application]) // eslint-disable-line react-hooks/exhaustive-deps

  const [serviceNeedOptions, setServiceNeedOptions] = useState<
    Result<ServiceNeedOptionPublicInfo[]>
  >(Loading.of())

  const loadServiceNeedOptions = useRestApi(
    getServiceNeedOptionPublicInfos,
    setServiceNeedOptions
  )

  const shouldLoadServiceNeedOptions =
    editedApplication !== undefined &&
    editedApplication.type === 'DAYCARE' &&
    editedApplication.form.preferences.serviceNeed !== null &&
    // If service need options are not enabled, backend sets to null
    editedApplication.form.preferences.serviceNeed.serviceNeedOption !== null

  useEffect(() => {
    if (shouldLoadServiceNeedOptions) {
      void loadServiceNeedOptions(['DAYCARE', 'DAYCARE_PART_TIME'])
    } else {
      setServiceNeedOptions((prev) => (prev.isLoading ? Success.of([]) : prev))
    }
  }, [setServiceNeedOptions, loadServiceNeedOptions, shouldLoadServiceNeedOptions])

  return (
    <>
      <Container>
        <ReturnButton label={i18n.common.goBack} data-qa="close-application" />
        {renderResult(
          combine(application, serviceNeedOptions),
          ([applicationData, serviceNeedOptions]) => (
            <FixedSpaceRow>
              <ApplicationArea opaque>
                {editing ? (
                  editedApplication ? (
                    <ApplicationEditView
                      application={editedApplication}
                      setApplication={setEditedApplication}
                      errors={validationErrors}
                      units={units}
                      guardians={applicationData.guardians}
                      serviceNeedOptions={serviceNeedOptions}
                    />
                  ) : null
                ) : (
                  <ApplicationReadView
                    application={applicationData}
                    reloadApplication={reloadApplication}
                  />
                )}
              </ApplicationArea>
              {(applicationData.permittedActions.has('READ_NOTES') ||
                applicationData.permittedActions.has(
                  'READ_SPECIAL_EDUCATION_TEACHER_NOTES'
                )) && (
                <NotesArea opaque={false}>
                  <ApplicationNotes
                    applicationId={applicationId}
                    allowCreate={applicationData.permittedActions.has(
                      'CREATE_NOTE'
                    )}
                  />
                </NotesArea>
              )}
            </FixedSpaceRow>
          )
        )}
      </Container>

      <UnwrapResult
        result={application}
        loading={() => null}
        failure={() => null}
      >
        {(application) =>
          application.permittedActions.has('UPDATE') && editedApplication ? (
            <ApplicationActionsBar
              applicationStatus={application.application.status}
              editing={editing}
              setEditing={setEditing}
              editedApplication={editedApplication}
              reloadApplication={reloadApplication}
              errors={Object.keys(validationErrors).length > 0}
            />
          ) : null
        }
      </UnwrapResult>
    </>
  )
})

function validateApplication(
  application: ApplicationDetails,
  units: PublicUnit[],
  terms: FiniteDateRange[] | undefined,
  i18n: Translations
): Record<string, string> {
  const errors: Record<string, string> = {}

  const {
    form: { child, preferences, otherPartner, otherChildren }
  } = application

  const preferredStartDate = preferences.preferredStartDate
  if (!preferredStartDate) {
    errors['form.preferences.preferredStartDate'] =
      i18n.validationError.mandatoryField
  }

  if (
    terms &&
    preferredStartDate &&
    !terms.some((term) => term.includes(preferredStartDate))
  ) {
    errors['form.preferences.preferredStartDate'] =
      i18n.validationError.startDateNotOnTerm
  }

  if (preferences.preferredUnits.length === 0) {
    errors['form.preferences.preferredUnits'] =
      i18n.application.preferences.missingPreferredUnits
  }

  if (
    preferences.preferredUnits.some(
      ({ id }) => units.find((unit) => unit.id === id) === undefined
    )
  ) {
    errors['form.preferences.preferredUnits'] =
      i18n.application.preferences.unitMismatch
  }

  if (
    preferences.serviceNeed !== null &&
    ((application.type === 'DAYCARE' &&
      featureFlags.daycareApplication.dailyTimesEnabled) ||
      application.type === 'PRESCHOOL')
  ) {
    if (!preferences.serviceNeed.startTime) {
      errors['form.preferences.serviceNeed.startTime'] =
        i18n.validationError.mandatoryField
    } else if (!isTimeValid(preferences.serviceNeed.startTime)) {
      errors['form.preferences.serviceNeed.startTime'] =
        i18n.validationError.time
    }

    if (!preferences.serviceNeed.endTime) {
      errors['form.preferences.serviceNeed.endTime'] =
        i18n.validationError.mandatoryField
    } else if (!isTimeValid(preferences.serviceNeed.endTime)) {
      errors['form.preferences.serviceNeed.endTime'] = i18n.validationError.time
    }
  }

  if (
    otherPartner &&
    otherPartner.socialSecurityNumber &&
    !isSsnValid(otherPartner.socialSecurityNumber)
  ) {
    errors['form.otherPartner.socialSecurityNumber'] = i18n.validationError.ssn
  }

  otherChildren.forEach(({ socialSecurityNumber }, index) => {
    if (socialSecurityNumber && !isSsnValid(socialSecurityNumber)) {
      errors[`form.otherChildren.${index}.socialSecurityNumber`] =
        i18n.validationError.ssn
    }
  })

  if (
    child.assistanceNeeded &&
    child.assistanceDescription.trim().length === 0
  ) {
    errors['form.child.assistanceDescription'] =
      i18n.validationError.mandatoryField
  }

  return errors
}
