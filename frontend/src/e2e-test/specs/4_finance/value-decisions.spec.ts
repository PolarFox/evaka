// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { DecisionIncome } from 'lib-common/api-types/income'
import HelsinkiDateTime from 'lib-common/helsinki-date-time'

import config from '../../config'
import {
  insertGuardianFixtures,
  insertVoucherValueDecisionFixtures,
  resetDatabase,
  runPendingAsyncJobs
} from '../../dev-api'
import { initializeAreaAndPersonData } from '../../dev-api/data-init'
import {
  careArea2Fixture,
  daycare2Fixture,
  daycareFixture,
  DecisionIncomeFixture,
  enduserChildFixtureJari,
  enduserChildFixtureKaarina,
  enduserGuardianFixture,
  familyWithTwoGuardians,
  Fixture,
  voucherValueDecisionsFixture
} from '../../dev-api/fixtures'
import EmployeeNav from '../../pages/employee/employee-nav'
import {
  FinancePage,
  ValueDecisionsPage
} from '../../pages/employee/finance/finance-page'
import { waitUntilEqual } from '../../utils'
import { Page } from '../../utils/page'
import { employeeLogin } from '../../utils/user'

const now = HelsinkiDateTime.of(2020, 1, 1, 15, 0)

let page: Page
let valueDecisionsPage: ValueDecisionsPage
const decision1DateFrom = now.toLocalDate().subWeeks(1)
const decision1DateTo = now.toLocalDate().addWeeks(2)
const decision2DateFrom = now.toLocalDate()
const decision2DateTo = now.toLocalDate().addWeeks(5)

beforeEach(async () => {
  await resetDatabase()
  await initializeAreaAndPersonData()
  const careArea = await Fixture.careArea().with(careArea2Fixture).save()
  await Fixture.daycare().with(daycare2Fixture).careArea(careArea).save()
})

const insertTwoValueDecisionsFixturesAndNavigateToValueDecisions = async () => {
  await insertVoucherValueDecisionFixtures([
    voucherValueDecisionsFixture(
      'e2d75fa4-7359-406b-81b8-1703785ca649',
      enduserGuardianFixture.id,
      enduserChildFixtureKaarina.id,
      daycareFixture.id,
      null,
      'DRAFT',
      decision1DateFrom,
      decision1DateTo
    ),
    voucherValueDecisionsFixture(
      'ed462aca-f74e-4384-910f-628823201023',
      enduserGuardianFixture.id,
      enduserChildFixtureJari.id,
      daycare2Fixture.id,
      null,
      'DRAFT',
      decision2DateFrom,
      decision2DateTo
    )
  ])
  await new EmployeeNav(page).openTab('finance')
  valueDecisionsPage = await new FinancePage(page).selectValueDecisionsTab()
}

const insertValueDecisionWithPartnerFixtureAndNavigateToValueDecisions = async (
  childIncome: DecisionIncome | null = null
) => {
  const decision = voucherValueDecisionsFixture(
    'e2d75fa4-7359-406b-81b8-1703785ca649',
    familyWithTwoGuardians.guardian.id,
    familyWithTwoGuardians.children[0].id,
    daycareFixture.id,
    familyWithTwoGuardians.otherGuardian,
    'DRAFT',
    decision1DateFrom,
    decision1DateTo
  )

  await insertVoucherValueDecisionFixtures([
    {
      ...decision,
      childIncome
    }
  ])
  await new EmployeeNav(page).openTab('finance')
  valueDecisionsPage = await new FinancePage(page).selectValueDecisionsTab()
}

