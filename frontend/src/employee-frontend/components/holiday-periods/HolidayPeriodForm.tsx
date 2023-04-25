// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useCallback } from 'react'

import { boolean, localDate, localDateRange } from 'lib-common/form/fields'
import { object, required, validated } from 'lib-common/form/form'
import { useForm, useFormField, useFormFields } from 'lib-common/form/hooks'
import type { StateOf } from 'lib-common/form/types'
import type { HolidayPeriod } from 'lib-common/generated/api-types/holidayperiod'
import LocalDate from 'lib-common/local-date'
import { useMutationResult } from 'lib-common/query'
import { mockToday } from 'lib-common/utils/helpers'
import AsyncButton from 'lib-components/atoms/buttons/AsyncButton'
import Button from 'lib-components/atoms/buttons/Button'
import { CheckboxF } from 'lib-components/atoms/form/Checkbox'
import ButtonContainer from 'lib-components/layout/ButtonContainer'
import ListGrid from 'lib-components/layout/ListGrid'
import { FixedSpaceRow } from 'lib-components/layout/flex-helpers'
import { AlertBox } from 'lib-components/molecules/MessageBoxes'
import { DatePickerF } from 'lib-components/molecules/date-picker/DatePicker'
import { DateRangePickerF } from 'lib-components/molecules/date-picker/DateRangePicker'
import { H1, Label } from 'lib-components/typography'
import { Gap } from 'lib-components/white-space'

import { useTranslation } from '../../state/i18n'

import {
  createHolidayPeriodMutation,
  updateHolidayPeriodMutation
} from './queries'

const minStartDate = (mockToday() ?? LocalDate.todayInSystemTz()).addWeeks(4)
const maxPeriod = 15 * 7 * 24 * 60 * 60 * 1000 // 15 weeks

function makeHolidayPeriodForm(mode: 'create' | 'update') {
  return object({
    period: validated(required(localDateRange), (output) =>
      // Extra validations when creating a new holiday period
      mode === 'create'
        ? output.start.isBefore(minStartDate)
          ? 'tooSoon'
          : output.end.toSystemTzDate().valueOf() -
              output.start.toSystemTzDate().valueOf() >
            maxPeriod
          ? 'tooLong'
          : undefined
        : undefined
    ),
    reservationDeadline: required(localDate),
    confirm: validated(boolean(), (value) => (value ? undefined : 'required'))
  })
}

const createHolidayPeriodForm = makeHolidayPeriodForm('create')
const updateHolidayPeriodForm = makeHolidayPeriodForm('update')

type HolidayPeriodFormState = StateOf<typeof createHolidayPeriodForm>

const emptyFormState: HolidayPeriodFormState = {
  period: {
    startDate: null,
    endDate: null
  },
  reservationDeadline: null,
  confirm: false
}

function initialFormState(p: HolidayPeriod): HolidayPeriodFormState {
  return {
    period: {
      startDate: p.period.start,
      endDate: p.period.end
    },
    reservationDeadline: p.reservationDeadline,
    confirm: true
  }
}

interface Props {
  onSuccess: () => void
  onCancel: () => void
  holidayPeriod?: HolidayPeriod
}

export default React.memo(function HolidayPeriodForm({
  onCancel,
  onSuccess,
  holidayPeriod
}: Props) {
  const { i18n, lang } = useTranslation()

  const form = useForm(
    holidayPeriod !== undefined
      ? updateHolidayPeriodForm
      : createHolidayPeriodForm,
    () =>
      holidayPeriod !== undefined
        ? initialFormState(holidayPeriod)
        : emptyFormState,
    {
      ...i18n.validationErrors,
      ...i18n.holidayPeriods.validationErrors
    }
  )

  const { mutateAsync: createHolidayPeriod } = useMutationResult(
    createHolidayPeriodMutation
  )
  const { mutateAsync: updateHolidayPeriod } = useMutationResult(
    updateHolidayPeriodMutation
  )

  const onSubmit = useCallback(() => {
    return holidayPeriod !== undefined
      ? updateHolidayPeriod({ id: holidayPeriod.id, data: form.value() })
      : createHolidayPeriod(form.value())
  }, [form, holidayPeriod, createHolidayPeriod, updateHolidayPeriod])

  const hideErrorsBeforeTouched = holidayPeriod === undefined

  const { period, reservationDeadline, confirm } = useFormFields(form)
  const startDate = useFormField(period, 'startDate')

  return (
    <>
      <H1>{i18n.titles.holidayPeriod}</H1>
      <ListGrid>
        <Label>{i18n.holidayPeriods.period} *</Label>
        <FixedSpaceRow alignItems="center">
          <DateRangePickerF bind={period} locale={lang} data-qa="period" />
        </FixedSpaceRow>

        <Label>{i18n.holidayPeriods.reservationDeadline} *</Label>
        <DatePickerF
          bind={reservationDeadline}
          locale={lang}
          hideErrorsBeforeTouched={hideErrorsBeforeTouched}
          maxDate={startDate.state ?? undefined}
          data-qa="input-reservation-deadline"
        />
      </ListGrid>

      {holidayPeriod === undefined ? (
        <>
          <AlertBox message={i18n.holidayPeriods.clearingAlert} />
          <CheckboxF
            label={i18n.holidayPeriods.confirmLabel}
            bind={confirm}
            data-qa="confirm-checkbox"
          />
        </>
      ) : null}

      <Gap />
      <ButtonContainer>
        <AsyncButton
          primary
          disabled={!form.isValid()}
          text={i18n.common.save}
          onSuccess={onSuccess}
          onClick={onSubmit}
          data-qa="save-btn"
        />
        <Button onClick={onCancel} text={i18n.common.goBack} />
      </ButtonContainer>
    </>
  )
})
