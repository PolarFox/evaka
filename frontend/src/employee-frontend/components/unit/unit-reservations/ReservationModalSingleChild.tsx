// SPDX-FileCopyrightText: 2017-2021 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { Fragment, useMemo, useState } from 'react'
import { FixedSpaceRow } from 'lib-components/layout/flex-helpers'
import { fontWeights, H2, Label } from 'lib-components/typography'
import InputField from 'lib-components/atoms/form/InputField'
import LocalDate from 'lib-common/local-date'
import DatePicker, {
  DatePickerSpacer
} from 'lib-components/molecules/date-picker/DatePicker'
import { ErrorKey, regexp, TIME_REGEXP } from 'lib-common/form-validation'
import FiniteDateRange from 'lib-common/finite-date-range'
import Combobox from 'lib-components/atoms/form/Combobox'
import { defaultMargins, Gap } from 'lib-components/white-space'
import { postReservations } from '../../../api/unit'
import { useTranslation } from '../../../state/i18n'
import { errorToInputInfo } from '../../../utils/validation/input-info-helper'
import {
  DailyReservationRequest,
  TimeRange
} from 'lib-common/generated/api-types/reservations'
import { AsyncFormModal } from 'lib-components/molecules/modals/FormModal'
import { Child } from 'lib-common/api-types/reservations'
import IconButton from 'lib-components/atoms/buttons/IconButton'
import { faPlus, faTrash } from 'lib-icons'
import styled from 'styled-components'
import Checkbox from 'lib-components/atoms/form/Checkbox'

interface Props {
  onClose: () => void
  onReload: () => void
  child: Child
  isShiftCareUnit: boolean
  operationalDays: number[]
}

type Repetition = 'DAILY' | 'WEEKLY' | 'IRREGULAR'

interface ReservationFormData {
  startDate: string
  endDate: string
  repetition: Repetition
  dailyTimes: TimeRanges
  weeklyTimes: Array<TimeRanges | undefined>
  irregularTimes: Record<string, TimeRanges | undefined>
}

type TimeRanges = [TimeRange] | [TimeRange, TimeRange]
type TimeRangeErrors = {
  startTime: ErrorKey | undefined
  endTime: ErrorKey | undefined
}

type ReservationErrors = Partial<
  Record<
    keyof Omit<
      ReservationFormData,
      'dailyTimes' | 'weeklyTimes' | 'irregularTimes'
    >,
    ErrorKey
  > & {
    dailyTimes: TimeRangeErrors[]
  } & {
    weeklyTimes: Array<TimeRangeErrors[] | undefined>
  } & {
    irregularTimes: Record<string, TimeRangeErrors[] | undefined>
  }
>

