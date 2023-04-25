// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import FiniteDateRange from 'lib-common/finite-date-range'
import LocalDate from 'lib-common/local-date'

import {
  insertAbsence,
  insertChildFixtures,
  insertDaycarePlacementFixtures,
  insertDefaultServiceNeedOptions,
  insertGuardianFixtures,
  insertPersonFixture,
  resetDatabase
} from '../../dev-api'
import type { AreaAndPersonFixtures } from '../../dev-api/data-init'
import { initializeAreaAndPersonData } from '../../dev-api/data-init'
import {
  careArea2Fixture,
  createDaycarePlacementFixture,
  createPreschoolDaycarePlacementFixture,
  daycare2Fixture,
  enduserGuardianFixture,
  Fixture,
  uuidv4
} from '../../dev-api/fixtures'
import type { PersonDetail } from '../../dev-api/types'
import type {
  AbsenceReservation,
  StartAndEndTimeReservation
} from '../../pages/citizen/citizen-calendar'
import CitizenCalendarPage from '../../pages/citizen/citizen-calendar'
import type { EnvType } from '../../pages/citizen/citizen-header'
import CitizenHeader from '../../pages/citizen/citizen-header'
import { Page } from '../../utils/page'
import { enduserLogin } from '../../utils/user'

const e: EnvType[] = ['desktop', 'mobile']
const today = LocalDate.of(2022, 1, 5)
let page: Page

async function openCalendarPage(envType: EnvType) {
  const viewport =
    envType === 'mobile'
      ? { width: 375, height: 812 }
      : { width: 1920, height: 1080 }

  page = await Page.open({
    viewport,
    screen: viewport,
    mockedTime: today.toSystemTzDate()
  })
  await enduserLogin(page)
  const header = new CitizenHeader(page, envType)
  await header.selectTab('calendar')
  return new CitizenCalendarPage(page, envType)
}

