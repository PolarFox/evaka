// SPDX-FileCopyrightText: 2017-2021 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import LocalDate from 'lib-common/local-date'
import {
  insertDaycarePlacementFixtures,
  insertPedagogicalDocumentAttachment,
  resetDatabase
} from '../../../e2e-test-common/dev-api'
import CitizenHeader from '../../pages/citizen/citizen-header'
import { enduserLogin } from '../../utils/user'
import CitizenPedagogicalDocumentsPage from '../../pages/citizen/citizen-pedagogical-documents'
import {
  createDaycarePlacementFixture,
  Fixture,
  uuidv4
} from '../../../e2e-test-common/dev-api/fixtures'
import {
  AreaAndPersonFixtures,
  initializeAreaAndPersonData
} from '../../../e2e-test-common/dev-api/data-init'
import { Page } from '../../utils/page'

let fixtures: AreaAndPersonFixtures
let page: Page
let header: CitizenHeader
let pedagogicalDocumentsPage: CitizenPedagogicalDocumentsPage

const testFileName = 'test_file.png'
const testFilePath = `src/e2e-playwright/assets`

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

  page = await Page.open()
  await enduserLogin(page)
  header = new CitizenHeader(page)
  pedagogicalDocumentsPage = new CitizenPedagogicalDocumentsPage(page)
})

describe('Citizen pedagogical documents', () => {
  describe('Citizen main page pedagogical documents header', () => {
    test('Number of unread pedagogical documents is show correctly', async () => {
      await page.reload()
      await pedagogicalDocumentsPage.assertUnreadPedagogicalDocumentIndicatorIsNotShown()

      const pd = await Fixture.pedagogicalDocument()
        .with({
          childId: fixtures.enduserChildFixtureJari.id,
          description: 'e2e test description'
        })
        .save()

      const employee = await Fixture.employee()
        .with({ roles: ['ADMIN'] })
        .save()
      await insertPedagogicalDocumentAttachment(
        pd.data.id,
        employee.data.id,
        testFileName,
        testFilePath
      )

      await page.reload()
      await pedagogicalDocumentsPage.assertUnreadPedagogicalDocumentIndicatorCount(
        1
      )

      await header.selectTab('pedagogical-documents')

      await pedagogicalDocumentsPage.downloadAttachment(pd.data.id)

      await pedagogicalDocumentsPage.assertUnreadPedagogicalDocumentIndicatorIsNotShown()
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

      await header.selectTab('pedagogical-documents')

      await pedagogicalDocumentsPage.assertPedagogicalDocumentExists(
        pd.data.id,
        LocalDate.today().format(),
        pd.data.description
      )
    })

    test('Childrens names are not shown if only documents for one child exist', async () => {
      const pd = await Fixture.pedagogicalDocument()
        .with({
          childId: fixtures.enduserChildFixtureJari.id,
          description: 'e2e test description'
        })
        .save()

      await header.selectTab('pedagogical-documents')

      await pedagogicalDocumentsPage.assertChildNameIsNotShown(pd.data.id)
    })

    test('Childrens names are shown if documents for more than one child exist', async () => {
      const pd = await Fixture.pedagogicalDocument()
        .with({
          childId: fixtures.enduserChildFixtureJari.id,
          description: 'e2e test description'
        })
        .save()
      const pd2 = await Fixture.pedagogicalDocument()
        .with({
          childId: fixtures.enduserChildFixtureKaarina.id,
          description: 'e2e test description too'
        })
        .save()

      await header.selectTab('pedagogical-documents')

      await pedagogicalDocumentsPage.assertChildNameIsShown(pd.data.id)
      await pedagogicalDocumentsPage.assertChildNameIsShown(pd2.data.id)
    })

    test('Childrens preferred names are shown if known', async () => {
      const pd = await Fixture.pedagogicalDocument()
        .with({
          childId: fixtures.enduserChildFixtureJari.id,
          description: 'e2e test description'
        })
        .save()
      const pd2 = await Fixture.pedagogicalDocument()
        .with({
          childId: fixtures.enduserChildFixtureKaarina.id,
          description: 'e2e test description too'
        })
        .save()

      await header.selectTab('pedagogical-documents')

      // Jari has a preferred name
      await pedagogicalDocumentsPage.assertChildNameIs(pd.data.id, 'Jari')
      // Kaarina does not have any preferred name
      await pedagogicalDocumentsPage.assertChildNameIs(
        pd2.data.id,
        'Kaarina Veera Nelli'
      )
    })
  })
})
