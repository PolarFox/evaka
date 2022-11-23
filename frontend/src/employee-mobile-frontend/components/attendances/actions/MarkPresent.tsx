// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { isAfter } from 'date-fns'
import React, { useCallback, useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { combine } from 'lib-common/api'
import { formatTime } from 'lib-common/date'
import HelsinkiDateTime from 'lib-common/helsinki-date-time'
import LocalTime from 'lib-common/local-time'
import useNonNullableParams from 'lib-common/useNonNullableParams'
import { mockNow } from 'lib-common/utils/helpers'
import RoundIcon from 'lib-components/atoms/RoundIcon'
import Title from 'lib-components/atoms/Title'
import AsyncButton from 'lib-components/atoms/buttons/AsyncButton'
import Button from 'lib-components/atoms/buttons/Button'
import TimeInput from 'lib-components/atoms/form/TimeInput'
import { ContentArea } from 'lib-components/layout/Container'
import { FixedSpaceRow } from 'lib-components/layout/flex-helpers'
import { Gap } from 'lib-components/white-space'
import colors from 'lib-customizations/common'
import { faArrowLeft, farStickyNote } from 'lib-icons'

import { childArrivesPOST, returnToPresent } from '../../../api/attendances'
import { ChildAttendanceContext } from '../../../state/child-attendance'
import { useTranslation } from '../../../state/i18n'
import { renderResult } from '../../async-rendering'
import { TallContentArea } from '../../mobile/components'
import { Actions, BackButtonInline, TimeWrapper } from '../components'
import DailyNote from '../notes/DailyNote'

export default React.memo(function MarkPresent() {
  const navigate = useNavigate()
  const { i18n } = useTranslation()

  const { attendanceResponse, reloadAttendances } = useContext(
    ChildAttendanceContext
  )

  const now = mockNow() ?? new Date()
  const [time, setTime] = useState<string>(formatTime(now))

  const { childId, unitId, groupId } = useNonNullableParams<{
    unitId: string
    childId: string
    groupId: string
  }>()

  const childArrives = useCallback(
    () => childArrivesPOST(unitId, childId, time),
    [childId, time, unitId]
  )

  const child = useMemo(
    () =>
      attendanceResponse.map((response) =>
        response.children.find((ac) => ac.id === childId)
      ),
    [attendanceResponse, childId]
  )

  const childLatestDeparture = useMemo(
    () =>
      child.isSuccess &&
      child.value &&
      child.value.attendances &&
      child.value.attendances.length > 0
        ? child.value.attendances[0].departed
        : null,
    [child]
  )

  const isValidTime = useCallback(() => {
    const parsedTime = LocalTime.tryParse(time, 'HH:mm')
    if (!parsedTime) return false
    else if (childLatestDeparture) {
      return isAfter(
        HelsinkiDateTime.now().withTime(parsedTime).toSystemTzDate(),
        childLatestDeparture.toSystemTzDate()
      )
    } else return true
  }, [childLatestDeparture, time])

  const groupNote = useMemo(
    () =>
      attendanceResponse.map((response) =>
        response.groupNotes.find((g) => g.groupId === groupId)
      ),
    [attendanceResponse, groupId]
  )

  function returnToPresentCall() {
    return returnToPresent(unitId, childId)
  }

  return (
    <TallContentArea
      opaque={false}
      paddingHorizontal="zero"
      paddingVertical="zero"
    >
      {renderResult(combine(child, groupNote), ([child, groupNote]) => (
        <>
          <div>
            <BackButtonInline
              onClick={() => navigate(-1)}
              icon={faArrowLeft}
              text={
                child
                  ? `${child.firstName} ${child.lastName}`
                  : i18n.common.back
              }
            />
          </div>
          <ContentArea
            shadow
            opaque={true}
            paddingHorizontal="s"
            paddingVertical="m"
          >
            <TimeWrapper>
              <CustomTitle>{i18n.attendances.actions.markPresent}</CustomTitle>
              <TimeInput onChange={setTime} value={time} data-qa="set-time" />
            </TimeWrapper>
            <Gap size="xs" />
            <Actions>
              <FixedSpaceRow fullWidth>
                <Button
                  text={i18n.common.cancel}
                  onClick={() => navigate(-1)}
                />
                <AsyncButton
                  primary
                  text={i18n.common.confirm}
                  disabled={!isValidTime()}
                  onClick={childArrives}
                  onSuccess={() => {
                    reloadAttendances()
                    navigate(-2)
                  }}
                  data-qa="mark-present-btn"
                />
              </FixedSpaceRow>
            </Actions>
            {childLatestDeparture && (
              <>
                <Gap size="s" />
                <JustifyContainer>
                  <InlineWideAsyncButton
                    text={i18n.attendances.actions.returnToPresentNoTimeNeeded}
                    onClick={() => returnToPresentCall()}
                    onSuccess={() => {
                      reloadAttendances()
                      navigate(-2)
                    }}
                    data-qa="return-to-present-btn"
                  />
                </JustifyContainer>
              </>
            )}
          </ContentArea>
          <Gap size="s" />
          <ContentArea
            shadow
            opaque={true}
            paddingHorizontal="s"
            paddingVertical="s"
            blue
          >
            <DailyNotes>
              <span>
                <RoundIcon
                  content={farStickyNote}
                  color={colors.main.m1}
                  size="m"
                />
              </span>
              <DailyNote
                child={child ? child : undefined}
                groupNote={groupNote ? groupNote : undefined}
              />
            </DailyNotes>
          </ContentArea>
        </>
      ))}
    </TallContentArea>
  )
})

const CustomTitle = styled(Title)`
  margin-top: 0;
  margin-bottom: 0;
`

const DailyNotes = styled.div`
  display: flex;
`
const InlineWideAsyncButton = styled(AsyncButton)`
  border: none;
  height: 50px;
`

const JustifyContainer = styled.div`
  display: flex;
  justify-content: center;
`
