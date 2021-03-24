// SPDX-FileCopyrightText: 2017-2021 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useContext } from 'react'
import styled from 'styled-components'

import { AttendanceChild, AttendanceStatus, Group } from '../../api/attendances'
import RoundIcon from 'lib-components/atoms/RoundIcon'
import colors from 'lib-components/colors'
import { defaultMargins } from 'lib-components/white-space'
import { farStickyNote, farUser } from 'lib-icons'
import { useTranslation } from '../../state/i18n'
import { formatDateTimeOnly } from '../../utils/date'
import { AttendanceUIContext } from '../../state/attendance-ui'
import { Link } from 'react-router-dom'

const ChildBox = styled.div<{ type: AttendanceStatus }>`
  align-items: center;
  color: ${colors.greyscale.darkest};
  display: flex;
  padding: ${defaultMargins.xs} ${defaultMargins.s};
  border-radius: 2px;
  background-color: ${colors.greyscale.white};
`

const AttendanceLinkBox = styled(Link)`
  align-items: center;
  display: flex;
  width: 100%;
`

const ChildBoxInfo = styled.div`
  margin-left: 24px;
  flex-grow: 1;
`

const Bold = styled.div`
  font-weight: 600;

  h2,
  h3 {
    font-weight: 500;
  }
`

const IconBox = styled.div<{ type: AttendanceStatus }>`
  background-color: ${(props) => {
    switch (props.type) {
      case 'ABSENT':
        return colors.greyscale.dark
      case 'DEPARTED':
        return colors.blues.primary
      case 'PRESENT':
        return colors.accents.green
      case 'COMING':
        return colors.accents.water
    }
  }};
  border-radius: 50%;
  box-shadow: ${(props) => {
    switch (props.type) {
      case 'ABSENT':
        return `0 0 0 2px ${colors.greyscale.dark}`
      case 'DEPARTED':
        return `0 0 0 2px ${colors.blues.primary}`
      case 'PRESENT':
        return `0 0 0 2px ${colors.accents.green}`
      case 'COMING':
        return `0 0 0 2px ${colors.accents.water}`
    }
  }};
  border: 2px solid ${colors.greyscale.white};
`

const DetailsRow = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  color: ${colors.greyscale.dark};
  font-size: 14px;
`

const Time = styled.span`
  margin-left: ${defaultMargins.xs};
`

const ToolsColumn = styled.div`
  display: flex;
  flex-direction: column;
`

interface ChildListItemProps {
  attendanceChild: AttendanceChild
  onClick?: () => void
  type: AttendanceStatus
  childAttendanceUrl: string
}

export default React.memo(function ChildListItem({
  attendanceChild,
  onClick,
  type,
  childAttendanceUrl
}: ChildListItemProps) {
  const { i18n } = useTranslation()
  const { attendanceResponse } = useContext(AttendanceUIContext)

  return (
    <ChildBox type={type} data-qa={`child-${attendanceChild.id}`}>
      <AttendanceLinkBox to={childAttendanceUrl}>
        <IconBox type={type}>
          <RoundIcon
            content={farUser}
            color={
              type === 'ABSENT'
                ? colors.greyscale.dark
                : type === 'DEPARTED'
                ? colors.blues.primary
                : type === 'PRESENT'
                ? colors.accents.green
                : type === 'COMING'
                ? colors.accents.water
                : colors.blues.medium
            }
            size="XL"
          />
        </IconBox>
        <ChildBoxInfo onClick={onClick}>
          <Bold data-qa={'child-name'}>
            {attendanceChild.firstName} {attendanceChild.lastName}
          </Bold>
          <DetailsRow>
            <div data-qa={'child-status'}>
              {i18n.attendances.status[attendanceChild.status]}
              {attendanceResponse.isSuccess &&
                attendanceChild.status === 'COMING' && (
                  <span>
                    {' '}
                    (
                    {attendanceResponse.value.unit.groups
                      .find(
                        (elem: Group) => elem.id === attendanceChild.groupId
                      )
                      ?.name.toUpperCase()}
                    )
                  </span>
                )}
              <Time>
                {attendanceChild.status === 'PRESENT' &&
                  formatDateTimeOnly(attendanceChild.attendance?.arrived)}
                {attendanceChild.status === 'DEPARTED' &&
                  formatDateTimeOnly(attendanceChild.attendance?.departed)}
              </Time>
            </div>
            {attendanceChild.backup && (
              <RoundIcon content="V" size="m" color={colors.blues.primary} />
            )}
          </DetailsRow>
        </ChildBoxInfo>
      </AttendanceLinkBox>
      <ToolsColumn>
        {attendanceChild.dailyNote && attendanceResponse.isSuccess && (
          <Link
            to={`/units/${attendanceResponse.value.unit.id}/groups/${attendanceChild.groupId}/childattendance/${attendanceChild.id}/note`}
            data-qa={'link-child-daycare-daily-note'}
          >
            <RoundIcon
              content={farStickyNote}
              color={colors.accents.petrol}
              size={'m'}
            />
          </Link>
        )}
      </ToolsColumn>
    </ChildBox>
  )
})
