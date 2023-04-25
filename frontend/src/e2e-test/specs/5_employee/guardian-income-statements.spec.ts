// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import LocalDate from 'lib-common/local-date'
import type { UUID } from 'lib-common/types'

import config from '../../config'
import {
  insertDaycarePlacementFixtures,
  insertGuardianFixtures,
  insertIncomeStatements,
  resetDatabase
} from '../../dev-api'
import { initializeAreaAndPersonData } from '../../dev-api/data-init'
import {
  createDaycarePlacementFixture,
  daycareFixture,
  enduserGuardianFixture,
  Fixture,
  uuidv4
} from '../../dev-api/fixtures'
import type { PersonDetail } from '../../dev-api/types'
import GuardianInformationPage from '../../pages/employee/guardian-information'
import { Page } from '../../utils/page'
import { employeeLogin } from '../../utils/user'

let page: Page
let personId: UUID
let child: PersonDetail

beforeEach(async () => {
  await resetDatabase()

  const fixtures = await initializeAreaAndPersonData()
  personId = fixtures.enduserGuardianFixture.id
  child = fixtures.enduserChildFixturePorriHatterRestricted

  const financeAdmin = await Fixture.employeeFinanceAdmin().save()

  page = await Page.open()
  await employeeLogin(page, financeAdmin.data)
})

describe('Guardian income statements', () => {
  test("Shows placed child's income statements", async () => {
    const daycarePlacementFixture = createDaycarePlacementFixture(
      uuidv4(),
      child.id,
      daycareFixture.id
    )
    await insertDaycarePlacementFixtures([daycarePlacementFixture])

    await insertGuardianFixtures([
      {
        guardianId: enduserGuardianFixture.id,
        childId: child.id
      }
    ])

    await insertIncomeStatements(child.id, [
      {
        type: 'CHILD_INCOME',
        otherInfo: 'Test other info',
        startDate: LocalDate.todayInSystemTz(),
        endDate: LocalDate.todayInSystemTz(),
        attachmentIds: []
      }
    ])

    await page.goto(config.employeeUrl + '/profile/' + personId)
    const guardianPage = new GuardianInformationPage(page)
    await guardianPage.navigateToGuardian(enduserGuardianFixture.id)

    const incomesSection = guardianPage.getCollapsible('incomes')
    await incomesSection.assertIncomeStatementChildName(
      0,
      `${child.firstName} ${child.lastName}`
    )
    await incomesSection.assertIncomeStatementRowCount(1)
    const incomeStatementPage = await incomesSection.openIncomeStatement(0)
    await incomeStatementPage.assertChildIncomeStatement('Test other info', 0)
  })
})
