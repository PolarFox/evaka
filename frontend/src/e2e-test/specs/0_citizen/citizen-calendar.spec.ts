// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import FiniteDateRange from 'lib-common/finite-date-range'
import LocalDate from 'lib-common/local-date'
import type { UUID } from 'lib-common/types'

import { insertDaycarePlacementFixtures, resetDatabase } from '../../dev-api'
import { initializeAreaAndPersonData } from '../../dev-api/data-init'
import {
  createDaycarePlacementFixture,
  Fixture,
  uuidv4
} from '../../dev-api/fixtures'
import type { PersonDetail } from '../../dev-api/types'
import CitizenCalendarPage from '../../pages/citizen/citizen-calendar'
import CitizenHeader from '../../pages/citizen/citizen-header'
import { Page } from '../../utils/page'
import { enduserLogin } from '../../utils/user'

describe('Citizen calendar (desktop)', () => {
  citizenCalendarTests('desktop')
})

describe('Citizen calendar (mobile)', () => {
  citizenCalendarTests('mobile')
})

function citizenCalendarTests(env: 'desktop' | 'mobile') {
  let page: Page
  let header: CitizenHeader
  let calendarPage: CitizenCalendarPage
  let children: PersonDetail[]
  const today = LocalDate.of(2022, 1, 5)

  const groupEventId = uuidv4()
  const unitEventId = uuidv4()
  const individualEventId = uuidv4()

  let jariId: UUID

  beforeEach(async () => {
    await resetDatabase()
    const fixtures = await initializeAreaAndPersonData()
    children = [
      fixtures.enduserChildFixtureJari,
      fixtures.enduserChildFixtureKaarina,
      fixtures.enduserChildFixturePorriHatterRestricted
    ]
    jariId = fixtures.enduserChildFixtureJari.id
    const placementIds = new Map(children.map((child) => [child.id, uuidv4()]))
    await insertDaycarePlacementFixtures(
      children.map((child) =>
        createDaycarePlacementFixture(
          placementIds.get(child.id) ?? '',
          child.id,
          fixtures.daycareFixture.id,
          today.formatIso(),
          today.addYears(1).formatIso()
        )
      )
    )

    const daycareGroup = await Fixture.daycareGroup()
      .with({
        daycareId: fixtures.daycareFixture.id,
        name: 'Group 1'
      })
      .save()

    for (const child of children) {
      await Fixture.groupPlacement()
        .with({
          startDate: today.formatIso(),
          endDate: today.addYears(1).formatIso(),
          daycareGroupId: daycareGroup.data.id,
          daycarePlacementId: placementIds.get(child.id) ?? ''
        })
        .save()
    }

    const { data: groupEvent } = await Fixture.calendarEvent()
      .with({
        id: groupEventId,
        title: 'Group-wide event',
        description: 'Whole group',
        period: new FiniteDateRange(today, today)
      })
      .save()

    await Fixture.calendarEventAttendee()
      .with({
        calendarEventId: groupEvent.id,
        unitId: fixtures.daycareFixture.id,
        groupId: daycareGroup.data.id
      })
      .save()

    const { data: individualEvent } = await Fixture.calendarEvent()
      .with({
        id: individualEventId,
        title: 'Individual event',
        description: 'Just Jari',
        period: new FiniteDateRange(today, today)
      })
      .save()

    await Fixture.calendarEventAttendee()
      .with({
        calendarEventId: individualEvent.id,
        unitId: fixtures.daycareFixture.id,
        groupId: daycareGroup.data.id,
        childId: fixtures.enduserChildFixtureJari.id
      })
      .save()

    const { data: unitEvent } = await Fixture.calendarEvent()
      .with({
        id: unitEventId,
        title: 'Unit event',
        description: 'For everyone in the unit',
        period: new FiniteDateRange(today.addDays(1), today.addDays(2))
      })
      .save()

    await Fixture.calendarEventAttendee()
      .with({
        calendarEventId: unitEvent.id,
        unitId: fixtures.daycareFixture.id
      })
      .save()

    const viewport =
      env === 'mobile'
        ? { width: 375, height: 812 }
        : { width: 1920, height: 1080 }

    page = await Page.open({
      viewport,
      screen: viewport,
      mockedTime: today.toSystemTzDate()
    })
    await enduserLogin(page)
    header = new CitizenHeader(page, env)
    calendarPage = new CitizenCalendarPage(page, env)
    await header.selectTab('calendar')
  })

  test('Citizen sees correct amount of event counts', async () => {
    await calendarPage.assertEventCount(today, 4) // group event (3 attendees) + individual event for Jari
    await calendarPage.assertEventCount(today.addDays(1), 3) // unit event (3 attendees)
    await calendarPage.assertEventCount(today.addDays(2), 3) // unit event (3 attendees)
  })

  test('Day modals have correct events', async () => {
    let dayView = await calendarPage.openDayView(today)

    for (const child of children) {
      await dayView.assertEvent(child.id, groupEventId, {
        title: 'Group-wide event / Group 1',
        description: 'Whole group'
      })
    }

    await dayView.assertEvent(jariId, individualEventId, {
      title:
        'Individual event / Jari-Petteri Mukkelis-Makkelis Vetelä-Viljami Eelis-Juhani',
      description: 'Just Jari'
    })

    await dayView.close()

    dayView = await calendarPage.openDayView(today.addDays(1))

    for (const child of children) {
      await dayView.assertEvent(child.id, unitEventId, {
        title: 'Unit event / Alkuräjähdyksen päiväkoti',
        description: 'For everyone in the unit'
      })
    }

    await dayView.close()

    dayView = await calendarPage.openDayView(today.addDays(2))

    for (const child of children) {
      await dayView.assertEvent(child.id, unitEventId, {
        title: 'Unit event / Alkuräjähdyksen päiväkoti',
        description: 'For everyone in the unit'
      })
    }

    await dayView.close()
  })
}
