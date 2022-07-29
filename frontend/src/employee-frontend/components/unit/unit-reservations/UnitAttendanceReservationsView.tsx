// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'

import { renderResult } from 'employee-frontend/components/async-rendering'
import LabelValueList from 'employee-frontend/components/common/LabelValueList'
import type { Result } from 'lib-common/api'
import { combine } from 'lib-common/api'
import type { Child } from 'lib-common/api-types/reservations'
import FiniteDateRange from 'lib-common/finite-date-range'
import { UpsertStaffAndExternalAttendanceRequest } from 'lib-common/generated/api-types/attendance'
import { DaycareGroup } from 'lib-common/generated/api-types/daycare'
import LocalDate from 'lib-common/local-date'
import { UUID } from 'lib-common/types'
import { useDataStatus } from 'lib-common/utils/result-to-data-status'
import { useApiState } from 'lib-common/utils/useRestApi'
import HorizontalLine from 'lib-components/atoms/HorizontalLine'
import IconButton from 'lib-components/atoms/buttons/IconButton'
import {
  FixedSpaceColumn,
  FixedSpaceRow
} from 'lib-components/layout/flex-helpers'
import { fontWeights, H3, Title } from 'lib-components/typography'
import { defaultMargins, Gap } from 'lib-components/white-space'
import colors from 'lib-customizations/common'
import { faChevronLeft, faChevronRight } from 'lib-icons'

import {
  deleteExternalStaffAttendance,
  deleteStaffAttendance,
  getStaffAttendances,
  postStaffAndExternalAttendances
} from '../../../api/staff-attendance'
import { getUnitAttendanceReservations } from '../../../api/unit'
import { useTranslation } from '../../../state/i18n'
import { AbsenceLegend } from '../../absences/AbsenceLegend'

import ChildReservationsTable from './ChildReservationsTable'
import ReservationModalSingleChild from './ReservationModalSingleChild'
import StaffAttendanceTable from './StaffAttendanceTable'

const Time = styled.span`
  font-weight: ${fontWeights.normal};
  display: inline-block;
  // match absence legend row height
  min-height: 22px;
  padding: 1px 4px;
`

const AttendanceTime = styled(Time)`
  font-weight: ${fontWeights.semibold};
  background: ${colors.grayscale.g4};
`

const formatWeekTitle = (dateRange: FiniteDateRange) =>
  `${dateRange.start.format('dd.MM.')} - ${dateRange.end.format()}`

interface Props {
  unitId: UUID
  groupId: UUID | 'no-group' | 'staff'
  selectedDate: LocalDate
  setSelectedDate: (date: LocalDate) => void
  isShiftCareUnit: boolean
  realtimeStaffAttendanceEnabled: boolean
  operationalDays: number[]
  groups: Result<DaycareGroup[]>
}

