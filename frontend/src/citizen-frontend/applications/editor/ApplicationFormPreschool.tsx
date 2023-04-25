// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'

import { useTranslation } from 'citizen-frontend/localization'
import { useQueryResult } from 'lib-common/query'
import Loader from 'lib-components/atoms/Loader'
import ErrorSegment from 'lib-components/atoms/state/ErrorSegment'
import { FixedSpaceColumn } from 'lib-components/layout/flex-helpers'
import { featureFlags } from 'lib-customizations/citizen'

import AdditionalDetailsSection from '../../applications/editor/AdditionalDetailsSection'
import Heading from '../../applications/editor/Heading'
import ContactInfoSection from '../../applications/editor/contact-info/ContactInfoSection'
import ServiceNeedSection from '../../applications/editor/service-need/ServiceNeedSection'
import UnitPreferenceSection from '../../applications/editor/unit-preference/UnitPreferenceSection'
import { serviceNeedOptionPublicInfosQuery } from '../queries'

import type { ApplicationFormProps } from './ApplicationEditor'

export default React.memo(function ApplicationFormPreschool({
  application,
  formData,
  setFormData,
  errors,
  verificationRequested,
  originalPreferredStartDate,
  minDate,
  maxDate,
  terms
}: ApplicationFormProps) {
  const applicationType = 'PRESCHOOL'
  const t = useTranslation()

  const serviceNeedOptions = useQueryResult(
    serviceNeedOptionPublicInfosQuery(['PRESCHOOL_DAYCARE', 'PRESCHOOL_CLUB']),
    {
      enabled: featureFlags.preschoolApplication.serviceNeedOption,
      initialData: []
    }
  )

  if (serviceNeedOptions.isLoading) {
    return <Loader />
  }
  if (serviceNeedOptions.isFailure) {
    return <ErrorSegment title={t.common.errors.genericGetError} />
  }

  return (
    <FixedSpaceColumn spacing="s">
      <Heading
        type={applicationType}
        transferApplication={application.transferApplication}
        firstName={application.form.child.person.firstName}
        lastName={application.form.child.person.lastName}
        errors={verificationRequested ? errors : undefined}
      />

      <ServiceNeedSection
        status={application.status}
        originalPreferredStartDate={originalPreferredStartDate}
        minDate={minDate}
        maxDate={maxDate}
        type={applicationType}
        formData={formData.serviceNeed}
        updateFormData={(data) =>
          setFormData((old) =>
            old
              ? {
                  ...old,
                  serviceNeed: {
                    ...old?.serviceNeed,
                    ...data
                  }
                }
              : old
          )
        }
        errors={errors.serviceNeed}
        verificationRequested={verificationRequested}
        terms={terms}
        serviceNeedOptions={serviceNeedOptions.value}
      />

      <UnitPreferenceSection
        formData={formData.unitPreference}
        updateFormData={(data) =>
          setFormData((old) =>
            old
              ? {
                  ...old,
                  unitPreference: {
                    ...old?.unitPreference,
                    ...data
                  }
                }
              : old
          )
        }
        applicationType={applicationType}
        preparatory={formData.serviceNeed.preparatory}
        preferredStartDate={formData.serviceNeed.preferredStartDate}
        errors={errors.unitPreference}
        verificationRequested={verificationRequested}
        shiftCare={formData.serviceNeed.shiftCare}
      />

      <ContactInfoSection
        type={applicationType}
        formData={formData.contactInfo}
        updateFormData={(data) =>
          setFormData((old) =>
            old
              ? {
                  ...old,
                  contactInfo: {
                    ...old?.contactInfo,
                    ...data
                  }
                }
              : old
          )
        }
        errors={errors.contactInfo}
        verificationRequested={verificationRequested}
        fullFamily={formData.serviceNeed.connectedDaycare}
        otherGuardianStatus={
          application.otherGuardianId
            ? application.otherGuardianLivesInSameAddress
              ? 'SAME_ADDRESS'
              : 'DIFFERENT_ADDRESS'
            : 'NO'
        }
      />

      <AdditionalDetailsSection
        formData={formData.additionalDetails}
        updateFormData={(data) =>
          setFormData((old) =>
            old
              ? {
                  ...old,
                  additionalDetails: {
                    ...old?.additionalDetails,
                    ...data
                  }
                }
              : old
          )
        }
        errors={errors.additionalDetails}
        verificationRequested={verificationRequested}
        applicationType={applicationType}
      />
    </FixedSpaceColumn>
  )
})
