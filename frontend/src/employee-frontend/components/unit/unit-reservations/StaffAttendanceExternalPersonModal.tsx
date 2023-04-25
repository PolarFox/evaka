// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import classNames from 'classnames'
import React, { useCallback } from 'react'
import styled from 'styled-components'

import DateRange from 'lib-common/date-range'
import { localDate, localTime, string } from 'lib-common/form/fields'
import { object, oneOf, required, validated } from 'lib-common/form/form'
import { useForm, useFormField } from 'lib-common/form/hooks'
import type { StateOf } from 'lib-common/form/types'
import type { UpsertStaffAndExternalAttendanceRequest } from 'lib-common/generated/api-types/attendance'
import type { DaycareGroup } from 'lib-common/generated/api-types/daycare'
import HelsinkiDateTime from 'lib-common/helsinki-date-time'
import LocalDate from 'lib-common/local-date'
import LocalTime from 'lib-common/local-time'
import type { UUID } from 'lib-common/types'
import StatusIcon from 'lib-components/atoms/StatusIcon'
import InlineButton from 'lib-components/atoms/buttons/InlineButton'
import { SelectF } from 'lib-components/atoms/dropdowns/Select'
import {
  InputFieldF,
  InputFieldUnderRow
} from 'lib-components/atoms/form/InputField'
import { TimeInputF } from 'lib-components/atoms/form/TimeInput'
import { InlineAsyncButton } from 'lib-components/employee/notes/InlineAsyncButton'
import {
  FixedSpaceColumn,
  FixedSpaceRow
} from 'lib-components/layout/flex-helpers'
import { DatePickerF } from 'lib-components/molecules/date-picker/DatePicker'
import { PlainModal } from 'lib-components/molecules/modals/BaseModal'
import { fontWeights, H1, Label } from 'lib-components/typography'
import { defaultMargins, Gap } from 'lib-components/white-space'
import { faPlus } from 'lib-icons'

import { postStaffAndExternalAttendances } from '../../../api/staff-attendance'
import { useTranslation } from '../../../state/i18n'

type ExternalPersonModalProps = {
  onClose: () => void
  onSave: () => void
  unitId: UUID
  groups: DaycareGroup[]
  defaultGroupId: UUID
}

const externalPersonForm = object({
  date: validated(required(localDate), (value) =>
    value.isAfter(LocalDate.todayInHelsinkiTz()) ? 'dateTooLate' : undefined
  ),
  arrivalTime: required(localTime),
  departureTime: localTime,
  name: validated(string(), (value) =>
    value.length < 3 ? 'required' : undefined
  ),
  group: required(oneOf<UUID>())
})

function initialFormState(
  groups: DaycareGroup[],
  defaultGroupId: UUID
): StateOf<typeof externalPersonForm> {
  const groupOptions = groups.filter(isGroupOpen).map((group) => ({
    value: group.id,
    label: group.name,
    domValue: group.id
  }))

  return {
    date: LocalDate.todayInHelsinkiTz(),
    arrivalTime: LocalTime.nowInHelsinkiTz().format(),
    departureTime: '',
    name: '',
    group: {
      options: groupOptions,
      domValue: defaultGroupId
    }
  }
}

export default React.memo(function StaffAttendanceExternalPersonModal({
  onClose,
  onSave,
  unitId,
  groups,
  defaultGroupId
}: ExternalPersonModalProps) {
  const { i18n, lang } = useTranslation()

  const form = useForm(
    externalPersonForm,
    () => initialFormState(groups, defaultGroupId),
    i18n.validationErrors
  )

  const submit = useCallback(() => {
    const formValue = form.value()
    const requestBody: UpsertStaffAndExternalAttendanceRequest = {
      externalAttendances: [
        {
          attendanceId: null,
          arrived: HelsinkiDateTime.fromLocal(
            formValue.date,
            formValue.arrivalTime
          ),
          departed: formValue.departureTime
            ? HelsinkiDateTime.fromLocal(
                formValue.date,
                formValue.departureTime
              )
            : null,
          name: formValue.name,
          groupId: formValue.group
        }
      ],
      staffAttendances: []
    }
    return postStaffAndExternalAttendances(unitId, requestBody)
  }, [form, unitId])

  const date = useFormField(form, 'date')
  const arrivalTime = useFormField(form, 'arrivalTime')
  const departureTime = useFormField(form, 'departureTime')
  const name = useFormField(form, 'name')
  const group = useFormField(form, 'group')
  const groupError = group.validationError()

  return (
    <PlainModal margin="auto" data-qa="staff-attendance-add-person-modal">
      <Content>
        <Centered>
          <IconWrapper>
            <FontAwesomeIcon icon={faPlus} />
          </IconWrapper>
          <H1 noMargin>{i18n.unit.staffAttendance.addPerson}</H1>
          {i18n.unit.staffAttendance.addPersonModal.description}
        </Centered>

        <div>
          <FieldLabel>
            {i18n.unit.staffAttendance.addPersonModal.arrival}
          </FieldLabel>
          <FixedSpaceRow>
            <DatePickerF
              bind={date}
              locale={lang}
              data-qa="add-person-arrival-date-picker"
            />
            <TimeInputF
              bind={arrivalTime}
              data-qa="add-person-arrival-time-input"
            />
            {' – '}
            <TimeInputF
              bind={departureTime}
              data-qa="add-person-departure-time-input"
            />
          </FixedSpaceRow>
        </div>
        <div>
          <FieldLabel>
            {i18n.unit.staffAttendance.addPersonModal.name}
          </FieldLabel>
          <InputFieldF
            bind={name}
            placeholder={
              i18n.unit.staffAttendance.addPersonModal.namePlaceholder
            }
            data-qa="add-person-name-input"
          />
        </div>

        <div>
          <FieldLabel>
            {i18n.unit.staffAttendance.addPersonModal.group}
          </FieldLabel>
          <SelectF
            bind={group}
            placeholder={i18n.common.select}
            data-qa="add-person-group-select"
          />
          {groupError && (
            <InputFieldUnderRow className={classNames('warning')}>
              <span>{group.translateError(groupError)}</span>
              <StatusIcon status="warning" />
            </InputFieldUnderRow>
          )}
        </div>

        <Gap size="xs" />
        <FixedSpaceRow justifyContent="space-between">
          <InlineButton
            text={i18n.common.cancel}
            data-qa="add-person-cancel-btn"
            onClick={onClose}
          />
          <InlineAsyncButton
            text={i18n.unit.staffAttendance.addPerson}
            data-qa="add-person-save-btn"
            disabled={!form.isValid()}
            onClick={submit}
            onSuccess={onSave}
          />
        </FixedSpaceRow>
      </Content>
    </PlainModal>
  )
})

function isGroupOpen(group: DaycareGroup) {
  return new DateRange(group.startDate, group.endDate).includes(
    LocalDate.todayInHelsinkiTz()
  )
}

const Content = styled.div`
  padding: ${defaultMargins.XL};
  display: flex;
  flex-direction: column;
  gap: ${defaultMargins.s};
`
const Centered = styled(FixedSpaceColumn)`
  align-self: center;
  text-align: center;
  gap: ${defaultMargins.L};
`
const IconWrapper = styled.div`
  align-self: center;
  height: 64px !important;
  width: 64px !important;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 0;

  font-size: 40px;
  color: ${(p) => p.theme.colors.grayscale.g0};
  font-weight: ${fontWeights.normal};
  background: ${(p) => p.theme.colors.main.m2};
  border-radius: 100%;
`
const FieldLabel = styled(Label)`
  margin-bottom: 8px;
`