export default React.memo(function UnitAttendanceReservationsView({
  unitId,
  groupId,
  selectedDate,
  setSelectedDate,
  isShiftCareUnit,
  realtimeStaffAttendanceEnabled,
  operationalDays,
  groups
}: Props) {
  const { i18n } = useTranslation()

  // Before changing the week, the current week's data should be saved
  // because it is possible the user has started adding an overnight
  // entry over the week boundary, so the partial data should be saved
  // before navigating to the next week. The callbacks to save the data
  // are stored here, and added in the row components.
  const weekSavingFns = useRef<Map<string, () => Promise<void>>>(new Map())

  const [week, setWeek] = useState({
    dateRange: getWeekDateRange(selectedDate),
    saved: true,
    savingPromise: Promise.resolve()
  })

  useEffect(() => {
    let cancelled = false

    const dateRange = getWeekDateRange(selectedDate)
    setWeek({
      dateRange,
      saved: false,
      savingPromise: Promise.all(
        Array.from(weekSavingFns.current.values()).map((fn) => fn())
      ).then(() => {
        if (!cancelled) {
          setWeek((week) =>
            // strict equality check: ensure the current week is the
            // same one as when originally started, even when switching
            // going x* -> y -> x the save at * should be ignored at the end
            week.dateRange === dateRange
              ? {
                  ...week,
                  saved: true
                }
              : week
          )
        }
      })
    })

    return () => {
      cancelled = true
    }
  }, [selectedDate])

  const [childReservations, reloadChildReservations] = useApiState(
    () =>
      week.savingPromise.then(() =>
        getUnitAttendanceReservations(unitId, week.dateRange)
      ),
    [unitId, week.dateRange, week.savingPromise]
  )

  const [staffAttendances, reloadStaffAttendances] = useApiState(
    () =>
      week.savingPromise.then(() =>
        getStaffAttendances(unitId, week.dateRange)
      ),
    [unitId, week.dateRange, week.savingPromise]
  )

  const [creatingReservationChild, setCreatingReservationChild] =
    useState<Child>()

  const legendTimeLabels = useMemo(() => {
    const t = i18n.unit.attendanceReservations.legend
    const indicator = i18n.unit.attendanceReservations.serviceTimeIndicator
    return Object.entries({
      [t.reservation]: <Time>{t.hhmm}</Time>,
      [t.serviceTime]: (
        <Time>
          {t.hhmm} {indicator}
        </Time>
      ),
      [t.attendanceTime]: <AttendanceTime>{t.hhmm}</AttendanceTime>
    }).map(([value, label]) => ({ label, value }))
  }, [i18n])

  const saveAttendances = useCallback(
    (body: UpsertStaffAndExternalAttendanceRequest) =>
      groupId === 'staff'
        ? postStaffAndExternalAttendances(unitId, body)
        : postStaffAndExternalAttendances(unitId, {
            staffAttendances: body.staffAttendances.map((a) => ({
              ...a,
              groupId
            })),
            externalAttendances: body.externalAttendances.map((a) => ({
              ...a,
              groupId
            }))
          }),
    [groupId, unitId]
  )

  const deleteAttendances = useCallback(
    (
      staffAttendanceIds: UUID[],
      externalStaffAttendanceIds: UUID[]
    ): Promise<Result<void>[]> => {
      const staffDeletes = staffAttendanceIds.map((id) =>
        deleteStaffAttendance(unitId, id)
      )
      const externalDeletes = externalStaffAttendanceIds.map((id) =>
        deleteExternalStaffAttendance(unitId, id)
      )
      return Promise.all([...staffDeletes, ...externalDeletes])
    },
    [unitId]
  )

  const groupFilter = useCallback((id) => id === groupId, [groupId])
  const noFilter = useCallback(() => true, [])

  const combinedData = combine(childReservations, staffAttendances)
  const staffAttendancesStatus = useDataStatus(combinedData)

  return renderResult(combinedData, ([childData, staffData]) => (
    <>
      <div
        data-qa="staff-attendances-status"
        data-qa-value={staffAttendancesStatus}
      />

      {creatingReservationChild && (
        <ReservationModalSingleChild
          child={creatingReservationChild}
          onReload={reloadChildReservations}
          onClose={() => setCreatingReservationChild(undefined)}
          isShiftCareUnit={isShiftCareUnit}
          operationalDays={operationalDays}
        />
      )}

      <WeekPicker data-qa-week-range={week.dateRange.toString()}>
        <WeekPickerButton
          icon={faChevronLeft}
          onClick={() => setSelectedDate(selectedDate.subDays(7))}
          size="s"
          data-qa="previous-week"
        />
        <WeekTitle primary centered>
          {formatWeekTitle(week.dateRange)}
        </WeekTitle>
        <WeekPickerButton
          icon={faChevronRight}
          onClick={() => setSelectedDate(selectedDate.addDays(7))}
          size="s"
          data-qa="next-week"
        />
      </WeekPicker>
      <Gap size="s" />
      <FixedSpaceColumn spacing="L">
        {groupId === 'staff' ? (
          <StaffAttendanceTable
            unitId={unitId}
            operationalDays={childData.operationalDays}
            staffAttendances={staffData.staff}
            extraAttendances={staffData.extraAttendances}
            saveAttendances={saveAttendances}
            deleteAttendances={deleteAttendances}
            reloadStaffAttendances={reloadStaffAttendances}
            groups={groups}
            groupFilter={noFilter}
            selectedGroup={null}
            weekSavingFns={weekSavingFns}
          />
        ) : (
          <>
            {realtimeStaffAttendanceEnabled && (
              <StaffAttendanceTable
                unitId={unitId}
                operationalDays={childData.operationalDays}
                staffAttendances={staffData.staff.filter((s) =>
                  s.groups.includes(groupId)
                )}
                extraAttendances={staffData.extraAttendances.filter(
                  (ea) => ea.groupId === groupId
                )}
                saveAttendances={saveAttendances}
                deleteAttendances={deleteAttendances}
                reloadStaffAttendances={reloadStaffAttendances}
                groups={groups}
                groupFilter={groupFilter}
                selectedGroup={groupId}
                weekSavingFns={weekSavingFns}
              />
            )}
            <ChildReservationsTable
              unitId={unitId}
              operationalDays={childData.operationalDays}
              allDayRows={
                childData.groups.find((g) => g.group.id === groupId)
                  ?.children ?? childData.ungrouped
              }
              onMakeReservationForChild={setCreatingReservationChild}
              selectedDate={selectedDate}
              reloadReservations={reloadChildReservations}
            />
          </>
        )}
      </FixedSpaceColumn>

      <div>
        <HorizontalLine dashed slim />
        <H3>{i18n.absences.legendTitle}</H3>
        <FixedSpaceRow alignItems="flex-start" spacing="XL">
          <LabelValueList
            spacing="small"
            horizontalSpacing="small"
            labelWidth="fit-content(40%)"
            contents={legendTimeLabels}
          />
          <FixedSpaceColumn spacing="xs">
            <AbsenceLegend icons />
          </FixedSpaceColumn>
        </FixedSpaceRow>
      </div>
    </>
  ))
})

const getWeekDateRange = (date: LocalDate) => {
  const start = date.startOfWeek()
  return new FiniteDateRange(start, start.addDays(6))
}

const WeekPicker = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
`

const WeekPickerButton = styled(IconButton)`
  margin: 0 ${defaultMargins.s};
  color: ${colors.grayscale.g70};
`

const WeekTitle = styled(Title)`
  min-width: 14ch;
`