export default React.memo(function ReservationModalSingleChild({
  onClose,
  onReload,
  child,
  isShiftCareUnit,
  operationalDays
}: Props) {
  const { i18n, lang } = useTranslation()

  const [formData, setFormData] = useState<ReservationFormData>({
    startDate: LocalDate.today().format(),
    endDate: '',
    repetition: 'DAILY',
    dailyTimes: [
      {
        startTime: '',
        endTime: ''
      }
    ],
    weeklyTimes: [0, 1, 2, 3, 4, 5, 6].map(() => [
      {
        startTime: '',
        endTime: ''
      }
    ]),
    irregularTimes: {}
  })

  const updateForm = (updated: Partial<ReservationFormData>) => {
    setFormData((prev) => ({
      ...prev,
      ...updated
    }))
  }

  const [showAllErrors, setShowAllErrors] = useState(false)
  const validationResult = useMemo(
    () => validateForm(child.id, formData),
    [child.id, formData]
  )

  const shiftCareRange = useMemo(() => {
    if (formData.repetition !== 'IRREGULAR') return

    const parsedStartDate = LocalDate.parseFiOrNull(formData.startDate)
    const parsedEndDate = LocalDate.parseFiOrNull(formData.endDate)

    if (
      !parsedStartDate ||
      !parsedEndDate ||
      parsedEndDate.isBefore(parsedStartDate)
    ) {
      return
    }

    return [...new FiniteDateRange(parsedStartDate, parsedEndDate).dates()]
  }, [formData.repetition, formData.startDate, formData.endDate])

  const includedDays = useMemo(() => {
    return [1, 2, 3, 4, 5, 6, 7].filter((day) => operationalDays.includes(day))
  }, [operationalDays])

  return (
    <AsyncFormModal
      mobileFullScreen
      title={i18n.unit.attendanceReservations.reservationModal.title}
      resolve={{
        action: () => {
          if (validationResult.errors) {
            setShowAllErrors(true)
            return Promise.resolve('AsyncButton.cancel')
          } else {
            return postReservations(validationResult.requestPayload)
          }
        },
        onSuccess: () => {
          onReload()
          onClose()
        },
        label: i18n.common.confirm
      }}
      reject={{
        action: onClose,
        label: i18n.common.cancel
      }}
    >
      <H2>
        {i18n.unit.attendanceReservations.reservationModal.selectedChildren}
      </H2>
      <div>
        {child.lastName} {child.firstName}
      </div>

      <H2>{i18n.unit.attendanceReservations.reservationModal.repetition}</H2>
      <Label>{i18n.common.select}</Label>
      <Combobox<Repetition>
        items={['DAILY', 'WEEKLY', 'IRREGULAR']}
        selectedItem={formData.repetition}
        onChange={(value) => {
          if (value) updateForm({ repetition: value })
        }}
        clearable={false}
        getItemLabel={(item) =>
          i18n.unit.attendanceReservations.reservationModal.repetitions[item]
        }
        data-qa="repetition"
      />

      <H2>{i18n.unit.attendanceReservations.reservationModal.dateRange}</H2>
      <Label>
        {i18n.unit.attendanceReservations.reservationModal.dateRangeLabel}
      </Label>
      <FixedSpaceRow>
        <DatePicker
          date={formData.startDate}
          onChange={(date) => updateForm({ startDate: date })}
          locale={lang}
          isValidDate={(date) => !date.isBefore(LocalDate.today())}
          info={errorToInputInfo(
            validationResult.errors?.startDate,
            i18n.validationErrors
          )}
          hideErrorsBeforeTouched={!showAllErrors}
        />
        <DatePickerSpacer />
        <DatePicker
          date={formData.endDate}
          onChange={(date) => updateForm({ endDate: date })}
          locale={lang}
          isValidDate={(date) => !date.isBefore(LocalDate.today())}
          info={errorToInputInfo(
            validationResult.errors?.endDate,
            i18n.validationErrors
          )}
          hideErrorsBeforeTouched={!showAllErrors}
          initialMonth={LocalDate.today()}
        />
      </FixedSpaceRow>
      <Gap size="m" />

      <TimeInputGrid>
        {formData.repetition === 'DAILY' && (
          <TimeInputs
            label={
              <Label>{`${
                i18n.common.datetime.weekdaysShort[includedDays[0] - 1]
              }-${
                i18n.common.datetime.weekdaysShort[
                  includedDays[includedDays.length - 1] - 1
                ]
              }`}</Label>
            }
            times={formData.dailyTimes}
            updateTimes={(dailyTimes) =>
              updateForm({
                dailyTimes
              })
            }
            validationErrors={validationResult.errors?.dailyTimes}
            showAllErrors={showAllErrors}
            allowExtraTimeRange={isShiftCareUnit}
          />
        )}

        {formData.repetition === 'WEEKLY' &&
          formData.weeklyTimes.map((times, index) =>
            includedDays.includes(index + 1) ? (
              <TimeInputs
                key={`day-${index}`}
                label={
                  <Checkbox
                    label={i18n.common.datetime.weekdaysShort[index]}
                    checked={!!times}
                    onChange={(checked) =>
                      updateForm({
                        weeklyTimes: [
                          ...formData.weeklyTimes.slice(0, index),
                          checked
                            ? [
                                {
                                  startTime: '',
                                  endTime: ''
                                }
                              ]
                            : undefined,
                          ...formData.weeklyTimes.slice(index + 1)
                        ]
                      })
                    }
                  />
                }
                times={times}
                updateTimes={(times) =>
                  updateForm({
                    weeklyTimes: [
                      ...formData.weeklyTimes.slice(0, index),
                      times,
                      ...formData.weeklyTimes.slice(index + 1)
                    ]
                  })
                }
                validationErrors={validationResult.errors?.weeklyTimes?.[index]}
                showAllErrors={showAllErrors}
                allowExtraTimeRange={isShiftCareUnit}
              />
            ) : null
          )}

        {formData.repetition === 'IRREGULAR' ? (
          shiftCareRange ? (
            shiftCareRange.map((date, index) => (
              <Fragment key={`shift-care-${date.formatIso()}`}>
                {index !== 0 && date.getIsoDayOfWeek() === 1 ? (
                  <Separator />
                ) : null}
                {index === 0 || date.getIsoDayOfWeek() === 1 ? (
                  <Week>
                    {i18n.common.datetime.week} {date.getIsoWeek()}
                  </Week>
                ) : null}
                {includedDays.includes(date.getIsoDayOfWeek()) && (
                  <TimeInputs
                    label={
                      <Label>
                        {`${
                          i18n.common.datetime.weekdaysShort[
                            date.getIsoDayOfWeek() - 1
                          ]
                        } ${date.format('d.M.')}`}
                      </Label>
                    }
                    times={
                      formData.irregularTimes[date.formatIso()] ?? [
                        {
                          startTime: '',
                          endTime: ''
                        }
                      ]
                    }
                    updateTimes={(times) =>
                      updateForm({
                        irregularTimes: {
                          ...formData.irregularTimes,
                          [date.formatIso()]: times
                        }
                      })
                    }
                    validationErrors={
                      validationResult.errors?.irregularTimes?.[
                        date.formatIso()
                      ]
                    }
                    showAllErrors={showAllErrors}
                    allowExtraTimeRange={isShiftCareUnit}
                  />
                )}
              </Fragment>
            ))
          ) : (
            <MissingDateRange>
              {
                i18n.unit.attendanceReservations.reservationModal
                  .missingDateRange
              }
            </MissingDateRange>
          )
        ) : null}
      </TimeInputGrid>
    </AsyncFormModal>
  )
})