describe.each(e)('Citizen attendance reservations (%s)', (env) => {
  let children: PersonDetail[]
  let fixtures: AreaAndPersonFixtures

  beforeEach(async () => {
    await resetDatabase()
    fixtures = await initializeAreaAndPersonData()
    children = [
      fixtures.enduserChildFixtureJari,
      fixtures.enduserChildFixtureKaarina,
      fixtures.enduserChildFixturePorriHatterRestricted
    ]
    const placementFixtures = children.map((child) =>
      createDaycarePlacementFixture(
        uuidv4(),
        child.id,
        fixtures.daycareFixture.id,
        today.formatIso(),
        today.addYears(1).formatIso()
      )
    )
    await insertDaycarePlacementFixtures(placementFixtures)
    await insertDefaultServiceNeedOptions()

    const group = await Fixture.daycareGroup()
      .with({ daycareId: fixtures.daycareFixture.id })
      .save()

    await Promise.all(
      placementFixtures.map((placement) =>
        Fixture.groupPlacement()
          .withGroup(group)
          .with({
            daycarePlacementId: placement.id,
            startDate: placement.startDate,
            endDate: placement.endDate
          })
          .save()
      )
    )

    const employee = await Fixture.employeeStaff(fixtures.daycareFixture.id)
      .save()
      .then((e) => e.data)
    await insertAbsence(
      fixtures.enduserChildFixturePorriHatterRestricted.id,
      'UNKNOWN_ABSENCE',
      today.addDays(35),
      'BILLABLE',
      employee.id
    )
  })

  test('Citizen creates a repeating reservation for all children', async () => {
    const calendarPage = await openCalendarPage(env)

    const firstReservationDay = today.addDays(14)
    const reservation = {
      startTime: '08:00',
      endTime: '16:00',
      childIds: children.map(({ id }) => id)
    }

    const reservationsModal = await calendarPage.openReservationsModal()
    await reservationsModal.createRepeatingDailyReservation(
      new FiniteDateRange(firstReservationDay, firstReservationDay.addDays(6)),
      reservation.startTime,
      reservation.endTime
    )

    await calendarPage.assertReservations(firstReservationDay, [reservation])
  })

  test('Citizen creates a reservation for all children, but some days are not reservable', async () => {
    const calendarPage = await openCalendarPage(env)

    // Add a child whose placement ends in the middle of the reservations. This has to be done after the calendar page
    // is opened because login creates the family from VTJ.
    const childId = uuidv4()
    const firstReservationDay = today.addDays(14)
    const lastReservationDay = firstReservationDay.addDays(6)

    const childFixture = { ...fixtures.enduserNonSsnChildFixture, id: childId }
    await insertPersonFixture(childFixture)
    await insertChildFixtures([childFixture])
    await insertGuardianFixtures([
      { childId, guardianId: enduserGuardianFixture.id }
    ])
    await insertDaycarePlacementFixtures([
      createPreschoolDaycarePlacementFixture(
        uuidv4(),
        childFixture.id,
        fixtures.daycareFixture.id,
        today.formatIso(),
        lastReservationDay.subDays(1).formatIso()
      )
    ])

    await page.reload()

    const reservation = {
      startTime: '08:00',
      endTime: '16:00',
      childIds: [...children.map(({ id }) => id), childId]
    }

    const reservationsModal = await calendarPage.openReservationsModal()
    await reservationsModal.createRepeatingDailyReservation(
      new FiniteDateRange(firstReservationDay, lastReservationDay),
      reservation.startTime,
      reservation.endTime
    )

    await calendarPage.nonReservableDaysWarningModal.waitUntilVisible()
    await calendarPage.nonReservableDaysWarningModal.okButton.click()
    await calendarPage.nonReservableDaysWarningModal.waitUntilHidden()

    await calendarPage.assertReservations(firstReservationDay, [reservation])
  })

  test('Citizen creates a repeating weekly reservation for all children', async () => {
    const calendarPage = await openCalendarPage(env)

    // This should be a monday
    const firstReservationDay = today
      .addDays(14)
      .subDays(today.getIsoDayOfWeek() - 1)
    const weekdays = [0, 1, 2, 3, 4]
    const reservations = weekdays.map((index) => ({
      startTime: `08:0${index}`,
      endTime: `16:0${index}`,
      childIds: children.map(({ id }) => id)
    }))

    const reservationsModal = await calendarPage.openReservationsModal()
    await reservationsModal.createRepeatingWeeklyReservation(
      new FiniteDateRange(firstReservationDay, firstReservationDay.addDays(6)),
      reservations
    )

    await weekdays.reduce(async (promise, index) => {
      await promise
      await calendarPage.assertReservations(
        firstReservationDay.addDays(index),
        [reservations[index]]
      )
    }, Promise.resolve())
  })

  test('Citizen cannot create reservation on day where staff has marked an absence', async () => {
    const calendarPage = await openCalendarPage(env)

    // This should be a monday
    const firstReservationDay = today
      .addDays(35)
      .subDays(today.getIsoDayOfWeek() - 1)

    const reservationsModal = await calendarPage.openReservationsModal()
    await reservationsModal.deselectAllChildren()
    await reservationsModal.selectChild(
      fixtures.enduserChildFixturePorriHatterRestricted.id
    )
    await reservationsModal.assertUnmodifiableDayExists(
      new FiniteDateRange(firstReservationDay, firstReservationDay.addDays(6)),
      'WEEKLY'
    )
  })

  test('Citizen creates a repeating reservation and then marks an absence for one child', async () => {
    const calendarPage = await openCalendarPage(env)

    const firstReservationDay = today.addDays(14)
    const reservation = {
      startTime: '08:00',
      endTime: '16:00',
      absence: true,
      childIds: [children[0].id]
    }

    const reservationsModal = await calendarPage.openReservationsModal()
    await reservationsModal.createRepeatingDailyReservation(
      new FiniteDateRange(firstReservationDay, firstReservationDay.addDays(6)),
      reservation.startTime,
      reservation.endTime
    )

    const absencesModal = await calendarPage.openAbsencesModal()
    await absencesModal.toggleChildren(children)
    await absencesModal.markAbsence(
      children[0],
      children.length,
      new FiniteDateRange(firstReservationDay, firstReservationDay),
      'SICKLEAVE'
    )

    await calendarPage.assertReservations(firstReservationDay, [
      {
        startTime: '08:00',
        endTime: '16:00',
        childIds: [children[1].id, children[2].id]
      },
      { absence: true, childIds: [children[0].id] }
    ])
  })

  test('Citizen creates a repeating reservation and then overwrites it', async () => {
    const calendarPage = await openCalendarPage(env)

    const firstReservationDay = today.addDays(14)
    const initialReservation = {
      startTime: '08:00',
      endTime: '16:00',
      childIds: children.map(({ id }) => id)
    }

    let reservationsModal = await calendarPage.openReservationsModal()
    await reservationsModal.createRepeatingDailyReservation(
      new FiniteDateRange(firstReservationDay, firstReservationDay.addDays(6)),
      initialReservation.startTime,
      initialReservation.endTime
    )

    await calendarPage.assertReservations(firstReservationDay, [
      initialReservation
    ])

    const newReservation = {
      startTime: '09:00',
      endTime: '17:00',
      childIds: children.map(({ id }) => id)
    }

    reservationsModal = await calendarPage.openReservationsModal()
    await reservationsModal.createRepeatingDailyReservation(
      new FiniteDateRange(firstReservationDay, firstReservationDay.addDays(6)),
      newReservation.startTime,
      newReservation.endTime
    )

    await calendarPage.assertReservations(firstReservationDay, [newReservation])
  })

  test('Citizen creates a reservation from day view', async () => {
    const calendarPage = await openCalendarPage(env)

    const reservationDay = today.addDays(14)

    const dayView = await calendarPage.openDayView(reservationDay)

    expect(children.length).toEqual(3)
    await dayView.assertNoReservation(children[0].id)
    await dayView.assertNoReservation(children[1].id)
    await dayView.assertNoReservation(children[2].id)

    const editor = await dayView.edit()
    await editor.fillReservationTimes(children[1].id, '08:00', '16:00')
    await editor.save()

    await dayView.assertNoReservation(children[0].id)
    await dayView.assertReservations(children[1].id, '08:00 – 16:00')
    await dayView.assertNoReservation(children[2].id)
  })

  test('If absence modal is opened from day view, that day is filled by default', async () => {
    const calendarPage = await openCalendarPage(env)

    const reservationDay = today.addDays(14)

    const dayView = await calendarPage.openDayView(reservationDay)
    const absencesModal = await dayView.createAbsence()

    await absencesModal.startDateInput.assertValueEquals(
      reservationDay.format()
    )
    await absencesModal.endDateInput.assertValueEquals(reservationDay.format())
  })

  test('Children are grouped correctly in calendar', async () => {
    const calendarPage = await openCalendarPage(env)

    const firstReservationDay = today.addDays(14)
    const reservation1 = {
      startTime: '08:00',
      endTime: '16:00',
      childIds: [children[0].id]
    }

    const reservation2 = {
      startTime: '09:00',
      endTime: '17:30',
      childIds: [children[1].id, children[2].id]
    }

    const reservationsModal = await calendarPage.openReservationsModal()
    await reservationsModal.createRepeatingDailyReservation(
      new FiniteDateRange(firstReservationDay, firstReservationDay.addDays(6)),
      reservation1.startTime,
      reservation1.endTime,
      reservation1.childIds,
      3
    )

    const reservationsModal2 = await calendarPage.openReservationsModal()
    await reservationsModal2.createRepeatingDailyReservation(
      new FiniteDateRange(firstReservationDay, firstReservationDay.addDays(6)),
      reservation2.startTime,
      reservation2.endTime,
      reservation2.childIds,
      3
    )

    await calendarPage.assertReservations(firstReservationDay, [
      reservation2,
      reservation1
    ])
  })

  test('Citizen creates a repeating weekly reservation for all children with absent day', async () => {
    const calendarPage = await openCalendarPage(env)

    // This should be a monday
    const firstReservationDay = today
      .addDays(14)
      .subDays(today.getIsoDayOfWeek() - 1)
    const weekdays = [0, 1, 2, 3, 4]
    const childIds = children.map(({ id }) => id)
    const reservations = weekdays.map<
      AbsenceReservation | StartAndEndTimeReservation
    >((index) =>
      index === 1
        ? {
            absence: true,
            childIds
          }
        : {
            startTime: `08:0${index}`,
            endTime: `16:0${index}`,
            childIds
          }
    )

    const reservationsModal = await calendarPage.openReservationsModal()
    await reservationsModal.createRepeatingWeeklyReservation(
      new FiniteDateRange(firstReservationDay, firstReservationDay.addDays(6)),
      reservations
    )

    await weekdays.reduce(async (promise, index) => {
      await promise
      await calendarPage.assertReservations(
        firstReservationDay.addDays(index),
        [reservations[index]]
      )
    }, Promise.resolve())
  })
})

