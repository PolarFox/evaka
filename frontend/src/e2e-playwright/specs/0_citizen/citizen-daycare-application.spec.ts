// SPDX-FileCopyrightText: 2017-2021 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { Page } from 'playwright'
import {
  execSimpleApplicationActions,
  getApplication,
  insertApplications,
  insertDaycarePlacementFixtures,
  resetDatabase,
  runPendingAsyncJobs
} from 'e2e-test-common/dev-api'
import {
  AreaAndPersonFixtures,
  initializeAreaAndPersonData
} from 'e2e-test-common/dev-api/data-init'
import { enduserLogin } from 'e2e-playwright/utils/user'
import {
  fullDaycareForm,
  minimalDaycareForm
} from 'e2e-playwright/utils/application-forms'
import { newBrowserContext } from '../../browser'
import CitizenHeader from '../../pages/citizen/citizen-header'
import CitizenApplicationsPage from '../../pages/citizen/citizen-applications'
import { applicationFixture, uuidv4 } from 'e2e-test-common/dev-api/fixtures'
import LocalDate from 'lib-common/local-date'

let page: Page
let header: CitizenHeader
let applicationsPage: CitizenApplicationsPage
let fixtures: AreaAndPersonFixtures

const testFileName = 'test_file.png'
const testFilePath = `src/e2e-playwright/assets/${testFileName}`
const mockedDate = LocalDate.of(2021, 4, 1)

beforeEach(async () => {
  await resetDatabase()
  fixtures = await initializeAreaAndPersonData()

  page = await (
    await newBrowserContext({ mockedTime: mockedDate.toSystemTzDate() })
  ).newPage()
  await enduserLogin(page)
  header = new CitizenHeader(page)
  applicationsPage = new CitizenApplicationsPage(page)
})

describe('Citizen daycare applications', () => {
  test('Sending incomplete daycare application gives validation error', async () => {
    await header.selectTab('applications')
    const editorPage = await applicationsPage.createApplication(
      fixtures.enduserChildFixtureJari.id,
      'DAYCARE'
    )
    await editorPage.goToVerification()
    await editorPage.assertErrorsExist()
  })

  test('Minimal valid daycare application can be sent', async () => {
    await header.selectTab('applications')
    const editorPage = await applicationsPage.createApplication(
      fixtures.enduserChildFixtureJari.id,
      'DAYCARE'
    )
    const applicationId = editorPage.getNewApplicationId()

    await editorPage.fillData(minimalDaycareForm.form)
    await editorPage.assertChildAddress('Kamreerintie 1, 00340 Espoo')
    await editorPage.verifyAndSend()

    const application = await getApplication(applicationId)
    minimalDaycareForm.validateResult(application, [
      fixtures.enduserChildFixtureKaarina
    ])
  })

  test('Full valid daycare application can be sent', async () => {
    await header.selectTab('applications')
    const editorPage = await applicationsPage.createApplication(
      fixtures.enduserChildFixtureJari.id,
      'DAYCARE'
    )
    const applicationId = editorPage.getNewApplicationId()

    await editorPage.fillData(fullDaycareForm.form)
    await editorPage.assertChildAddress('Kamreerintie 1, 00340 Espoo')
    await editorPage.verifyAndSend()

    const application = await getApplication(applicationId)
    fullDaycareForm.validateResult(application, [
      fixtures.enduserChildFixtureKaarina
    ])
  })

  test('Notification on duplicate application is visible', async () => {
    const application = applicationFixture(
      fixtures.enduserChildFixtureJari,
      fixtures.enduserGuardianFixture,
      undefined,
      'DAYCARE',
      null,
      [fixtures.daycareFixture.id],
      true
    )
    await insertApplications([application])
    await execSimpleApplicationActions(application.id, [
      'move-to-waiting-placement'
    ])
    await runPendingAsyncJobs()

    await header.selectTab('applications')
    await applicationsPage.assertDuplicateWarningIsShown(
      fixtures.enduserChildFixtureJari.id,
      'DAYCARE'
    )
  })

  test('Notification on transfer application is visible', async () => {
    await insertDaycarePlacementFixtures([
      {
        id: uuidv4(),
        type: 'DAYCARE',
        childId: fixtures.enduserChildFixtureJari.id,
        unitId: fixtures.daycareFixture.id,
        startDate: mockedDate.subYears(1).formatIso(),
        endDate: mockedDate.addYears(1).formatIso()
      }
    ])

    await header.selectTab('applications')
    await applicationsPage.assertTransferNotificationIsShown(
      fixtures.enduserChildFixtureJari.id,
      'DAYCARE'
    )
  })

  test('A warning is shown if preferred start date is very soon', async () => {
    await header.selectTab('applications')
    const editorPage = await applicationsPage.createApplication(
      fixtures.enduserChildFixtureJari.id,
      'DAYCARE'
    )

    await editorPage.fillData(minimalDaycareForm.form)
    await editorPage.setPreferredStartDate(mockedDate.format())
    await editorPage.assertPreferredStartDateWarningIsShown(true)
  })

  test('A validation error message is shown if preferred start date is not valid', async () => {
    await header.selectTab('applications')
    const editorPage = await applicationsPage.createApplication(
      fixtures.enduserChildFixtureJari.id,
      'DAYCARE'
    )

    await editorPage.setPreferredStartDate(mockedDate.addYears(2).format())
    await editorPage.assertPreferredStartDateInfo(
      'Aloituspäivä ei ole sallittu'
    )

    await editorPage.setPreferredStartDate(mockedDate.addMonths(4).format())
    await editorPage.assertPreferredStartDateInfo(undefined)
  })

  test('Citizen cannot move preferred start date before a previously selected date', async () => {
    await header.selectTab('applications')
    const editorPage = await applicationsPage.createApplication(
      fixtures.enduserChildFixtureJari.id,
      'DAYCARE'
    )
    const applicationId = editorPage.getNewApplicationId()
    await editorPage.fillData(minimalDaycareForm.form)
    await editorPage.verifyAndSend()

    await applicationsPage.editApplication(applicationId)
    await editorPage.setPreferredStartDate(mockedDate.subDays(1).format())
    await editorPage.assertPreferredStartDateInfo(
      'Aloituspäivä ei ole sallittu'
    )
  })

  test('Application can be made for restricted child', async () => {
    await header.selectTab('applications')
    const editorPage = await applicationsPage.createApplication(
      fixtures.enduserChildFixturePorriHatterRestricted.id,
      'DAYCARE'
    )
    await editorPage.fillData(minimalDaycareForm.form)
    await editorPage.assertChildAddress('')
    await editorPage.verifyAndSend()
  })

  test('Urgent application attachment can be uploaded and downloaded by citizen', async () => {
    await header.selectTab('applications')
    const editorPage = await applicationsPage.createApplication(
      fixtures.enduserChildFixturePorriHatterRestricted.id,
      'DAYCARE'
    )
    await editorPage.fillData(minimalDaycareForm.form)
    await editorPage.markApplicationUrgentAndAddAttachment(testFilePath)
    await editorPage.assertAttachmentUploaded(testFileName)
    await editorPage.goToVerification()
    await editorPage.assertUrgencyFileDownload(testFileName)
  })
})
