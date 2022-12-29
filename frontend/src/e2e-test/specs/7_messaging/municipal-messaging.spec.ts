// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import HelsinkiDateTime from 'lib-common/helsinki-date-time'
import LocalDate from 'lib-common/local-date'
import LocalTime from 'lib-common/local-time'

import config from '../../config'
import {
  insertGuardianFixtures,
  resetDatabase,
  upsertMessageAccounts
} from '../../dev-api'
import {
  AreaAndPersonFixtures,
  initializeAreaAndPersonData
} from '../../dev-api/data-init'
import {
  careArea2Fixture,
  daycare2Fixture,
  daycareGroupFixture,
  Fixture,
  uuidv4
} from '../../dev-api/fixtures'
import { EmployeeDetail, PersonDetail } from '../../dev-api/types'
import CitizenMessagesPage from '../../pages/citizen/citizen-messages'
import MessagesPage from '../../pages/employee/messages/messages-page'
import { Page } from '../../utils/page'
import { employeeLogin, enduserLogin } from '../../utils/user'

let messagingPage: Page
let messenger: EmployeeDetail
let staffPage: Page
let staff: EmployeeDetail
let fixtures: AreaAndPersonFixtures
let citizenPage: Page
let childInAreaA: PersonDetail
let childInAreaB: PersonDetail

const mockedDate = LocalDate.of(2022, 11, 8)
const messageSendTime = HelsinkiDateTime.fromLocal(
  mockedDate,
  LocalTime.of(10, 49, 10)
)
const messageReadTime = HelsinkiDateTime.fromLocal(
  mockedDate,
  LocalTime.of(10, 49, 32)
)

beforeEach(async () => {
  await resetDatabase()
  fixtures = await initializeAreaAndPersonData()
  childInAreaA = fixtures.enduserChildFixtureJari
  childInAreaB = fixtures.enduserChildFixtureKaarina
  await Fixture.careArea().with(careArea2Fixture).save()
  await Fixture.daycare().with(daycare2Fixture).save()
  await Fixture.daycareGroup().with(daycareGroupFixture).save()
  const daycareGroup2Fixture = {
    ...daycareGroupFixture,
    id: uuidv4(),
    daycareId: daycare2Fixture.id
  }
  await Fixture.daycareGroup().with(daycareGroup2Fixture).save()
  await Fixture.placement()
    .with({
      childId: childInAreaA.id,
      unitId: fixtures.daycareFixture.id,
      startDate: mockedDate.formatIso(),
      endDate: mockedDate.formatIso()
    })
    .save()
    .then((placement) =>
      Fixture.groupPlacement()
        .with({
          daycarePlacementId: placement.data.id,
          daycareGroupId: daycareGroupFixture.id,
          startDate: placement.data.startDate,
          endDate: placement.data.endDate
        })
        .save()
    )
  await Fixture.placement()
    .with({
      childId: childInAreaB.id,
      unitId: daycare2Fixture.id,
      startDate: mockedDate.formatIso(),
      endDate: mockedDate.formatIso()
    })
    .save()
    .then((placement) =>
      Fixture.groupPlacement()
        .with({
          daycarePlacementId: placement.data.id,
          daycareGroupId: daycareGroup2Fixture.id,
          startDate: placement.data.startDate,
          endDate: placement.data.endDate
        })
        .save()
    )
  await insertGuardianFixtures([
    {
      childId: childInAreaA.id,
      guardianId: fixtures.enduserGuardianFixture.id
    }
  ])
  await insertGuardianFixtures([
    {
      childId: childInAreaB.id,
      guardianId: fixtures.enduserGuardianFixture.id
    }
  ])
  await upsertMessageAccounts()
  messenger = (await Fixture.employeeMessenger().save()).data
  staff = (
    await Fixture.employeeStaff(fixtures.daycareFixture.id)
      .withGroupAcl(daycareGroupFixture.id)
      .save()
  ).data
})

async function openMessagingPage(mockedTime: HelsinkiDateTime) {
  messagingPage = await Page.open({ mockedTime: mockedTime.toSystemTzDate() })
  await employeeLogin(messagingPage, messenger)
}

async function openStaffPage(mockedTime: HelsinkiDateTime) {
  staffPage = await Page.open({ mockedTime: mockedTime.toSystemTzDate() })
  await employeeLogin(staffPage, staff)
}

async function openCitizenPage(mockedTime: HelsinkiDateTime) {
  citizenPage = await Page.open({ mockedTime: mockedTime.toSystemTzDate() })
  await enduserLogin(citizenPage)
}

const defaultMessage = {
  title: 'Tiedote',
  content: 'Viestin sisältö',
  type: 'BULLETIN' as const
}

describe('Municipal messaging -', () => {
  test('Messaging role can send messages to multiple areas', async () => {
    await openMessagingPage(messageSendTime)
    await messagingPage.goto(`${config.employeeUrl}/messages`)
    const messagesPage = new MessagesPage(messagingPage)
    await messagesPage.sendNewMessage(defaultMessage)

    await openCitizenPage(messageReadTime)
    await citizenPage.goto(config.enduserMessagesUrl)
    const citizenMessagesPage = new CitizenMessagesPage(citizenPage)
    await citizenMessagesPage.assertThreadContent(defaultMessage)
  })

  test('Messages sent by messaging role creates a copy for the staff', async () => {
    await openMessagingPage(messageSendTime)
    await messagingPage.goto(`${config.employeeUrl}/messages`)
    const messagesPage = new MessagesPage(messagingPage)
    await messagesPage.sendNewMessage({
      ...defaultMessage,
      receiver: fixtures.careAreaFixture.id
    })

    await openStaffPage(messageReadTime)
    await staffPage.goto(`${config.employeeUrl}/messages`)
    await new MessagesPage(staffPage).assertCopyContent(
      defaultMessage.title,
      defaultMessage.content
    )
  })
})
