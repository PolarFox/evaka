// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import classNames from 'classnames'
import sortBy from 'lodash/sortBy'
import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'

import type {
  Child,
  ChildDailyRecords,
  OperationalDay
} from 'lib-common/api-types/reservations'
import type { ChildServiceNeedInfo } from 'lib-common/generated/api-types/daycare'
import type LocalDate from 'lib-common/local-date'
import type { UUID } from 'lib-common/types'
import { Table, Tbody } from 'lib-components/layout/Table'

import EllipsisMenu from '../../../components/common/EllipsisMenu'
import type { Translations } from '../../../state/i18n'
import { useTranslation } from '../../../state/i18n'
import { formatName } from '../../../utils'
import { AgeIndicatorChip } from '../../common/AgeIndicatorChip'
import { ContractDaysIndicatorChip } from '../../common/ContractDaysIndicatorChip'

import ChildDay from './ChildDay'
import {
  AttendanceTableHeader,
  NameWrapper,
  DayTd,
  DayTr,
  EditStateIndicator,
  NameTd,
  StyledTd,
  ChipWrapper
} from './attendance-elements'
import { useUnitReservationEditState } from './reservation-table-edit-state'

interface Props {
  unitId: UUID
  operationalDays: OperationalDay[]
  allDayRows: ChildDailyRecords[]
  onMakeReservationForChild: (child: Child) => void
  selectedDate: LocalDate
  reloadReservations: () => void
  childServiceNeedInfos: ChildServiceNeedInfo[]
}

export default React.memo(function ChildReservationsTable(props: Props) {
  const { selectedDate } = props

  // Reset edit state when the selected date changes
  return <ChildReservations key={selectedDate.formatIso()} {...props} />
})

const ChildReservations = React.memo(function ChildReservations(props: Props) {
  const {
    operationalDays,
    onMakeReservationForChild,
    selectedDate,
    childServiceNeedInfos
  } = props
  const { i18n } = useTranslation()
  const { editState, stopEditing, startEditing, ...editCallbacks } =
    useUnitReservationEditState(
      props.allDayRows,
      props.reloadReservations,
      props.unitId
    )

  const contractDayServiceNeeds = childServiceNeedInfos.filter(
    (c) => c.hasContractDays
  )
  const allDayRows = useMemo(
    () =>
      sortBy(
        props.allDayRows,
        ({ child }) => child.lastName,
        ({ child }) => child.firstName
      ),
    [props.allDayRows]
  )

  return (
    <Table data-qa="child-reservations-table">
      <AttendanceTableHeader
        operationalDays={operationalDays}
        nameColumnLabel={i18n.unit.attendanceReservations.childName}
      />
      <Tbody>
        {allDayRows.flatMap(({ child, dailyData }) => {
          const multipleRows = dailyData.length > 1
          const childContractDayServiceNeeds = contractDayServiceNeeds.filter(
            (c) => c.childId === child.id
          )
          return dailyData.map((childDailyRecordRow, index) => {
            const childEditState =
              editState?.childId === child.id &&
              editState.date.isEqual(selectedDate)
                ? editState
                : undefined

            return (
              <DayTr
                key={`${child.id}-${index}`}
                data-qa={`reservation-row-child-${child.id}`}
              >
                <NameTd
                  partialRow={multipleRows}
                  rowIndex={index}
                  maxRows={dailyData.length - 1}
                >
                  {index == 0 && (
                    <NameWrapper>
                      <ChipWrapper spacing="xs">
                        <AgeIndicatorChip
                          age={selectedDate.differenceInYears(
                            child.dateOfBirth
                          )}
                        />
                        {childContractDayServiceNeeds.length > 0 && (
                          <ContractDaysIndicatorChip
                            contractDayServiceNeeds={
                              childContractDayServiceNeeds
                            }
                          />
                        )}
                      </ChipWrapper>
                      <Link to={`/child-information/${child.id}`}>
                        {formatName(
                          child.firstName.split(/\s/)[0],
                          child.lastName,
                          i18n,
                          true
                        )}
                        {child.preferredName ? ` (${child.preferredName})` : ''}
                      </Link>
                    </NameWrapper>
                  )}
                </NameTd>
                {operationalDays.map((day) => (
                  <DayTd
                    key={day.date.formatIso()}
                    className={classNames({ 'is-today': day.date.isToday() })}
                    partialRow={multipleRows}
                    rowIndex={index}
                    maxRows={dailyData.length - 1}
                  >
                    <ChildDay
                      day={day}
                      dataForAllDays={childDailyRecordRow}
                      rowIndex={index}
                      editState={childEditState}
                      {...editCallbacks}
                    />
                  </DayTd>
                ))}
                {index === 0 && (
                  <StyledTd
                    partialRow={multipleRows}
                    rowIndex={index}
                    maxRows={1}
                    rowSpan={dailyData.length}
                  >
                    {childEditState ? (
                      <EditStateIndicator
                        status={childEditState.request.result}
                        stopEditing={stopEditing}
                      />
                    ) : (
                      <RowMenu
                        i18n={i18n}
                        child={child}
                        selectedDate={selectedDate}
                        startEditing={startEditing}
                        openReservationModal={onMakeReservationForChild}
                      />
                    )}
                  </StyledTd>
                )}
              </DayTr>
            )
          })
        })}
      </Tbody>
    </Table>
  )
})

const RowMenu = React.memo(function RowMenu({
  i18n,
  child,
  selectedDate,
  startEditing,
  openReservationModal
}: {
  i18n: Translations
  child: Child
  selectedDate: LocalDate
  startEditing: (c: string, d: LocalDate) => void
  openReservationModal: (c: Child) => void
}) {
  return (
    <EllipsisMenu
      items={[
        {
          id: 'edit-row',
          label: i18n.unit.attendanceReservations.editRow,
          onClick: () => startEditing(child.id, selectedDate)
        },
        {
          id: 'reservation-modal',
          label: i18n.unit.attendanceReservations.openReservationModal,
          onClick: () => openReservationModal(child)
        }
      ]}
      data-qa={`ellipsis-menu-${child.id}`}
    />
  )
})
