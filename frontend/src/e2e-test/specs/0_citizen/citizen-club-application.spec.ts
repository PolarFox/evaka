// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import LocalDate from 'lib-common/local-date'

import { getApplication, resetDatabase } from '../../dev-api'
import type { AreaAndPersonFixtures } from '../../dev-api/data-init'
import { initializeAreaAndPersonData } from '../../dev-api/data-init'
import CitizenApplicationsPage from '../../pages/citizen/citizen-applications'
import CitizenHeader from '../../pages/citizen/citizen-header'
import { fullClubForm, minimalClubForm } from '../../utils/application-forms'
import { Page } from '../../utils/page'
import { enduserLogin } from '../../utils/user'

let page: Page
let header: CitizenHeader
let applicationsPage: CitizenApplicationsPage
let fixtures: AreaAndPersonFixtures

const mockedDate = LocalDate.of(2021, 3, 1)

beforeEach(async () => {
  await resetDatabase()
  fixtures = await initializeAreaAndPersonData()

  page = await Page.open({ mockedTime: mockedDate.toSystemTzDate() })
  await enduserLogin(page)
  header = new CitizenHeader(page)
  applicationsPage = new CitizenApplicationsPage(page)
})

describe('Citizen club applications', () => {
  test('Sending incomplete club application gives validation error', async () => {
    await header.selectTab('applications')
    const editorPage = await applicationsPage.createApplication(
      fixtures.enduserChildFixtureJari.id,
      'CLUB'
    )
    await editorPage.goToVerification()
    await editorPage.assertErrorsExist()
  })

  test('Minimal valid club application can be sent', async () => {
    await header.selectTab('applications')
    const editorPage = await applicationsPage.createApplication(
      fixtures.enduserChildFixtureJari.id,
      'CLUB'
    )
    const applicationId = editorPage.getNewApplicationId()

    await editorPage.fillData(minimalClubForm.form)
    await editorPage.verifyAndSend()

    const application = await getApplication(applicationId)
    minimalClubForm.validateResult(application)
  })

  test('Full valid club application can be sent', async () => {
    await header.selectTab('applications')
    const editorPage = await applicationsPage.createApplication(
      fixtures.enduserChildFixtureJari.id,
      'CLUB'
    )
    const applicationId = editorPage.getNewApplicationId()

    await editorPage.fillData(fullClubForm.form)
    await editorPage.verifyAndSend()

    const application = await getApplication(applicationId)
    fullClubForm.validateResult(application)
  })
})
