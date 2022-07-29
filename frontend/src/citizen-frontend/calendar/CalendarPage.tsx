// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import React, { useCallback, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import type { Result } from 'lib-common/api'
import { isLoading } from 'lib-common/api'
import type {
  DailyReservationData,
  ReservationsResponse
} from 'lib-common/generated/api-types/reservations'
import LocalDate from 'lib-common/local-date'
import { useApiState } from 'lib-common/utils/useRestApi'
import Main from 'lib-components/atoms/Main'
import { ContentArea } from 'lib-components/layout/Container'
import {
  Desktop,
  MobileAndTablet
} from 'lib-components/layout/responsive-layout'

import Footer from '../Footer'
import RequireAuth from '../RequireAuth'
import { renderResult } from '../async-rendering'
import { useUser } from '../auth/state'
import { useHolidayPeriods } from '../holiday-periods/state'

import AbsenceModal from './AbsenceModal'
import ActionPickerModal from './ActionPickerModal'
import CalendarGridView from './CalendarGridView'
import CalendarListView from './CalendarListView'
import { CalendarNotificationsProvider } from './CalendarNotifications'
import DailyServiceTimeNotifications from './DailyServiceTimeNotifications'
import DayView from './DayView'
import ReservationModal from './ReservationModal'
import { getReservations } from './api'
import FixedPeriodSelectionModal from './holiday-modal/FixedPeriodSelectionModal'

async function getReservationsDefaultRange(): Promise<
  Result<ReservationsResponse>
> {
  return await getReservations(
    LocalDate.todayInSystemTz().subMonths(1).startOfMonth().startOfWeek(),
    LocalDate.todayInSystemTz().addYears(1).lastDayOfMonth()
  )
}

const CalendarPage = React.memo(function CalendarPage() {
  const user = useUser()

  const {
    holidayPeriods,
    activeFixedPeriodQuestionnaire,
    refreshQuestionnaires
  } = useHolidayPeriods()

  const [data, loadDefaultRange] = useApiState(getReservationsDefaultRange, [])

  const {
    modalState,
    openPickActionModal,
    openReservationModal,
    openHolidayModal,
    openAbsenceModal,
    openDayModal,
    closeModal
  } = useCalendarModalState()

  const refreshOnQuestionnaireAnswer = useCallback(() => {
    refreshQuestionnaires()
    void loadDefaultRange()
  }, [loadDefaultRange, refreshQuestionnaires])

  const dayIsReservable = useCallback(
    ({ date, isHoliday }: DailyReservationData) =>
      data
        .map(({ children }) =>
          children.some(
            ({ maxOperationalDays, inShiftCareUnit }) =>
              maxOperationalDays.includes(date.getIsoDayOfWeek()) &&
              (inShiftCareUnit || !isHoliday)
          )
        )
        .getOrElse(false),
    [data]
  )

  const dayIsHolidayPeriod = useCallback(
    (date: LocalDate) =>
      holidayPeriods
        .map((periods) => periods.some((p) => p.period.includes(date)))
        .getOrElse(false),
    [holidayPeriods]
  )

  const questionnaire = useMemo(
    () => activeFixedPeriodQuestionnaire.getOrElse(undefined),
    [activeFixedPeriodQuestionnaire]
  )

  const firstReservableDate: LocalDate = useMemo(() => {
    if (data.isSuccess) {
      const earliestReservableDate =
        data.value.reservableDays &&
        data.value.reservableDays.length > 0 &&
        data.value.reservableDays[0].start.isEqualOrAfter(
          LocalDate.todayInSystemTz()
        )
          ? data.value.reservableDays[0].start
          : LocalDate.todayInSystemTz()
      // First reservable day that has no reservations
      const firstReservableEmptyDate = data.value.dailyData.find(
        (day) =>
          day.date.isEqualOrAfter(earliestReservableDate) &&
          day.children.length == 0
      )
      return firstReservableEmptyDate
        ? firstReservableEmptyDate.date
        : earliestReservableDate
    } else {
      return LocalDate.todayInSystemTz()
    }
  }, [data])

  if (!user || !user.accessibleFeatures.reservations) return null

  return (
    <CalendarNotificationsProvider>
      <DailyServiceTimeNotifications />

      {renderResult(data, (response) => (
        <div data-qa="calendar-page" data-isloading={isLoading(data)}>
          <MobileAndTablet>
            <ContentArea opaque paddingVertical="zero" paddingHorizontal="zero">
              <CalendarListView
                childData={response.children}
                dailyData={response.dailyData}
                onHoverButtonClick={openPickActionModal}
                selectDate={openDayModal}
                dayIsReservable={dayIsReservable}
                dayIsHolidayPeriod={dayIsHolidayPeriod}
              />
            </ContentArea>
          </MobileAndTablet>
          <DesktopOnly>
            <CalendarGridView
              childData={response.children}
              dailyData={response.dailyData}
              onCreateReservationClicked={openReservationModal}
              onCreateAbsencesClicked={openAbsenceModal}
              onReportHolidaysClicked={openHolidayModal}
              selectedDate={
                modalState?.type === 'day' ? modalState.date : undefined
              }
              selectDate={openDayModal}
              includeWeekends={response.includesWeekends}
              dayIsReservable={dayIsReservable}
            />
          </DesktopOnly>
          {modalState?.type === 'day' && (
            <DayView
              date={modalState.date}
              reservationsResponse={response}
              selectDate={openDayModal}
              reloadData={loadDefaultRange}
              close={closeModal}
              openAbsenceModal={openAbsenceModal}
            />
          )}
          {modalState?.type === 'pickAction' && (
            <ActionPickerModal
              close={closeModal}
              openReservations={openReservationModal}
              openAbsences={openAbsenceModal}
              openHolidays={openHolidayModal}
            />
          )}
          {modalState?.type === 'reservations' && (
            <ReservationModal
              onClose={closeModal}
              availableChildren={response.children}
              onReload={loadDefaultRange}
              reservableDays={response.reservableDays}
              firstReservableDate={firstReservableDate}
              existingReservations={response.dailyData}
            />
          )}
          {modalState?.type === 'absences' && (
            <AbsenceModal
              close={closeModal}
              initialDate={modalState.initialDate}
              reload={loadDefaultRange}
              availableChildren={response.children}
            />
          )}
          {modalState?.type === 'holidays' && questionnaire && (
            <RequireAuth
              strength={
                questionnaire.questionnaire.requiresStrongAuth
                  ? 'STRONG'
                  : 'WEAK'
              }
            >
              <FixedPeriodSelectionModal
                close={closeModal}
                reload={refreshOnQuestionnaireAnswer}
                questionnaire={questionnaire.questionnaire}
                availableChildren={response.children}
                eligibleChildren={questionnaire.eligibleChildren}
                previousAnswers={questionnaire.previousAnswers}
              />
            </RequireAuth>
          )}
        </div>
      ))}
    </CalendarNotificationsProvider>
  )
})

