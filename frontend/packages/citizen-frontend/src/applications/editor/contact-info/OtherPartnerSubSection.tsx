// SPDX-FileCopyrightText: 2017-2020 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'
import { useTranslation } from '../../../localization'
import {
  FixedSpaceColumn,
  FixedSpaceRow
} from '@evaka/lib-components/src/layout/flex-helpers'
import Checkbox from '@evaka/lib-components/src/atoms/form/Checkbox'
import { H3, Label } from '@evaka/lib-components/src/typography'
import InputField from '@evaka/lib-components/src/atoms/form/InputField'
import { Gap } from '@evaka/lib-components/src/white-space'
import { errorToInputInfo } from '../../../form-validation'
import AdaptiveFlex from '@evaka/lib-components/src/layout/AdaptiveFlex'
import { ContactInfoSectionProps } from '../../../applications/editor/contact-info/ContactInfoSection'

export default React.memo(function OtherPartnerSubSection({
  formData,
  updateFormData,
  errors,
  verificationRequested
}: ContactInfoSectionProps) {
  const t = useTranslation()

  return (
    <>
      <H3>{t.applications.editor.contactInfo.otherPartnerTitle}</H3>
      <Gap size={'s'} />
      <Checkbox
        label={t.applications.editor.contactInfo.otherPartnerCheckboxLabel}
        checked={formData.otherPartnerExists}
        dataQa={'otherPartnerExists-input'}
        onChange={(checked) => {
          updateFormData({
            otherPartnerExists: checked
          })
        }}
      />
      {formData.otherPartnerExists && (
        <>
          <Gap size={'m'} />
          <FixedSpaceRow spacing={'XL'}>
            <AdaptiveFlex breakpoint="1060px">
              <FixedSpaceColumn spacing={'xs'}>
                <Label htmlFor={'other-partner-first-name'}>
                  {t.applications.editor.contactInfo.personFirstName + ' *'}
                </Label>
                <InputField
                  id={'other-partner-first-name'}
                  value={formData.otherPartnerFirstName}
                  dataQa={'otherPartnerFirstName-input'}
                  onChange={(value) =>
                    updateFormData({
                      otherPartnerFirstName: value
                    })
                  }
                  info={errorToInputInfo(
                    errors.otherPartnerFirstName,
                    t.validationErrors
                  )}
                  hideErrorsBeforeTouched={!verificationRequested}
                  placeholder={
                    t.applications.editor.contactInfo.firstNamePlaceholder
                  }
                  width={'L'}
                />
              </FixedSpaceColumn>
              <FixedSpaceColumn spacing={'xs'}>
                <Label htmlFor={'other-partner-last-name'}>
                  {t.applications.editor.contactInfo.personLastName + ' *'}
                </Label>
                <InputField
                  id={'other-partner-last-name'}
                  value={formData.otherPartnerLastName}
                  dataQa={'otherPartnerLastName-input'}
                  onChange={(value) =>
                    updateFormData({
                      otherPartnerLastName: value
                    })
                  }
                  info={errorToInputInfo(
                    errors.otherPartnerLastName,
                    t.validationErrors
                  )}
                  hideErrorsBeforeTouched={!verificationRequested}
                  placeholder={
                    t.applications.editor.contactInfo.lastNamePlaceholder
                  }
                  width={'m'}
                />
              </FixedSpaceColumn>
              <FixedSpaceColumn spacing={'xs'}>
                <Label htmlFor={'other-partner-ssn'}>
                  {t.applications.editor.contactInfo.personSSN + ' *'}
                </Label>
                <InputField
                  id={'other-partner-ssn'}
                  value={formData.otherPartnerSSN}
                  dataQa={'otherPartnerSSN-input'}
                  onChange={(value) =>
                    updateFormData({
                      otherPartnerSSN: value.toUpperCase()
                    })
                  }
                  info={errorToInputInfo(
                    errors.otherPartnerSSN,
                    t.validationErrors
                  )}
                  hideErrorsBeforeTouched={
                    !verificationRequested &&
                    formData.otherPartnerSSN.length < 11
                  }
                  placeholder={t.applications.editor.contactInfo.ssnPlaceholder}
                  width="m"
                />
              </FixedSpaceColumn>
            </AdaptiveFlex>
          </FixedSpaceRow>
        </>
      )}
    </>
  )
})