describe('Value decisions', () => {
  beforeEach(async () => {
    page = await Page.open({
      acceptDownloads: true,
      mockedTime: now.toSystemTzDate()
    })

    const financeAdmin = await Fixture.employeeFinanceAdmin().save()
    await employeeLogin(page, financeAdmin.data)
    await page.goto(config.employeeUrl)
  })

  test('Date filter filters out decisions', async () => {
    await insertTwoValueDecisionsFixturesAndNavigateToValueDecisions()

    await valueDecisionsPage.setDates(
      decision1DateFrom.subDays(1),
      decision2DateTo.addDays(1)
    )
    await waitUntilEqual(() => valueDecisionsPage.getValueDecisionCount(), 2)

    await valueDecisionsPage.setDates(
      decision1DateTo.addDays(1),
      decision2DateTo.addDays(1)
    )
    await waitUntilEqual(() => valueDecisionsPage.getValueDecisionCount(), 1)
  })

  test('With two decisions any date filter overlap will show the decision', async () => {
    await insertTwoValueDecisionsFixturesAndNavigateToValueDecisions()

    await valueDecisionsPage.setDates(
      decision1DateTo.subDays(1),
      decision2DateTo.subDays(1)
    )
    await waitUntilEqual(() => valueDecisionsPage.getValueDecisionCount(), 2)
  })

  test('Start date checkbox will filter out decisions that do not have a startdate within the date range', async () => {
    await insertTwoValueDecisionsFixturesAndNavigateToValueDecisions()

    await valueDecisionsPage.setDates(
      decision2DateFrom.subDays(1),
      decision2DateTo.subDays(1)
    )
    await waitUntilEqual(() => valueDecisionsPage.getValueDecisionCount(), 2)
    await valueDecisionsPage.startDateWithinRange()
    await waitUntilEqual(() => valueDecisionsPage.getValueDecisionCount(), 1)
  })

  test('Navigate to the decision details page', async () => {
    await insertTwoValueDecisionsFixturesAndNavigateToValueDecisions()

    await valueDecisionsPage.openFirstValueDecision()
  })

  test('Send value decision from details page', async () => {
    await insertTwoValueDecisionsFixturesAndNavigateToValueDecisions()

    const valueDecisionDetailsPage =
      await valueDecisionsPage.openFirstValueDecision()
    await valueDecisionDetailsPage.sendValueDecision()
    await runPendingAsyncJobs(now)
    await valueDecisionsPage.assertSentDecisionsCount(1)
  })

  test('Voucher value decisions are toggled and sent', async () => {
    await insertTwoValueDecisionsFixturesAndNavigateToValueDecisions()
    await valueDecisionsPage.toggleAllValueDecisions()
    await valueDecisionsPage.sendValueDecisions(now)
    await valueDecisionsPage.assertSentDecisionsCount(2)
  })

  test('Partner is shown for elementary family', async () => {
    await insertGuardianFixtures([
      {
        guardianId: familyWithTwoGuardians.guardian.id,
        childId: familyWithTwoGuardians.children[0].id
      },
      {
        guardianId: familyWithTwoGuardians.otherGuardian.id,
        childId: familyWithTwoGuardians.children[0].id
      }
    ])
    await insertValueDecisionWithPartnerFixtureAndNavigateToValueDecisions()

    const valueDecisionDetailsPage =
      await valueDecisionsPage.openFirstValueDecision()
    await valueDecisionDetailsPage.assertPartnerName(
      `${familyWithTwoGuardians.otherGuardian.firstName} ${familyWithTwoGuardians.otherGuardian.lastName}`
    )
  })

  test('Partner is not shown for non elementary family', async () => {
    await insertGuardianFixtures([
      {
        guardianId: familyWithTwoGuardians.guardian.id,
        childId: familyWithTwoGuardians.children[0].id
      }
    ])
    await insertValueDecisionWithPartnerFixtureAndNavigateToValueDecisions()

    const valueDecisionDetailsPage =
      await valueDecisionsPage.openFirstValueDecision()
    await valueDecisionDetailsPage.assertPartnerNameNotShown()
  })

  test('Child income is shown', async () => {
    await insertGuardianFixtures([
      {
        guardianId: familyWithTwoGuardians.guardian.id,
        childId: familyWithTwoGuardians.children[0].id
      }
    ])
    await insertValueDecisionWithPartnerFixtureAndNavigateToValueDecisions(
      DecisionIncomeFixture(54321)
    )

    const valueDecisionDetailsPage =
      await valueDecisionsPage.openFirstValueDecision()
    await valueDecisionDetailsPage.assertChildIncome(0, '543,21 €')
  })
})

