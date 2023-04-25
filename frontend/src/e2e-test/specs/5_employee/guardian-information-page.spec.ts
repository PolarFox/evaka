// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import LocalDate from 'lib-common/local-date'

import {
  deleteDaycareCostCenter,
  insertApplications,
  insertDaycareGroupFixtures,
  insertDaycarePlacementFixtures,
  insertDecisionFixtures,
  insertInvoiceFixtures,
  resetDatabase
} from '../../dev-api'
import type { AreaAndPersonFixtures } from '../../dev-api/data-init'
import { initializeAreaAndPersonData } from '../../dev-api/data-init'
import {
  applicationFixture,
  createDaycarePlacementFixture,
  daycareFixture,
  daycareGroupFixture,
  decisionFixture,
  enduserChildFixtureJari,
  enduserChildFixtureKaarina,
  enduserGuardianFixture,
  familyWithTwoGuardians,
  Fixture,
  invoiceFixture,
  uuidv4
} from '../../dev-api/fixtures'
import GuardianInformationPage from '../../pages/employee/guardian-information'
import { Page } from '../../utils/page'
import { employeeLogin } from '../../utils/user'

let fixtures: AreaAndPersonFixtures
let page: Page

beforeEach(async () => {
  await resetDatabase()
  fixtures = await initializeAreaAndPersonData()
  await insertDaycareGroupFixtures([daycareGroupFixture])

  const admin = await Fixture.employeeAdmin().save()

  const daycarePlacementFixture = createDaycarePlacementFixture(
    uuidv4(),
    fixtures.enduserChildFixtureJari.id,
    daycareFixture.id
  )
  const application = applicationFixture(
    enduserChildFixtureJari,
    enduserGuardianFixture
  )

  const application2 = {
    ...applicationFixture(
      enduserChildFixtureKaarina,
      familyWithTwoGuardians.guardian,
      enduserGuardianFixture
    ),
    id: uuidv4()
  }

  const startDate = '2021-08-16'
  await insertDaycarePlacementFixtures([daycarePlacementFixture])
  await insertApplications([application, application2])
  await insertDecisionFixtures([
    {
      ...decisionFixture(application.id, startDate, startDate),
      employeeId: admin.data.id
    },
    {
      ...decisionFixture(application2.id, startDate, startDate),
      employeeId: admin.data.id,
      id: uuidv4()
    }
  ])

  page = await Page.open()
  await employeeLogin(page, admin.data)
})

describe('Employee - Guardian Information', () => {
  test('guardian information is shown', async () => {
    const guardianPage = new GuardianInformationPage(page)
    await guardianPage.navigateToGuardian(fixtures.enduserGuardianFixture.id)

    const personInfoSection = guardianPage.getCollapsible('personInfo')
    await personInfoSection.assertPersonInfo(
      enduserGuardianFixture.lastName,
      enduserGuardianFixture.firstName,
      enduserGuardianFixture.ssn ?? ''
    )

    const expectedChildName = `${enduserChildFixtureJari.lastName} ${enduserChildFixtureJari.firstName}`
    const dependantsSection = await guardianPage.openCollapsible('dependants')
    await dependantsSection.assertContainsDependantChild(
      enduserChildFixtureJari.id
    )

    const applicationsSection = await guardianPage.openCollapsible(
      'applications'
    )
    await applicationsSection.assertApplicationCount(1)
    await applicationsSection.assertApplicationSummary(
      0,
      expectedChildName,
      daycareFixture.name
    )

    const decisionsSection = await guardianPage.openCollapsible('decisions')
    await decisionsSection.assertDecisionCount(2)
    await decisionsSection.assertDecision(
      0,
      expectedChildName,
      daycareFixture.name,
      'Odottaa vastausta'
    )

    await decisionsSection.assertDecision(
      1,
      `${enduserChildFixtureKaarina.lastName} ${enduserChildFixtureKaarina.firstName}`,
      daycareFixture.name,
      'Odottaa vastausta'
    )
  })

  test('Invoices are listed on the admin UI guardian page', async () => {
    await insertInvoiceFixtures([
      invoiceFixture(
        fixtures.enduserGuardianFixture.id,
        fixtures.enduserChildFixtureJari.id,
        fixtures.careAreaFixture.id,
        fixtures.daycareFixture.id,
        'DRAFT',
        LocalDate.of(2020, 1, 1),
        LocalDate.of(2020, 1, 31)
      )
    ])

    const guardianPage = new GuardianInformationPage(page)
    await guardianPage.navigateToGuardian(fixtures.enduserGuardianFixture.id)

    const invoiceSection = await guardianPage.openCollapsible('invoices')
    await invoiceSection.assertInvoiceCount(1)
    await invoiceSection.assertInvoice(0, '01.01.2020', '31.01.2020', 'Luonnos')
  })

  test('Invoice corrections show only units with cost center', async () => {
    await Fixture.fridgeChild()
      .with({
        headOfChild: fixtures.enduserGuardianFixture.id,
        childId: fixtures.enduserChildFixtureJari.id,
        startDate: LocalDate.of(2020, 1, 1),
        endDate: LocalDate.of(2020, 12, 31)
      })
      .save()

    const guardianPage = new GuardianInformationPage(page)
    await guardianPage.navigateToGuardian(fixtures.enduserGuardianFixture.id)

    const invoiceCorrectionsSection = await guardianPage.openCollapsible(
      'invoiceCorrections'
    )
    await invoiceCorrectionsSection.assertInvoiceCorrectionsCount(0)
    await invoiceCorrectionsSection.createInvoiceCorrection()
    await invoiceCorrectionsSection.clickAndAssertUnitVisibility(
      daycareFixture.name,
      true
    )

    await deleteDaycareCostCenter(daycareFixture.id)
    await guardianPage.navigateToGuardian(fixtures.enduserGuardianFixture.id)
    await guardianPage.openCollapsible('invoiceCorrections')
    await invoiceCorrectionsSection.assertInvoiceCorrectionsCount(0)
    await invoiceCorrectionsSection.createInvoiceCorrection()
    await invoiceCorrectionsSection.clickAndAssertUnitVisibility(
      daycareFixture.name,
      false
    )
  })
})
