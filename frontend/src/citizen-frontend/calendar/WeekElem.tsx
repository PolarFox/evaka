// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import sum from 'lodash/sum'
import React, { Fragment, useCallback, useEffect, useMemo, useRef } from 'react'
import styled, { css, useTheme } from 'styled-components'

import type { CitizenCalendarEvent } from 'lib-common/generated/api-types/calendarevent'
import type { ReservationResponseDay } from 'lib-common/generated/api-types/reservations'
import LocalDate from 'lib-common/local-date'
import { capitalizeFirstLetter } from 'lib-common/string'
import { scrollToPos } from 'lib-common/utils/scrolling'
import { FixedSpaceColumn } from 'lib-components/layout/flex-helpers'
import { fontWeights, H2, H3 } from 'lib-components/typography'
import { defaultMargins, Gap } from 'lib-components/white-space'
import colors from 'lib-customizations/common'
import { faCalendar } from 'lib-icons'

import { useLang, useTranslation } from '../localization'
import { headerHeightMobile } from '../navigation/const'

import {
  CalendarEventCount,
  CalendarEventCountContainer
} from './CalendarEventCount'
import { HistoryOverlay } from './HistoryOverlay'
import type { ChildImageData } from './RoundChildImages'
import { Reservations } from './calendar-elements'

interface Props {
  weekNumber: number
  calendarDays: ReservationResponseDay[]
  selectDate: (date: LocalDate) => void
  dayIsReservable: (date: LocalDate) => boolean
  dayIsHolidayPeriod: (date: LocalDate) => boolean
  childImages: ChildImageData[]
  events: CitizenCalendarEvent[]
}

export default React.memo(function WeekElem({
  weekNumber,
  calendarDays,
  dayIsHolidayPeriod,
  selectDate,
  dayIsReservable,
  childImages,
  events
}: Props) {
  const i18n = useTranslation()
  return (
    <div>
      <WeekTitle>
        {i18n.common.datetime.week} {weekNumber}
      </WeekTitle>
      <div>
        {calendarDays.map((day) => (
          <Fragment key={day.date.formatIso()}>
            {day.date.date === 1 && (
              <MonthTitle>
                {i18n.common.datetime.months[day.date.month - 1]}
              </MonthTitle>
            )}
            <DayElem
              key={day.date.formatIso()}
              calendarDay={day}
              selectDate={selectDate}
              isReservable={dayIsReservable(day.date)}
              isHolidayPeriod={dayIsHolidayPeriod(day.date)}
              childImages={childImages}
              events={events}
            />
          </Fragment>
        ))}
      </div>
    </div>
  )
})

const titleStyles = css`
  margin: 0;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: ${defaultMargins.s};
  background-color: ${(p) => p.theme.colors.main.m4};
  border-bottom: 1px solid ${colors.grayscale.g15};
  color: ${(p) => p.theme.colors.grayscale.g100};
  font-family: 'Open Sans', 'Arial', sans-serif;
  font-weight: ${fontWeights.semibold};
`

const WeekTitle = styled(H3)`
  font-size: 1em;
  ${titleStyles}
`

const MonthTitle = styled(H2)`
  font-size: 1.25em;
  ${titleStyles}
`

interface DayProps {
  calendarDay: ReservationResponseDay
  selectDate: (date: LocalDate) => void
  isReservable: boolean
  isHolidayPeriod: boolean
  childImages: ChildImageData[]
  events: CitizenCalendarEvent[]
}