// Modal states stored to the URL
type URLModalState =
  | { type: 'day'; date: LocalDate }
  | { type: 'absences'; initialDate: LocalDate | undefined }
  | { type: 'reservations' }
  | { type: 'holidays' }

// All possible modal states
type ModalState = { type: 'pickAction' } | URLModalState

interface UseModalStateResult {
  modalState: ModalState | undefined
  openDayModal: (date: LocalDate) => void
  openPickActionModal: () => void
  openReservationModal: () => void
  openAbsenceModal: (initialDate: LocalDate | undefined) => void
  openHolidayModal: () => void
  closeModal: () => void
}

export function useCalendarModalState(): UseModalStateResult {
  const location = useLocation()
  const navigate = useNavigate()

  const urlModalState = useMemo(
    () => parseQueryString(location.search),
    [location.search]
  )
  const [pickActionOpen, setPickActionOpen] = useState(false)

  const openModal = useCallback(
    (modal: URLModalState) => {
      setPickActionOpen(false)
      navigate(`/calendar?${buildQueryString(modal)}`)
    },
    [navigate]
  )
  const closeModal = useCallback(() => {
    setPickActionOpen(false)
    navigate('/calendar')
  }, [navigate])

  const openDayModal = useCallback(
    (date: LocalDate) => openModal({ type: 'day', date }),
    [openModal]
  )
  const openPickActionModal = useCallback(() => setPickActionOpen(true), [])
  const openReservationModal = useCallback(
    () => openModal({ type: 'reservations' }),
    [openModal]
  )
  const openAbsenceModal = useCallback(
    (initialDate: LocalDate | undefined) =>
      openModal({ type: 'absences', initialDate }),
    [openModal]
  )
  const openHolidayModal = useCallback(
    () => openModal({ type: 'holidays' }),
    [openModal]
  )

  return {
    modalState: pickActionOpen ? { type: 'pickAction' } : urlModalState,
    openDayModal,
    openPickActionModal,
    openReservationModal,
    openAbsenceModal,
    openHolidayModal,
    closeModal
  }
}

function parseQueryString(qs: string): URLModalState | undefined {
  const searchParams = new URLSearchParams(qs)
  const dateParam = searchParams.get('day')
  const modalParam = searchParams.get('modal')

  const date = dateParam ? LocalDate.tryParseIso(dateParam) : undefined
  return modalParam === 'reservations'
    ? { type: 'reservations' }
    : modalParam === 'holidays'
    ? { type: 'holidays' }
    : modalParam === 'absences'
    ? { type: 'absences', initialDate: date }
    : date
    ? { type: 'day', date }
    : undefined
}

function buildQueryString(modal: URLModalState): string {
  switch (modal.type) {
    case 'holidays':
      return 'modal=holidays'
    case 'reservations':
      return 'modal=reservations'
    case 'absences':
      return `modal=absences${
        modal.initialDate ? '&day=' + modal.initialDate.toString() : ''
      }`
    case 'day':
      return `day=${modal.date.toString()}`
  }
}

const DesktopOnly = styled(Desktop)`
  position: relative;
`

export default React.memo(function CalendarPageWrapper() {
  return (
    <>
      <Main>
        <CalendarPage />
      </Main>
      <Footer />
    </>
  )
})