describe('Value decisions with finance decision handler select enabled', () => {
  beforeEach(async () => {
    page = await Page.open({
      acceptDownloads: true,
      overrides: {
        featureFlags: {
          financeDecisionHandlerSelect: true
        }
      },
      mockedTime: now.toSystemTzDate()
    })

    const financeAdmin = await Fixture.employeeFinanceAdmin().save()
    await employeeLogin(page, financeAdmin.data)
    await page.goto(config.employeeUrl)
  })

  test('Voucher value decisions are toggled and cancelled', async () => {
    await insertTwoValueDecisionsFixturesAndNavigateToValueDecisions()
    await valueDecisionsPage.toggleAllValueDecisions()
    const modal = await valueDecisionsPage.openDecisionHandlerModal()
    await modal.rejectDecisionHandlerModal(now)
    await valueDecisionsPage.assertSentDecisionsCount(0)
  })

  test('Voucher value decisions are toggled and sent without selecting decision handler', async () => {
    await insertTwoValueDecisionsFixturesAndNavigateToValueDecisions()
    await valueDecisionsPage.toggleAllValueDecisions()
    const modal = await valueDecisionsPage.openDecisionHandlerModal()
    await modal.resolveDecisionHandlerModal(now)
    await valueDecisionsPage.assertSentDecisionsCount(2)
    const valueDecisionDetailsPage =
      await valueDecisionsPage.openFirstValueDecision()
    await valueDecisionDetailsPage.assertDecisionHandler('Lasse Laskuttaja')
  })

  test('Voucher value decisions are toggled and sent with selecting decision handler', async () => {
    await insertTwoValueDecisionsFixturesAndNavigateToValueDecisions()
    const { data: otherFinanceAdmin } = await Fixture.employeeFinanceAdmin()
      .with({
        email: 'laura.laskuttaja@evaka.test',
        firstName: 'Laura',
        lastName: 'Laskuttaja'
      })
      .save()
    await valueDecisionsPage.toggleAllValueDecisions()
    const modal = await valueDecisionsPage.openDecisionHandlerModal()
    await modal.selectDecisionHandler(otherFinanceAdmin.id)
    await modal.resolveDecisionHandlerModal(now)
    await valueDecisionsPage.assertSentDecisionsCount(2)
    const valueDecisionDetailsPage =
      await valueDecisionsPage.openFirstValueDecision()
    await valueDecisionDetailsPage.assertDecisionHandler('Laura Laskuttaja')
  })

  test('Voucher value decision is sent without selecting decision handler', async () => {
    await insertTwoValueDecisionsFixturesAndNavigateToValueDecisions()
    const valueDecisionDetailsPageDraft =
      await valueDecisionsPage.openFirstValueDecision()
    const modal = await valueDecisionDetailsPageDraft.openDecisionHandlerModal()
    await modal.resolveDecisionHandlerModal(now)
    await valueDecisionDetailsPageDraft.assertDecisionHandler(
      'Lasse Laskuttaja'
    )
    await valueDecisionsPage.assertSentDecisionsCount(1)
    const valueDecisionDetailsPageSent =
      await valueDecisionsPage.openFirstValueDecision()
    await valueDecisionDetailsPageSent.assertDecisionHandler('Lasse Laskuttaja')
  })

  test('Voucher value decision is sent with selecting decision handler', async () => {
    await insertTwoValueDecisionsFixturesAndNavigateToValueDecisions()
    const { data: otherFinanceAdmin } = await Fixture.employeeFinanceAdmin()
      .with({
        email: 'laura.laskuttaja@evaka.test',
        firstName: 'Laura',
        lastName: 'Laskuttaja'
      })
      .save()
    const valueDecisionDetailsPageDraft =
      await valueDecisionsPage.openFirstValueDecision()
    const modal = await valueDecisionDetailsPageDraft.openDecisionHandlerModal()
    await modal.selectDecisionHandler(otherFinanceAdmin.id)
    await modal.resolveDecisionHandlerModal(now)
    await valueDecisionDetailsPageDraft.assertDecisionHandler(
      'Laura Laskuttaja'
    )
    await valueDecisionsPage.assertSentDecisionsCount(1)
    const valueDecisionDetailsPageSent =
      await valueDecisionsPage.openFirstValueDecision()
    await valueDecisionDetailsPageSent.assertDecisionHandler('Laura Laskuttaja')
  })
})