const DayElem = React.memo(function DayElem({
  calendarDay,
  selectDate,
  isReservable,
  isHolidayPeriod,
  childImages,
  events
}: DayProps) {
  const [lang] = useLang()
  const ref = useRef<HTMLButtonElement>()

  // const markedByEmployee = useMemo(
  //   () =>
  //     calendarDay.children.length > 0 &&
  //     calendarDay.children.every((c) => c.markedByEmployee),
  //   [calendarDay]
  // )
  //
  const isToday = calendarDay.date.isToday()
  const setRef = useCallback(
    (e: HTMLButtonElement) => {
      if (isToday) {
        ref.current = e ?? undefined
      }
    },
    [isToday]
  )

  const handleClick = useCallback(() => {
    selectDate(calendarDay.date)
  }, [selectDate, calendarDay.date])

  useEffect(() => {
    const top = ref.current?.getBoundingClientRect().top

    if (top) {
      scrollToPos({
        top: top - headerHeightMobile - 32
      })
    }
  }, [])

  const eventCount = useMemo(
    () =>
      sum(
        events.map(
          ({ attendingChildren }) =>
            Object.values(attendingChildren).filter((attending) =>
              attending.some(({ periods }) =>
                periods.some((period) => period.includes(calendarDay.date))
              )
            ).length
        )
      ),
    [calendarDay.date, events]
  )

  const i18n = useTranslation()
  const theme = useTheme()

  return (
    <Day
      ref={setRef}
      today={calendarDay.date.isToday()}
      markedByEmployee={calendarDay.children.every(
        (c) => c.absence?.markedByEmployee ?? false
      )}
      holidayPeriod={isHolidayPeriod}
      onClick={handleClick}
      data-qa={`mobile-calendar-day-${calendarDay.date.formatIso()}`}
    >
      <DayColumn
        spacing="xxs"
        inactive={!isReservable}
        holiday={calendarDay.holiday}
      >
        <div aria-label={calendarDay.date.formatExotic('EEEE', lang)}>
          {capitalizeFirstLetter(calendarDay.date.format('EEEEEE', lang))}
        </div>
        <div aria-label={calendarDay.date.formatExotic('do MMMM', lang)}>
          {calendarDay.date.format('d.M.')}
        </div>
      </DayColumn>
      <Gap size="s" horizontal />
      <ReservationsContainer data-qa="reservations">
        <Reservations
          data={calendarDay}
          childImages={childImages}
          isReservable={isReservable}
        />
      </ReservationsContainer>
      {eventCount > 0 && (
        <CalendarEventCountContainer
          aria-label={`${eventCount} ${i18n.calendar.eventsCount}`}
        >
          <FontAwesomeIcon color={theme.colors.main.m2} icon={faCalendar} />
          <CalendarEventCount data-qa="event-count">
            {eventCount}
          </CalendarEventCount>
        </CalendarEventCountContainer>
      )}
      {calendarDay.date.isBefore(LocalDate.todayInSystemTz()) && (
        <HistoryOverlay />
      )}
    </Day>
  )
})

const ReservationsContainer = styled.div`
  flex: 1 0 0;
`

const Day = styled.button<{
  today: boolean
  markedByEmployee: boolean
  holidayPeriod: boolean
}>`
  display: flex;
  flex-direction: row;
  width: 100%;
  position: relative;
  padding: calc(${defaultMargins.s} - 6px) ${defaultMargins.s};
  background: transparent;
  margin: 0;
  border: none;
  border-bottom: 1px solid ${colors.grayscale.g15};
  border-left: 6px solid
    ${(p) => (p.today ? colors.status.success : 'transparent')};
  cursor: pointer;
  text-align: left;
  color: ${(p) => p.theme.colors.grayscale.g100};

  ${(p) =>
    p.markedByEmployee
      ? `background-color: ${colors.grayscale.g15}`
      : p.holidayPeriod
      ? `background-color: ${colors.accents.a10powder}`
      : undefined};

  :focus {
    outline: 2px solid ${(p) => p.theme.colors.main.m2Focus};
  }
`

const DayColumn = styled(FixedSpaceColumn)<{
  inactive: boolean
  holiday: boolean
}>`
  width: 3rem;
  color: ${(p) =>
    p.inactive
      ? colors.grayscale.g70
      : p.holiday
      ? colors.accents.a2orangeDark
      : colors.main.m1};
  font-weight: ${fontWeights.semibold};
  font-size: 1.25rem;
`