describe('Citizen calendar child visibility', () => {
  let page: Page
  let header: CitizenHeader
  let calendarPage: CitizenCalendarPage
  const today = LocalDate.of(2022, 1, 5)
  const placement1start = today
  const placement1end = today.addMonths(6)
  const placement2start = today.addMonths(8)
  const placement2end = today.addMonths(12)
  let fixtures: AreaAndPersonFixtures

  beforeEach(async () => {
    await resetDatabase()
    fixtures = await initializeAreaAndPersonData()
    const child = fixtures.enduserChildFixtureJari

    await insertDaycarePlacementFixtures([
      createDaycarePlacementFixture(
        uuidv4(),
        child.id,
        fixtures.daycareFixture.id,
        placement1start.formatIso(),
        placement1end.formatIso()
      ),
      createDaycarePlacementFixture(
        uuidv4(),
        child.id,
        fixtures.daycareFixture.id,
        placement2start.formatIso(),
        placement2end.formatIso()
      )
    ])

    page = await Page.open({
      mockedTime: today.toSystemTzDate()
    })
    await enduserLogin(page)
    header = new CitizenHeader(page, 'desktop')
    calendarPage = new CitizenCalendarPage(page, 'desktop')
  })

  test('Child visible only while placement is active', async () => {
    await header.selectTab('calendar')

    await calendarPage.assertChildCountOnDay(placement1start.subDays(1), 0)
    await calendarPage.assertChildCountOnDay(placement1start, 1)
    await calendarPage.assertChildCountOnDay(placement1end, 1)
    await calendarPage.assertChildCountOnDay(placement1end.addDays(1), 0)

    await calendarPage.assertChildCountOnDay(placement2start.subDays(1), 0)
    await calendarPage.assertChildCountOnDay(placement2start, 1)
    await calendarPage.assertChildCountOnDay(placement2start.addDays(1), 1)
    await calendarPage.assertChildCountOnDay(placement2end, 1)
    await calendarPage.assertChildCountOnDay(placement2end.addDays(1), 0)
  })

  test('Day popup contains message if no children placements on that date', async () => {
    await header.selectTab('calendar')

    let dayView = await calendarPage.openDayView(today.subDays(1))
    await dayView.assertNoActivePlacementsMsgVisible()
    await dayView.close()
    dayView = await calendarPage.openDayView(today.addYears(1).addDays(1))
    await dayView.assertNoActivePlacementsMsgVisible()
  })

  test('If other child is in round the clock daycare, the other child is not required to fill in weekends', async () => {
    const careArea = await Fixture.careArea().with(careArea2Fixture).save()
    await Fixture.daycare().with(daycare2Fixture).careArea(careArea).save()

    // Sibling is in 24/7 daycare
    await insertDaycarePlacementFixtures([
      createDaycarePlacementFixture(
        uuidv4(),
        fixtures.enduserChildFixtureKaarina.id,
        daycare2Fixture.id,
        placement1start.formatIso(),
        placement1end.formatIso()
      )
    ])

    await header.selectTab('calendar')
    // Saturday
    await calendarPage.assertChildCountOnDay(today.addDays(3), 1)
  })

  test('Citizen creates a reservation for a child in round the clock daycare for holidays', async () => {
    const careArea = await Fixture.careArea().with(careArea2Fixture).save()
    await Fixture.daycare().with(daycare2Fixture).careArea(careArea).save()
    const child = fixtures.enduserChildFixtureKaarina

    // 24/7 daycare
    await insertDaycarePlacementFixtures([
      createDaycarePlacementFixture(
        uuidv4(),
        child.id,
        daycare2Fixture.id,
        placement1start.formatIso(),
        placement1end.formatIso()
      )
    ])

    const firstReservationDay = today.addDays(14)
    await Fixture.holiday()
      .with({ date: firstReservationDay, description: 'Test holiday 1' })
      .save()

    const calendarPage = await openCalendarPage('desktop')
    await calendarPage.assertChildCountOnDay(firstReservationDay, 1)

    const reservation = {
      startTime: '08:00',
      endTime: '16:00',
      childIds: [child.id]
    }

    const holidayDayModal = await calendarPage.openDayModal(firstReservationDay)
    await holidayDayModal.childName.assertCount(1)
    await holidayDayModal.closeModal.click()

    const reservationsModal = await calendarPage.openReservationsModal()
    await reservationsModal.createIrregularReservation(
      new FiniteDateRange(firstReservationDay, firstReservationDay.addDays(1)),
      [
        {
          date: firstReservationDay,
          startTime: reservation.startTime,
          endTime: reservation.endTime
        },
        {
          date: firstReservationDay.addDays(1),
          startTime: '10:00',
          endTime: '14:00'
        }
      ]
    )

    await calendarPage.assertReservations(firstReservationDay, [reservation])
  })
})