const TimeInputs = React.memo(function TimeInputs(props: {
  label: JSX.Element
  times: TimeRanges | undefined
  updateTimes: (v: TimeRanges | undefined) => void
  validationErrors: TimeRangeErrors[] | undefined
  showAllErrors: boolean
  allowExtraTimeRange: boolean
}) {
  const { i18n } = useTranslation()

  if (!props.times) {
    return (
      <>
        {props.label}
        <div />
        <div />
      </>
    )
  }

  const [timeRange, extraTimeRange] = props.times
  return (
    <>
      {props.label}
      <FixedSpaceRow alignItems="center">
        <InputField
          value={timeRange.startTime ?? ''}
          type="time"
          onChange={(value) => {
            const updatedRange = {
              startTime: value,
              endTime: timeRange.endTime ?? ''
            }

            props.updateTimes(
              extraTimeRange ? [updatedRange, extraTimeRange] : [updatedRange]
            )
          }}
          info={errorToInputInfo(
            props.validationErrors?.[0]?.startTime,
            i18n.validationErrors
          )}
          hideErrorsBeforeTouched={!props.showAllErrors}
        />
        <span>–</span>
        <InputField
          value={timeRange.endTime ?? ''}
          type="time"
          onChange={(value) => {
            const updatedRange = {
              startTime: timeRange.startTime ?? '',
              endTime: value
            }

            props.updateTimes(
              extraTimeRange ? [updatedRange, extraTimeRange] : [updatedRange]
            )
          }}
          info={errorToInputInfo(
            props.validationErrors?.[0]?.endTime,
            i18n.validationErrors
          )}
          hideErrorsBeforeTouched={!props.showAllErrors}
        />
      </FixedSpaceRow>
      {!extraTimeRange && props.allowExtraTimeRange ? (
        <IconButton
          icon={faPlus}
          onClick={() =>
            props.updateTimes([
              timeRange,
              {
                startTime: '',
                endTime: ''
              }
            ])
          }
        />
      ) : (
        <div />
      )}
      {extraTimeRange ? (
        <>
          <div />
          <FixedSpaceRow alignItems="center">
            <InputField
              value={extraTimeRange.startTime ?? ''}
              type="time"
              onChange={(value) =>
                props.updateTimes([
                  timeRange,
                  {
                    startTime: value,
                    endTime: extraTimeRange.endTime ?? ''
                  }
                ])
              }
              info={errorToInputInfo(
                props.validationErrors?.[1]?.startTime,
                i18n.validationErrors
              )}
              hideErrorsBeforeTouched={!props.showAllErrors}
            />
            <span>–</span>
            <InputField
              value={extraTimeRange.endTime ?? ''}
              type="time"
              onChange={(value) =>
                props.updateTimes([
                  timeRange,
                  {
                    startTime: extraTimeRange.startTime ?? '',
                    endTime: value
                  }
                ])
              }
              info={errorToInputInfo(
                props.validationErrors?.[1]?.endTime,
                i18n.validationErrors
              )}
              hideErrorsBeforeTouched={!props.showAllErrors}
            />
          </FixedSpaceRow>
          <IconButton
            icon={faTrash}
            onClick={() => props.updateTimes([timeRange])}
          />
        </>
      ) : null}
    </>
  )
})

type ValidationResult =
  | { errors: ReservationErrors }
  | { errors: undefined; requestPayload: DailyReservationRequest[] }

