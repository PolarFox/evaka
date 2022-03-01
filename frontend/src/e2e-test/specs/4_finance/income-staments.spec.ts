// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import LocalDate from 'lib-common/local-date'

import config from '../../config'
import {
  insertGuardianFixtures,
  insertIncomeStatements,
  insertPersonFixture,
  resetDatabase
} from '../../dev-api'
import {
  enduserChildFixtureJari,
  enduserGuardianFixture,
  Fixture
} from '../../dev-api/fixtures'
import EmployeeNav from '../../pages/employee/employee-nav'
import {
  FinancePage,
  IncomeStatementsPage
} from '../../pages/employee/finance/finance-page'
import { waitUntilEqual, waitUntilFalse, waitUntilTrue } from '../../utils'
import { Page } from '../../utils/page'
import { employeeLogin } from '../../utils/user'

let page: Page
let nav: EmployeeNav

beforeEach(async () => {
  await resetDatabase()
  page = await Page.open({ acceptDownloads: true })

  await insertPersonFixture(enduserGuardianFixture)
  await insertPersonFixture(enduserChildFixtureJari)

  const financeAdmin = await Fixture.employeeFinanceAdmin().save()
  await employeeLogin(page, financeAdmin.data)

  await page.goto(config.employeeUrl)
  nav = new EmployeeNav(page)
})

async function navigateToIncomeStatements() {
  await nav.openTab('finance')
  await new FinancePage(page).selectIncomeStatementsTab()
  return new IncomeStatementsPage(page)
}

describe('Income statements', () => {
  test('Income statement can be set handled', async () => {
    await insertIncomeStatements(enduserGuardianFixture.id, [
      {
        type: 'HIGHEST_FEE',
        startDate: LocalDate.today().addYears(-1),
        endDate: LocalDate.today().addDays(-1)
      },
      {
        type: 'HIGHEST_FEE',
        startDate: LocalDate.today(),
        endDate: null
      }
    ])

    let incomeStatementsPage = await navigateToIncomeStatements()
    await waitUntilEqual(() => incomeStatementsPage.getRowCount(), 2)
    const personProfilePage =
      await incomeStatementsPage.openNthIncomeStatementForGuardian(1)

    const incomesSection = await personProfilePage.openCollapsible('incomes')
    await waitUntilFalse(() => incomesSection.isIncomeStatementHandled(0))
    await waitUntilFalse(() => incomesSection.isIncomeStatementHandled(1))

    const incomeStatementPage = await incomesSection.openIncomeStatement(0)

    await incomeStatementPage.typeHandlerNote('this is a note')
    await incomeStatementPage.setHandled(true)
    await incomeStatementPage.submit()

    await waitUntilTrue(() => incomesSection.isIncomeStatementHandled(0))
    await waitUntilFalse(() => incomesSection.isIncomeStatementHandled(1))

    await waitUntilTrue(async () =>
      (
        await incomesSection.getIncomeStatementInnerText(0)
      ).includes('this is a note')
    )

    incomeStatementsPage = await navigateToIncomeStatements()
    await waitUntilEqual(() => incomeStatementsPage.getRowCount(), 1)
  })

  test('Child income statement is listed on finance worker unhandled income statement list', async () => {
    await insertGuardianFixtures([
      {
        guardianId: enduserGuardianFixture.id,
        childId: enduserChildFixtureJari.id
      }
    ])

    await insertIncomeStatements(enduserChildFixtureJari.id, [
      {
        type: 'CHILD_INCOME',
        otherInfo: 'Test info',
        startDate: LocalDate.today(),
        endDate: LocalDate.today(),
        attachmentIds: []
      }
    ])

    const incomeStatementsPage = await navigateToIncomeStatements()
    await waitUntilEqual(() => incomeStatementsPage.getRowCount(), 1)
    await incomeStatementsPage.assertNthIncomeStatement(
      0,
      `${enduserChildFixtureJari.firstName} ${enduserChildFixtureJari.lastName}`,
      'lapsen tulotiedot'
    )

    const profilePage =
      await incomeStatementsPage.openNthIncomeStatementForChild(0)
    const incomeSection = await profilePage.openCollapsible('income')
    await incomeSection.assertIncomeStatementRowCount(1)
    const incomeStatementPage = await incomeSection.openIncomeStatement(0)
    await incomeStatementPage.assertChildIncomeStatement('Test info', 0)
  })
})
