// SPDX-FileCopyrightText: 2017-2021 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Redirect, useHistory, useParams } from 'react-router-dom'
import { isAfter, parse } from 'date-fns'
import { combine } from 'lib-common/api'
import { formatTime, isValidTime } from 'lib-common/date'
import AsyncButton from 'lib-components/atoms/buttons/AsyncButton'
import Button from 'lib-components/atoms/buttons/Button'
import TimeInput from 'lib-components/atoms/form/TimeInput'
import ErrorSegment from 'lib-components/atoms/state/ErrorSegment'
import Title from 'lib-components/atoms/Title'
import { ContentArea } from 'lib-components/layout/Container'
import { FixedSpaceRow } from 'lib-components/layout/flex-helpers'
import { Gap } from 'lib-components/white-space'
import { EMPTY_PIN, PinInput } from 'lib-components/molecules/PinInput'
import { postStaffDeparture } from '../../api/realtimeStaffAttendances'
import { useTranslation } from '../../state/i18n'
import { StaffAttendanceContext } from '../../state/staff-attendance'
import { UnitContext } from '../../state/unit'
import { renderResult } from '../async-rendering'
import { Actions } from '../attendances/components'
import { TallContentArea } from '../mobile/components'
import { TimeWrapper } from './components/staff-components'
import { Label } from 'lib-components/typography'
import TopBar from '../common/TopBar'

export default React.memo(function StaffMarkDepartedPage() {
  const { i18n } = useTranslation()
  const history = useHistory()

  const { unitId, groupId, employeeId } = useParams<{
    unitId: string
    groupId: string
    employeeId: string
  }>()

  const { unitInfoResponse, reloadUnitInfo } = useContext(UnitContext)
  useEffect(reloadUnitInfo, [reloadUnitInfo])

  const { staffAttendanceResponse, reloadStaffAttendance } = useContext(
    StaffAttendanceContext
  )

  const [pinCode, setPinCode] = useState(EMPTY_PIN)
  const [time, setTime] = useState<string>(formatTime(new Date()))
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined)

  const staffInfo = useMemo(
    () =>
      unitInfoResponse.map((res) => {
        const staffInfo = res.staff.find((s) => s.id === employeeId)
        const pinSet = staffInfo?.pinSet ?? true
        const pinLocked = staffInfo?.pinLocked || errorCode === 'PIN_LOCKED'
        return { pinSet, pinLocked }
      }),
    [employeeId, errorCode, unitInfoResponse]
  )

  const memberAttendance = useMemo(
    () =>
      staffAttendanceResponse.map((res) => {
        const staffMember = res.staff.find((s) => s.employeeId === employeeId)
        const attendanceId =
          staffMember?.latestCurrentDayAttendance &&
          staffMember.latestCurrentDayAttendance.departed === null
            ? staffMember.latestCurrentDayAttendance.id
            : undefined
        return { staffMember, attendanceId }
      }),
    [employeeId, staffAttendanceResponse]
  )

  const backButtonText = useMemo(
    () =>
      memberAttendance
        .map(({ staffMember }) =>
          staffMember
            ? `${staffMember.firstName} ${staffMember.lastName}`
            : i18n.common.back
        )
        .getOrElse(i18n.common.back),
    [memberAttendance, i18n.common.back]
  )

  const timeInFuture = isAfter(parse(time, 'HH:mm', new Date()), new Date())

  return (
    <TallContentArea
      opaque={false}
      paddingHorizontal={'zero'}
      paddingVertical={'zero'}
    >
      <TopBar
        title={backButtonText}
        onBack={() => history.goBack()}
        invertedColors
      />
      <ContentArea
        shadow
        opaque={true}
        paddingHorizontal={'s'}
        paddingVertical={'m'}
      >
        {renderResult(
          combine(staffInfo, memberAttendance),
          ([{ pinSet, pinLocked }, { staffMember, attendanceId }]) => {
            if (staffMember === undefined) {
              return (
                <Redirect
                  to={`/units/${unitId}/groups/${groupId}/staff-attendance`}
                />
              )
            }
            if (attendanceId === undefined) {
              return (
                <Redirect
                  to={`/units/${unitId}/groups/${groupId}/staff-attendance/${employeeId}`}
                />
              )
            }

            return (
              <>
                <Title centered noMargin>
                  {i18n.attendances.staff.loginWithPin}
                </Title>
                <Gap />
                {!pinSet ? (
                  <ErrorSegment title={i18n.attendances.staff.pinNotSet} />
                ) : pinLocked ? (
                  <ErrorSegment title={i18n.attendances.staff.pinLocked} />
                ) : (
                  <PinInput
                    pin={pinCode}
                    onPinChange={setPinCode}
                    invalid={errorCode === 'WRONG_PIN'}
                  />
                )}
                <Gap />
                <TimeWrapper>
                  <Label>{i18n.attendances.departureTime}</Label>
                  <TimeInput
                    onChange={setTime}
                    value={time}
                    data-qa="set-time"
                    info={
                      timeInFuture
                        ? {
                            status: 'warning',
                            text: i18n.common.validation.dateLte(
                              formatTime(new Date())
                            )
                          }
                        : undefined
                    }
                  />
                  <Gap />
                </TimeWrapper>
                <Gap size="xs" />
                <Actions>
                  <FixedSpaceRow fullWidth>
                    <Button
                      text={i18n.common.cancel}
                      onClick={() => history.goBack()}
                    />
                    <AsyncButton
                      primary
                      text={i18n.common.confirm}
                      disabled={
                        pinLocked ||
                        !pinSet ||
                        !isValidTime(time) ||
                        timeInFuture ||
                        pinCode.join('').trim().length < 4
                      }
                      onClick={() =>
                        postStaffDeparture(attendanceId, {
                          time,
                          pinCode: pinCode.join('')
                        }).then((res) => {
                          if (res.isFailure) {
                            setErrorCode(res.errorCode)
                            if (res.errorCode === 'WRONG_PIN') {
                              setPinCode(EMPTY_PIN)
                            }
                          }
                          return res
                        })
                      }
                      onSuccess={() => {
                        reloadStaffAttendance()
                        history.go(-1)
                      }}
                      data-qa="mark-departed-btn"
                    />
                  </FixedSpaceRow>
                </Actions>
              </>
            )
          }
        )}
      </ContentArea>
    </TallContentArea>
  )
})
