// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import DateRange from 'lib-common/date-range'
import type { FeeDecision } from 'lib-common/generated/api-types/invoicing'
import LocalDate from 'lib-common/local-date'

import config from '../../config'
import {
  insertDaycarePlacementFixtures,
  insertFeeDecisionFixtures,
  insertInvoiceFixtures,
  insertParentshipFixtures,
  insertPersonFixture,
  resetDatabase
} from '../../dev-api'
import type { AreaAndPersonFixtures } from '../../dev-api/data-init'
import { initializeAreaAndPersonData } from '../../dev-api/data-init'
import {
  adultFixtureWihtoutSSN,
  createDaycarePlacementFixture,
  feeDecisionsFixture,
  Fixture,
  invoiceFixture,
  uuidv4
} from '../../dev-api/fixtures'
import EmployeeNav from '../../pages/employee/employee-nav'
import type { InvoicesPage } from '../../pages/employee/finance/finance-page'
import { FinancePage } from '../../pages/employee/finance/finance-page'
import { Page } from '../../utils/page'
import { employeeLogin } from '../../utils/user'

let page: Page
let financePage: FinancePage
let invoicesPage: InvoicesPage
let fixtures: AreaAndPersonFixtures
let feeDecisionFixture: FeeDecision
const adultWithoutSSN = adultFixtureWihtoutSSN

beforeEach(async () => {
  await resetDatabase()
  fixtures = await initializeAreaAndPersonData()
  await insertPersonFixture(adultWithoutSSN)
  await insertParentshipFixtures([
    {
      childId: fixtures.enduserChildFixtureKaarina.id,
      headOfChildId: fixtures.enduserGuardianFixture.id,
      startDate: fixtures.enduserChildFixtureKaarina.dateOfBirth,
      endDate: '2099-01-01'
    }
  ])

  feeDecisionFixture = feeDecisionsFixture(
    'SENT',
    fixtures.enduserGuardianFixture,
    fixtures.enduserChildFixtureKaarina,
    fixtures.daycareFixture.id,
    null,
    new DateRange(
      LocalDate.todayInSystemTz().subMonths(1).withDate(1),
      LocalDate.todayInSystemTz().withDate(1).subDays(1)
    )
  )
  await insertFeeDecisionFixtures([feeDecisionFixture])
  await insertDaycarePlacementFixtures([
    createDaycarePlacementFixture(
      uuidv4(),
      fixtures.enduserChildFixtureKaarina.id,
      fixtures.daycareFixture.id,
      feeDecisionFixture.validDuring.start.formatIso(),
      feeDecisionFixture.validDuring.end?.formatIso()
    )
  ])

  await Fixture.feeThresholds().save()

  page = await Page.open({ acceptDownloads: true })

  const financeAdmin = await Fixture.employeeFinanceAdmin().save()
  await employeeLogin(page, financeAdmin.data)

  await page.goto(config.employeeUrl)
  const nav = new EmployeeNav(page)
  await nav.openTab('finance')
  financePage = new FinancePage(page)
  invoicesPage = await financePage.selectInvoicesTab()
})

describe('Invoices', () => {
  test('List of invoice drafts is empty intially and after creating new drafts the list has one invoice', async () => {
    await invoicesPage.assertInvoiceCount(0)
    await invoicesPage.createInvoiceDrafts()
    await invoicesPage.assertInvoiceCount(1)
  })

  test('Navigate to and from invoice page', async () => {
    await invoicesPage.createInvoiceDrafts()
    await invoicesPage.openFirstInvoice()
    await invoicesPage.assertInvoiceHeadOfFamily(
      `${fixtures.enduserGuardianFixture.firstName} ${fixtures.enduserGuardianFixture.lastName}`
    )
    await invoicesPage.navigateBackToInvoices()
  })

  test('Add a new invoice row, modify its amount and price and persist the changes', async () => {
    await invoicesPage.createInvoiceDrafts()
    await invoicesPage.openFirstInvoice()
    await invoicesPage.assertInvoiceRowCount(1)
    await invoicesPage.addNewInvoiceRow(
      'DAYCARE_INCREASE',
      fixtures.daycareFixture.name,
      10,
      100
    )
    await invoicesPage.navigateBackToInvoices()
    const originalInvoiceTotal = feeDecisionFixture.children.reduce(
      (sum, { finalFee }) => sum + finalFee / 100,
      0
    )
    await invoicesPage.assertInvoiceTotal(originalInvoiceTotal + 10 * 100)
  })

  test('Delete an invoice row', async () => {
    await invoicesPage.createInvoiceDrafts()
    await invoicesPage.openFirstInvoice()
    await invoicesPage.assertInvoiceRowCount(1)
    await invoicesPage.deleteInvoiceRow(0)
    await invoicesPage.assertInvoiceRowCount(0)
  })

  test('Invoices are toggled and sent', async () => {
    await insertInvoiceFixtures([
      invoiceFixture(
        fixtures.enduserGuardianFixture.id,
        fixtures.enduserChildFixtureJari.id,
        fixtures.careAreaFixture.id,
        fixtures.daycareFixture.id,
        'DRAFT'
      ),
      invoiceFixture(
        fixtures.familyWithRestrictedDetailsGuardian.guardian.id,
        fixtures.familyWithRestrictedDetailsGuardian.children[0].id,
        fixtures.careAreaFixture.id,
        fixtures.daycareFixture.id,
        'DRAFT'
      )
    ])
    // switch tabs to refresh data
    await financePage.selectFeeDecisionsTab()
    await financePage.selectInvoicesTab()

    await invoicesPage.toggleAllInvoices(true)
    await invoicesPage.assertInvoiceCount(2)
    await invoicesPage.sendInvoices()
    await invoicesPage.assertInvoiceCount(0)
    await invoicesPage.showSentInvoices()
    await invoicesPage.assertInvoiceCount(2)
  })

  test('Sending an invoice with a recipient without a SSN', async () => {
    await insertInvoiceFixtures([
      invoiceFixture(
        adultWithoutSSN.id,
        fixtures.enduserChildFixtureJari.id,
        fixtures.careAreaFixture.id,
        fixtures.daycareFixture.id,
        'DRAFT'
      )
    ])

    await invoicesPage.freeTextFilter(adultFixtureWihtoutSSN.firstName)
    await invoicesPage.assertInvoiceCount(1)
    await invoicesPage.toggleAllInvoices(true)
    await invoicesPage.sendInvoices()
    await invoicesPage.assertInvoiceCount(0)
    await invoicesPage.showWaitingForSendingInvoices()
    await invoicesPage.assertInvoiceCount(1)
    await invoicesPage.openFirstInvoice()
    await invoicesPage.markInvoiceSent()
    await invoicesPage.navigateBackToInvoices()
    await invoicesPage.showSentInvoices()
    await invoicesPage.assertInvoiceCount(1)
  })
})
