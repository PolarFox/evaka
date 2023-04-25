// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ChangeEvent } from 'react'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import styled from 'styled-components'

import type { Result } from 'lib-common/api'
import { isLoading } from 'lib-common/api'
import type { GroupStaffAttendanceForDates } from 'lib-common/api-types/codegen-excluded'
import LocalDate from 'lib-common/local-date'
import { isAutomatedTest } from 'lib-common/utils/helpers'
import { formatDecimal, stringToNumber } from 'lib-common/utils/number'
import { useDebouncedSave } from 'lib-common/utils/useDebouncedSave'
import { useApiState } from 'lib-common/utils/useRestApi'
import Tooltip from 'lib-components/atoms/Tooltip'
import { Td, Tr } from 'lib-components/layout/Table'
import { fontWeights } from 'lib-components/typography'
import colors from 'lib-customizations/common'
import { faTimes } from 'lib-icons'

import { getStaffAttendances, postStaffAttendance } from '../../api/absences'
import { useTranslation } from '../../state/i18n'

import { DisabledCell } from './AbsenceCell'

type Props = {
  groupId: string
  selectedDate: LocalDate
  emptyCols: number[]
  operationDays: LocalDate[]
}

export default React.memo(function StaffAttendance({
  groupId,
  selectedDate,
  emptyCols,
  operationDays
}: Props) {
  const [attendance] = useApiState(() => {
    const year = selectedDate.getYear()
    const month = selectedDate.getMonth()

    return getStaffAttendances(groupId, { year, month })
  }, [groupId, selectedDate])

  const updateAttendance = useCallback(
    (date: LocalDate, count: number) =>
      postStaffAttendance({
        groupId,
        date,
        count,
        countOther: null
      }),
    [groupId]
  )

  const firstOfMonth = LocalDate.of(selectedDate.year, selectedDate.month, 1)
  const lastOfMonth = firstOfMonth.lastDayOfMonth()
  const daysOfMonth = LocalDate.range(firstOfMonth, lastOfMonth)

  return (
    <StaffAttendanceRow
      emptyCols={emptyCols}
      groupAttendances={attendance}
      updateAttendance={updateAttendance}
      daysOfMonth={daysOfMonth}
      operationDays={operationDays}
    />
  )
})

interface StaffAttendanceRowProps {
  groupAttendances: Result<GroupStaffAttendanceForDates>
  emptyCols: number[]
  updateAttendance: (date: LocalDate, count: number) => Promise<unknown>
  daysOfMonth: LocalDate[]
  operationDays: LocalDate[]
}

const StaffAttendanceRow = React.memo(function StaffAttendanceRow({
  emptyCols,
  groupAttendances,
  updateAttendance,
  daysOfMonth,
  operationDays
}: StaffAttendanceRowProps) {
  const { i18n } = useTranslation()

  const isActive = (date: LocalDate): boolean =>
    groupAttendances
      .map(
        ({ startDate, endDate }) =>
          date.isEqualOrAfter(startDate) &&
          (!endDate || date.isEqualOrBefore(endDate))
      )
      .getOrElse(true)

  const isOperational = (date: LocalDate) =>
    operationDays.some((operationDay) => operationDay.isEqual(date))

  return (
    <StaffAttendanceTr>
      <StaffAttendanceTd>{i18n.absences.table.staffRow}</StaffAttendanceTd>
      {daysOfMonth.map((date) => {
        const staffCount = groupAttendances
          .map(({ attendances }) => attendances.get(date.toString()))
          .map((attendance) => attendance?.count)
        return (
          <StaffAttendanceTd key={date.toString()}>
            {!isOperational(date) ||
            !staffCount.isSuccess ||
            isLoading(staffCount) ? (
              <DisabledCell />
            ) : !isActive(date) ? (
              <InactiveCell />
            ) : (
              <StaffAttendanceCell
                date={date}
                initialCount={staffCount.value}
                updateAttendance={updateAttendance}
              />
            )}
          </StaffAttendanceTd>
        )
      })}
      {emptyCols.map((item) => (
        <Td key={item}>
          <DisabledCell />
        </Td>
      ))}
    </StaffAttendanceTr>
  )
})

const StaffAttendanceTr = styled(Tr)`
  font-weight: ${fontWeights.semibold};
`

const StaffAttendanceTd = styled(Td)`
  cursor: default;
  vertical-align: middle;
`

const DisabledStaffIcon = styled(FontAwesomeIcon)`
  font-size: 15px;
  color: ${colors.grayscale.g70};
`

const InactiveCell = React.memo(function InactiveCell() {
  const { i18n } = useTranslation()
  return (
    <InactiveCellContainer>
      <Tooltip
        tooltip={i18n.absences.table.disabledStaffCellTooltip}
        position="top"
      >
        <DisabledStaffIcon icon={faTimes} />
      </Tooltip>
    </InactiveCellContainer>
  )
})

const InactiveCellContainer = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: center;
`

interface StaffAttendanceCellProps {
  date: LocalDate
  initialCount: number | undefined
  updateAttendance: (date: LocalDate, count: number) => Promise<unknown>
}

const StaffAttendanceCell = React.memo(function StaffAttendanceCell({
  date,
  initialCount,
  updateAttendance
}: StaffAttendanceCellProps) {
  const mountedRef = useRef(true)
  useEffect(
    () => () => {
      mountedRef.current = false
    },
    []
  )

  const initialValue = useMemo(
    () => formatDecimal(initialCount) ?? '',
    [initialCount]
  )

  const save = useCallback(
    async (value: string) => {
      const numberValue = stringToNumber(value)
      if (numberValue !== undefined) {
        await updateAttendance(date, numberValue)
      }
    },
    [date, updateAttendance]
  )

  const { value, setValue, saveImmediately, state } = useDebouncedSave(
    initialValue,
    save,
    isAutomatedTest ? 200 : 2000
  )

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value)
    },
    [setValue]
  )

  return (
    <div data-qa="staff-attendance-cell" data-state={state}>
      <div>
        <StaffAttendanceInput
          className="input"
          value={value}
          onChange={handleChange}
          onBlur={saveImmediately}
        />
      </div>
    </div>
  )
})

const StaffAttendanceInput = styled.input`
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }

  /* disable spin buttons Firefox */
  -moz-appearance: textfield;
  text-align: center;
  margin: 0 auto;
  padding: 0;
  font-weight: ${fontWeights.semibold};
  font-size: 0.8rem;
  height: 20px;
  width: 20px;
  border-color: ${colors.grayscale.g35};
  color: ${colors.grayscale.g100};
  display: block;
  box-shadow: none;
  max-width: 100%;
  min-height: 2.5em;
  border-radius: 0;
  border-width: 0 0 1px;
  background-color: transparent;

  @media print {
    border: none;
  }
`
