// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { ChildDailyNoteBody } from 'lib-common/generated/api-types/note'

import {
  insertDefaultServiceNeedOptions,
  resetDatabase,
  postChildDailyNote
} from '../../dev-api'
import type { AreaAndPersonFixtures } from '../../dev-api/data-init'
import { initializeAreaAndPersonData } from '../../dev-api/data-init'
import type {
  DaycareBuilder,
  DaycareGroupBuilder
} from '../../dev-api/fixtures'
import { Fixture } from '../../dev-api/fixtures'
import { UnitPage } from '../../pages/employee/units/unit'
import { Page } from '../../utils/page'
import { employeeLogin } from '../../utils/user'

let fixtures: AreaAndPersonFixtures
let page: Page
let daycare: DaycareBuilder
let daycareGroup: DaycareGroupBuilder
let unitPage: UnitPage

beforeEach(async () => {
  await resetDatabase()
  fixtures = await initializeAreaAndPersonData()
  const admin = await Fixture.employeeAdmin().save()

  await insertDefaultServiceNeedOptions()

  const careArea = await Fixture.careArea().save()
  daycare = await Fixture.daycare().careArea(careArea).save()
  daycareGroup = await Fixture.daycareGroup().daycare(daycare).save()

  const placementFixtureJari = await Fixture.placement()
    .with({
      childId: fixtures.enduserChildFixtureJari.id,
      unitId: daycare.data.id
    })
    .save()
  await Fixture.groupPlacement()
    .withGroup(daycareGroup)
    .withPlacement(placementFixtureJari)
    .save()

  const placementFixtureKaarina = await Fixture.placement()
    .with({
      childId: fixtures.enduserChildFixtureKaarina.id,
      unitId: daycare.data.id
    })
    .save()
  await Fixture.groupPlacement()
    .withGroup(daycareGroup)
    .withPlacement(placementFixtureKaarina)
    .save()

  page = await Page.open()
  await employeeLogin(page, admin.data)

  unitPage = new UnitPage(page)
})

describe('Mobile employee daily notes', () => {
  test('Child daycare daily note indicators are shown on group view and can be edited', async () => {
    const childId = fixtures.enduserChildFixtureJari.id
    const daycareDailyNote: ChildDailyNoteBody = {
      note: 'Testi viesti',
      feedingNote: 'MEDIUM',
      sleepingMinutes: 130,
      sleepingNote: 'NONE',
      reminders: ['DIAPERS'],
      reminderNote: 'Ei enää pähkinöitä antaa saa'
    }

    const hours =
      Math.floor(Number(daycareDailyNote.sleepingMinutes) / 60) > 0
        ? Math.floor(Number(daycareDailyNote.sleepingMinutes) / 60).toString()
        : ''
    const minutes =
      Number(daycareDailyNote.sleepingMinutes) % 60 > 0
        ? (Number(daycareDailyNote.sleepingMinutes) % 60).toString()
        : ''

    await postChildDailyNote(childId, daycareDailyNote)

    await unitPage.navigateToUnit(daycare.data.id)
    const group = await unitPage.openGroupsPage()
    const groupCollapsible = await group.openGroupCollapsible(
      daycareGroup.data.id
    )

    const childRow = groupCollapsible.childRow(childId)
    await childRow.assertDailyNoteContainsText(daycareDailyNote.note)

    const noteModal = await childRow.openDailyNoteModal()
    await noteModal.assertNote(daycareDailyNote.note)
    await noteModal.assertSleepingHours(hours)
    await noteModal.assertSleepingMinutes(minutes)
    await noteModal.assertReminderNote(daycareDailyNote.reminderNote)

    await noteModal.fillNote('aardvark')
    await noteModal.submit()

    await childRow.assertDailyNoteContainsText('aardvark')
  })

  test('Group daycare daily notes can be written and are shown on group notes tab', async () => {
    const childId1 = fixtures.enduserChildFixtureJari.id
    const childId2 = fixtures.enduserChildFixtureKaarina.id
    const daycareDailyNote: ChildDailyNoteBody = {
      note: 'Toinen viesti',
      feedingNote: 'NONE',
      sleepingMinutes: null,
      sleepingNote: 'NONE',
      reminders: ['DIAPERS'],
      reminderNote: 'Muistakaa muistakaa!'
    }

    await postChildDailyNote(childId1, daycareDailyNote)

    await unitPage.navigateToUnit(daycare.data.id)
    const groupsSection = await unitPage.openGroupsPage()
    const group = await groupsSection.openGroupCollapsible(daycareGroup.data.id)
    let groupNoteModal = await group.openGroupDailyNoteModal()
    await groupNoteModal.fillNote('Ryhmälle viesti')
    await groupNoteModal.save()
    await groupNoteModal.close()

    let childRow = group.childRow(childId1)
    let noteModal = await childRow.openDailyNoteModal()
    await noteModal.openTab('group')
    await noteModal.assertGroupNote('Ryhmälle viesti')
    await noteModal.close()

    childRow = group.childRow(childId2)
    noteModal = await childRow.openDailyNoteModal()
    await noteModal.openTab('group')
    await noteModal.assertGroupNote('Ryhmälle viesti')
    await noteModal.close()

    // Delete group note
    groupNoteModal = await group.openGroupDailyNoteModal()
    await groupNoteModal.deleteNote()
    await groupNoteModal.close()

    childRow = group.childRow(childId1)
    noteModal = await childRow.openDailyNoteModal()
    await noteModal.openTab('group')
    await noteModal.assertNoGroupNote()
    await noteModal.close()

    childRow = group.childRow(childId2)
    noteModal = await childRow.openDailyNoteModal()
    await noteModal.openTab('group')
    await noteModal.assertNoGroupNote()
  })
})