describe('Citizen calendar visibility', () => {
  let page: Page
  const today = LocalDate.todayInSystemTz()
  let child: PersonDetail
  let daycareId: string

  beforeEach(async () => {
    await resetDatabase()
    const fixtures = await initializeAreaAndPersonData()
    child = fixtures.enduserChildFixtureJari
    daycareId = fixtures.daycareFixture.id
  })

  test('Child is visible when placement starts within 2 weeks', async () => {
    await insertDaycarePlacementFixtures([
      createDaycarePlacementFixture(
        uuidv4(),
        child.id,
        daycareId,
        today.addDays(13).formatIso(),
        today.addYears(1).formatIso()
      )
    ])

    page = await Page.open({
      mockedTime: today.toSystemTzDate()
    })
    await enduserLogin(page)

    await page.find('[data-qa="nav-calendar-desktop"]').waitUntilVisible()
  })

  test('Child is not visible when placement starts later than 2 weeks', async () => {
    await insertDaycarePlacementFixtures([
      createDaycarePlacementFixture(
        uuidv4(),
        child.id,
        daycareId,
        today.addDays(15).formatIso(),
        today.addYears(1).formatIso()
      )
    ])

    page = await Page.open({
      mockedTime: today.toSystemTzDate()
    })

    await enduserLogin(page)

    // Ensure page has loaded
    await page.find('[data-qa="nav-children-desktop"]').waitUntilVisible()
    await page.find('[data-qa="nav-calendar-desktop"]').waitUntilHidden()
  })
})
