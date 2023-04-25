// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React from 'react'

import type { Result } from 'lib-common/api'
import HelsinkiDateTime from 'lib-common/helsinki-date-time'
import LocalDate from 'lib-common/local-date'
import type { UUID } from 'lib-common/types'
import useNonNullableParams from 'lib-common/useNonNullableParams'
import { useUniqueId } from 'lib-common/utils/useUniqueId'
import Checkbox from 'lib-components/atoms/form/Checkbox'
import ExpandingInfo from 'lib-components/molecules/ExpandingInfo'
import FileUpload from 'lib-components/molecules/FileUpload'
import { AlertBox } from 'lib-components/molecules/MessageBoxes'
import DatePicker from 'lib-components/molecules/date-picker/DatePicker'
import { H3, Label, P } from 'lib-components/typography'
import { Gap } from 'lib-components/white-space'
import { featureFlags } from 'lib-customizations/citizen'

import {
  deleteAttachment,
  getAttachmentUrl,
  saveApplicationAttachment
} from '../../../attachments'
import { errorToInputInfo } from '../../../input-info-helper'
import { useLang, useTranslation } from '../../../localization'
import { isValidPreferredStartDate } from '../validations'

import { ClubTermsInfo } from './ClubTermsInfo'
import type { ServiceNeedSectionProps } from './ServiceNeedSection'

export default React.memo(function PreferredStartSubSection({
  originalPreferredStartDate,
  minDate,
  maxDate,
  type,
  formData,
  updateFormData,
  errors,
  verificationRequested,
  terms
}: ServiceNeedSectionProps) {
  const { applicationId } = useNonNullableParams<{ applicationId: string }>()
  const t = useTranslation()
  const [lang] = useLang()
  const labelId = useUniqueId()

  const uploadUrgencyAttachment = (
    file: File,
    onUploadProgress: (progressEvent: ProgressEvent) => void
  ): Promise<Result<UUID>> =>
    saveApplicationAttachment(
      applicationId,
      file,
      'URGENCY',
      onUploadProgress
    ).then((result) => {
      result.isSuccess &&
        updateFormData({
          urgencyAttachments: [
            ...formData.urgencyAttachments,
            {
              id: result.value,
              name: file.name,
              contentType: file.type,
              updated: HelsinkiDateTime.now(),
              receivedAt: HelsinkiDateTime.now(),
              type: 'URGENCY'
            }
          ]
        })
      return result
    })

  const deleteUrgencyAttachment = (id: UUID) =>
    deleteAttachment(id).then((result) => {
      result.isSuccess &&
        updateFormData({
          urgencyAttachments: formData.urgencyAttachments.filter(
            (file) => file.id !== id
          )
        })
      return result
    })

  const showDaycare4MonthWarning = (): boolean => {
    return (
      type === 'DAYCARE' &&
      formData.preferredStartDate !== null &&
      formData.preferredStartDate.isBefore(
        LocalDate.todayInSystemTz().addMonths(4)
      )
    )
  }

  return (
    <>
      <div>
        <H3>{t.applications.editor.serviceNeed.startDate.header[type]}</H3>

        {Object.values(
          t.applications.editor.serviceNeed.startDate.info[type]
        ).map((info, index) => (
          <P key={index}>{info}</P>
        ))}

        {type === 'CLUB' && <ClubTermsInfo clubTerms={terms ?? []} />}

        <ExpandingInfo
          data-qa="startdate-instructions"
          info={t.applications.editor.serviceNeed.startDate.instructions[type]}
          ariaLabel={t.common.openExpandingInfo}
          closeLabel={t.common.close}
          inlineChildren
        >
          <Label htmlFor={labelId}>
            {t.applications.editor.serviceNeed.startDate.label[type]} *
          </Label>
        </ExpandingInfo>

        <Gap size="s" />

        <DatePicker
          date={formData.preferredStartDate}
          onChange={(date) =>
            updateFormData({
              preferredStartDate: date
            })
          }
          locale={lang}
          info={errorToInputInfo(errors.preferredStartDate, t.validationErrors)}
          hideErrorsBeforeTouched={!verificationRequested}
          isInvalidDate={(date: LocalDate) =>
            isValidPreferredStartDate(
              date,
              originalPreferredStartDate,
              type,
              terms
            )
              ? null
              : t.validationErrors.unselectableDate
          }
          minDate={minDate}
          maxDate={maxDate}
          data-qa="preferredStartDate-input"
          id={labelId}
          required={true}
        />

        {showDaycare4MonthWarning() ? (
          <>
            <Gap size="xs" />
            <AlertBox
              message={t.applications.creation.daycare4monthWarning}
              data-qa="daycare-processing-time-warning"
            />
          </>
        ) : null}

        {type === 'DAYCARE' && (
          <>
            <Gap size="L" />

            <Checkbox
              checked={formData.urgent}
              data-qa="urgent-input"
              label={t.applications.editor.serviceNeed.urgent.label}
              onChange={(checked) =>
                updateFormData({
                  urgent: checked
                })
              }
            />
            <Gap size="s" />
            {t.applications.editor.serviceNeed.urgent.attachmentsMessage.text}

            {formData.urgent && featureFlags.urgencyAttachments && (
              <>
                <Gap size="s" />

                <strong>
                  {
                    t.applications.editor.serviceNeed.urgent.attachmentsMessage
                      .subtitle
                  }
                </strong>

                <Gap size="s" />

                <FileUpload
                  files={formData.urgencyAttachments}
                  onUpload={uploadUrgencyAttachment}
                  onDelete={deleteUrgencyAttachment}
                  getDownloadUrl={getAttachmentUrl}
                  i18n={{ upload: t.fileUpload }}
                  data-qa="urgent-file-upload"
                />
              </>
            )}
          </>
        )}

        {type === 'CLUB' && (
          <>
            <Gap size="L" />

            <ExpandingInfo
              info={
                t.applications.editor.serviceNeed.clubDetails.wasOnDaycareInfo
              }
              ariaLabel={t.common.openExpandingInfo}
              closeLabel={t.common.close}
              margin="xs"
              data-qa="wasOnDaycare-info"
            >
              <Checkbox
                checked={formData.wasOnDaycare}
                data-qa="wasOnDaycare-input"
                label={
                  t.applications.editor.serviceNeed.clubDetails.wasOnDaycare
                }
                onChange={(checked) =>
                  updateFormData({
                    wasOnDaycare: checked
                  })
                }
              />
            </ExpandingInfo>
            <Gap size="m" />
            <ExpandingInfo
              data-qa="wasOnClubCare-info"
              info={
                t.applications.editor.serviceNeed.clubDetails.wasOnClubCareInfo
              }
              ariaLabel={t.common.openExpandingInfo}
              closeLabel={t.common.close}
              margin="xs"
            >
              <Checkbox
                checked={formData.wasOnClubCare}
                data-qa="wasOnClubCare-input"
                label={
                  t.applications.editor.serviceNeed.clubDetails.wasOnClubCare
                }
                onChange={(checked) =>
                  updateFormData({
                    wasOnClubCare: checked
                  })
                }
              />
            </ExpandingInfo>
          </>
        )}
      </div>
    </>
  )
})
