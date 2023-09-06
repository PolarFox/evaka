// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import HelsinkiDateTime from 'lib-common/helsinki-date-time'

import { insertDaycareGroupFixtures, resetDatabase } from '../../dev-api'
import {
  AreaAndPersonFixtures,
  initializeAreaAndPersonData
} from '../../dev-api/data-init'
import { daycareGroupFixture, Fixture } from '../../dev-api/fixtures'
import CreateApplicationModal from '../../pages/employee/applications/create-application-modal'
import ChildInformationPage from '../../pages/employee/child-information'
import { Page } from '../../utils/page'
import { employeeLogin } from '../../utils/user'

let childInformationPage: ChildInformationPage

let fixtures: AreaAndPersonFixtures
let page: Page
let createApplicationModal: CreateApplicationModal
const now = HelsinkiDateTime.of(2023, 3, 15, 12, 0)

beforeEach(async () => {
  await resetDatabase()
  fixtures = await initializeAreaAndPersonData()
  await insertDaycareGroupFixtures([daycareGroupFixture])
  await Fixture.serviceNeedOption()
    .with({ validPlacementType: 'PRESCHOOL_DAYCARE', nameFi: 'vaka' })
    .save()
  await Fixture.serviceNeedOption()
    .with({ validPlacementType: 'PRESCHOOL_CLUB', nameFi: 'kerho' })
    .save()
  const admin = await Fixture.employeeAdmin().save()

  page = await Page.open({
    mockedTime: now.toSystemTzDate(),
    overrides: {
      featureFlags: {
        preschoolApplication: {
          serviceNeedOption: true
        }
      }
    }
  })
  await employeeLogin(page, admin.data)

  childInformationPage = new ChildInformationPage(page)
  await childInformationPage.navigateToChild(
    fixtures.enduserChildFixtureJari.id
  )

  const applications = await childInformationPage.openCollapsible(
    'applications'
  )
  createApplicationModal = await applications.openCreateApplicationModal()
})

describe('Employee - paper application', () => {
  test('Service worker fills preschool application with service need option enabled', async () => {
    await createApplicationModal.selectApplicationType('PRESCHOOL')
    const applicationEditPage = await createApplicationModal.submit()

    await applicationEditPage.fillStartDate(now.toLocalDate().format())
    await applicationEditPage.checkConnectedDaycare()
    await applicationEditPage.fillConnectedDaycarePreferredStartDate(
      now.toLocalDate().format()
    )
    await applicationEditPage.selectPreschoolPlacementType('PRESCHOOL_DAYCARE')
    await applicationEditPage.selectPreschoolServiceNeedOption('vaka')
    await applicationEditPage.pickUnit(fixtures.daycareFixture.name)
    await applicationEditPage.fillApplicantPhoneAndEmail(
      '123456',
      'email@evaka.test'
    )
    const applicationViewPage = await applicationEditPage.saveApplication()
    await applicationViewPage.waitUntilLoaded()
  })
})
