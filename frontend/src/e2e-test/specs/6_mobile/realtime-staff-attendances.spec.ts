// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { insertDefaultServiceNeedOptions, resetDatabase } from '../../dev-api'
import { initializeAreaAndPersonData } from '../../dev-api/data-init'
import type { EmployeeBuilder } from '../../dev-api/fixtures'
import {
  daycare2Fixture,
  daycareGroupFixture,
  Fixture,
  uuidv4
} from '../../dev-api/fixtures'
import type { DaycareGroup } from '../../dev-api/types'
import MobileNav from '../../pages/mobile/mobile-nav'
import { StaffAttendancePage } from '../../pages/mobile/staff-page'
import { pairMobileDevice } from '../../utils/mobile'
import { Page } from '../../utils/page'

let page: Page
let nav: MobileNav
let mobileSignupUrl: string
let staffAttendancePage: StaffAttendancePage
let staffFixture: EmployeeBuilder

const pin = '4242'

const daycareGroup2Fixture: DaycareGroup = {
  ...daycareGroupFixture,
  id: uuidv4(),
  name: 'Ryhmä 2'
}

beforeEach(async () => {
  await resetDatabase()
  const fixtures = await initializeAreaAndPersonData()
  await insertDefaultServiceNeedOptions()

  await Fixture.daycare()
    .with({
      ...daycare2Fixture,
      careAreaId: fixtures.careAreaFixture.id,
      enabledPilotFeatures: ['REALTIME_STAFF_ATTENDANCE']
    })
    .save()

  await Fixture.daycareGroup()
    .with({
      ...daycareGroupFixture,
      daycareId: daycare2Fixture.id
    })
    .save()
  await Fixture.daycareGroup()
    .with({
      ...daycareGroup2Fixture,
      daycareId: daycare2Fixture.id
    })
    .save()
  const daycarePlacementFixture = await Fixture.placement()
    .with({
      childId: fixtures.familyWithTwoGuardians.children[0].id,
      unitId: daycare2Fixture.id
    })
    .save()
  await Fixture.groupPlacement()
    .with({
      daycarePlacementId: daycarePlacementFixture.data.id,
      daycareGroupId: daycareGroupFixture.id
    })
    .save()
  staffFixture = await Fixture.employeeStaff(daycare2Fixture.id)
    .withGroupAcl(daycareGroupFixture.id)
    .withGroupAcl(daycareGroup2Fixture.id)
    .save()
  await Fixture.employeePin().with({ userId: staffFixture.data.id, pin }).save()

  page = await Page.open({
    mockedTime: new Date('2022-05-05T13:00Z')
  })
  nav = new MobileNav(page)

  mobileSignupUrl = await pairMobileDevice(daycare2Fixture.id)
  await page.goto(mobileSignupUrl)
  await nav.openPage('staff')
  staffAttendancePage = new StaffAttendancePage(page)
})

describe('Realtime staff attendance page', () => {
  test('Staff member can be marked as arrived and departed', async () => {
    const name = `${staffFixture.data.lastName} ${staffFixture.data.firstName}`
    const arrivalTime = '05:59'
    const departureTime = '12:45'

    await staffAttendancePage.assertPresentStaffCount(0)

    await staffAttendancePage.selectTab('absent')
    await staffAttendancePage.openStaffPage(name)
    await staffAttendancePage.assertEmployeeStatus('Poissa')
    await staffAttendancePage.markStaffArrived({
      pin,
      time: arrivalTime,
      group: daycareGroupFixture
    })
    await staffAttendancePage.assertEmployeeStatus('Läsnä')
    await staffAttendancePage.assertEmployeeAttendanceTimes(
      0,
      `Paikalla ${arrivalTime}–`
    )
    await staffAttendancePage.goBackFromMemberPage()
    await staffAttendancePage.assertPresentStaffCount(1)

    await staffAttendancePage.selectTab('present')
    await staffAttendancePage.openStaffPage(name)
    await staffAttendancePage.markStaffDeparted({ pin, time: departureTime })
    await staffAttendancePage.assertEmployeeStatus('Poissa')
    await staffAttendancePage.assertEmployeeAttendanceTimes(
      0,
      `Paikalla ${arrivalTime}–${departureTime}`
    )
    await staffAttendancePage.goBackFromMemberPage()
    await staffAttendancePage.assertPresentStaffCount(0)
  })
  test('New external staff member can be added and marked as departed', async () => {
    const name = 'Nomen Estomen'
    const arrivalTime = '03:20'

    await staffAttendancePage.assertPresentStaffCount(0)

    await staffAttendancePage.markNewExternalStaffArrived(
      arrivalTime,
      name,
      daycareGroupFixture
    )
    await staffAttendancePage.assertPresentStaffCount(1)

    await staffAttendancePage.selectTab('present')
    await staffAttendancePage.openStaffPage(name)
    await staffAttendancePage.assertEmployeeStatus('Läsnä')
    await staffAttendancePage.assertExternalStaffArrivalTime(arrivalTime)
    await staffAttendancePage.markExternalStaffDeparted('11:09')
    await staffAttendancePage.assertPresentStaffCount(0)
  })
})