function validateForm(
  childId: string,
  formData: ReservationFormData
): ValidationResult {
  const errors: ReservationErrors = {}

  const startDate = LocalDate.parseFiOrNull(formData.startDate)
  if (startDate === null) {
    errors['startDate'] = 'validDate'
  }

  const endDate = LocalDate.parseFiOrNull(formData.endDate)
  if (endDate === null) {
    errors['endDate'] = 'validDate'
  } else if (startDate && endDate.isBefore(startDate)) {
    errors['endDate'] = 'dateTooEarly'
  }

  if (formData.repetition === 'DAILY') {
    errors['dailyTimes'] = formData.dailyTimes.map((time) => ({
      startTime:
        time.startTime === ''
          ? time.endTime !== ''
            ? 'required'
            : undefined
          : regexp(time.startTime, TIME_REGEXP, 'timeFormat'),
      endTime:
        time.endTime === ''
          ? time.startTime !== ''
            ? 'required'
            : undefined
          : regexp(time.endTime, TIME_REGEXP, 'timeFormat')
    }))
  }

  if (formData.repetition === 'WEEKLY') {
    errors['weeklyTimes'] = formData.weeklyTimes.map((times) =>
      times
        ? times.map((time) => ({
            startTime:
              time.startTime === ''
                ? time.endTime !== ''
                  ? 'required'
                  : undefined
                : regexp(time.startTime, TIME_REGEXP, 'timeFormat'),
            endTime:
              time.endTime === ''
                ? time.startTime !== ''
                  ? 'required'
                  : undefined
                : regexp(time.endTime, TIME_REGEXP, 'timeFormat')
          }))
        : undefined
    )
  }

  if (formData.repetition === 'IRREGULAR') {
    errors['irregularTimes'] = Object.fromEntries(
      Object.entries(formData.irregularTimes).map(([date, times]) => [
        date,
        times
          ? times.map((time) => ({
              startTime:
                time.startTime === ''
                  ? time.endTime !== ''
                    ? 'required'
                    : undefined
                  : regexp(time.startTime, TIME_REGEXP, 'timeFormat'),
              endTime:
                time.endTime === ''
                  ? time.startTime !== ''
                    ? 'required'
                    : undefined
                  : regexp(time.endTime, TIME_REGEXP, 'timeFormat')
            }))
          : undefined
      ])
    )
  }

  if (errorsExist(errors)) {
    return { errors }
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const dateRange = new FiniteDateRange(startDate!, endDate!)
  const dates = [...dateRange.dates()]

  return {
    errors: undefined,
    requestPayload:
      formData.repetition === 'DAILY'
        ? dates.map((date) => ({
            childId,
            date,
            reservations: filterEmptyReservationTimes(formData.dailyTimes)
          }))
        : formData.repetition === 'WEEKLY'
        ? dates.map((date) => ({
            childId,
            date,
            reservations: filterEmptyReservationTimes(
              formData.weeklyTimes[date.getIsoDayOfWeek() - 1]
            )
          }))
        : Object.entries(formData.irregularTimes)
            .filter(([isoDate]) => {
              const date = LocalDate.tryParseIso(isoDate)
              return date && dateRange.includes(date)
            })
            .map(([isoDate, times]) => ({
              childId,
              date: LocalDate.parseIso(isoDate),
              reservations: filterEmptyReservationTimes(times)
            }))
  }
}

function filterEmptyReservationTimes(times: TimeRanges | undefined) {
  return times?.filter(({ startTime, endTime }) => startTime && endTime) ?? null
}

function errorsExist(errors: ReservationErrors): boolean {
  const {
    dailyTimes: dailyErrors,
    weeklyTimes: weeklyErrors,
    irregularTimes: shiftCareErrors,
    ...otherErrors
  } = errors

  for (const error of Object.values(otherErrors)) {
    if (error) return true
  }

  if (dailyErrors?.some((error) => error.startTime || error.endTime)) {
    return true
  }

  for (const errors of weeklyErrors ?? []) {
    if (errors?.some((error) => error.startTime || error.endTime)) return true
  }

  for (const errors of Object.values(shiftCareErrors ?? {})) {
    if (errors?.some((error) => error.startTime || error.endTime)) return true
  }

  return false
}

const TimeInputGrid = styled.div`
  display: grid;
  grid-template-columns: max-content max-content auto;
  grid-column-gap: ${defaultMargins.s};
  grid-row-gap: ${defaultMargins.s};
  align-items: center;
`

const Week = styled.div`
  color: ${({ theme }) => theme.colors.main.dark};
  font-weight: ${fontWeights.semibold};
  grid-column-start: 1;
  grid-column-end: 4;
`

const Separator = styled.div`
  border-top: 2px dotted ${(p) => p.theme.colors.greyscale.lighter};
  margin: ${defaultMargins.s} 0;
  grid-column-start: 1;
  grid-column-end: 4;
`

const MissingDateRange = styled.span`
  color: ${({ theme }) => theme.colors.greyscale.dark};
  font-style: italic;
  grid-column-start: 1;
  grid-column-end: 4;
`
