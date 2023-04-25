// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import LocalDate from 'lib-common/local-date'

import {
  insertDaycarePlacementFixtures,
  insertPedagogicalDocumentAttachment,
  resetDatabase
} from '../../dev-api'
import type { AreaAndPersonFixtures } from '../../dev-api/data-init'
import {
  addConsentsForChildren,
  initializeAreaAndPersonData
} from '../../dev-api/data-init'
import {
  createDaycarePlacementFixture,
  Fixture,
  uuidv4
} from '../../dev-api/fixtures'
import { CitizenChildPage } from '../../pages/citizen/citizen-children'
import CitizenHeader from '../../pages/citizen/citizen-header'
import CitizenPedagogicalDocumentsPage from '../../pages/citizen/citizen-pedagogical-documents'
import { Page } from '../../utils/page'
import { enduserLogin } from '../../utils/user'

let fixtures: AreaAndPersonFixtures
let page: Page
let header: CitizenHeader
let pedagogicalDocumentsPage: CitizenPedagogicalDocumentsPage

const testFileName = 'test_file.png'
const testFilePath = `src/e2e-test/assets`

beforeEach(async () => {
  await resetDatabase()
  fixtures = await initializeAreaAndPersonData()

  await insertDaycarePlacementFixtures([
    createDaycarePlacementFixture(
      uuidv4(),
      fixtures.enduserChildFixtureJari.id,
      fixtures.daycareFixture.id
    )
  ])

  await addConsentsForChildren(
    [
      fixtures.enduserChildFixtureJari.id,
      fixtures.enduserChildFixtureKaarina.id,
      fixtures.enduserChildFixturePorriHatterRestricted.id
    ],
    fixtures.enduserGuardianFixture.id
  )

  page = await Page.open()
  await enduserLogin(page)
  header = new CitizenHeader(page)
  pedagogicalDocumentsPage = new CitizenPedagogicalDocumentsPage(page)
})

describe('Citizen pedagogical documents', () => {
  describe('Citizen main page pedagogical documents header', () => {
    test('Number of unread pedagogical documents is shown correctly', async () => {
      await page.reload()
      await header.assertUnreadChildrenCount(0)

      const pd = await Fixture.pedagogicalDocument()
        .with({
          childId: fixtures.enduserChildFixtureJari.id,
          description: 'e2e test description'
        })
        .save()

      const employee = await Fixture.employee()
        .with({ roles: ['ADMIN'] })
        .save()
      const attachmentId = await insertPedagogicalDocumentAttachment(
        pd.data.id,
        employee.data.id,
        testFileName,
        testFilePath
      )

      await page.reload()
      await header.assertUnreadChildrenCount(1)

      await header.openChildPage(fixtures.enduserChildFixtureJari.id)
      const childPage = new CitizenChildPage(page)
      await childPage.openCollapsible('pedagogical-documents')

      await pedagogicalDocumentsPage.downloadAttachment(attachmentId)
      await header.assertUnreadChildrenCount(0)
    })
  })

  describe('Pedagogical documents view', () => {
    test('Existing pedagogical document without attachment is shown', async () => {
      const pd = await Fixture.pedagogicalDocument()
        .with({
          childId: fixtures.enduserChildFixtureJari.id,
          description: 'e2e test description'
        })
        .save()

      await header.openChildPage(fixtures.enduserChildFixtureJari.id)
      const childPage = new CitizenChildPage(page)
      await childPage.openCollapsible('pedagogical-documents')

      await pedagogicalDocumentsPage.assertPedagogicalDocumentExists(
        pd.data.id,
        LocalDate.todayInSystemTz().format(),
        pd.data.description
      )
    })
  })
})
