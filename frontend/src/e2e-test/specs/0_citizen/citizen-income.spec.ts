// SPDX-FileCopyrightText: 2017-2023 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import LocalDate from 'lib-common/local-date'
import type { UUID } from 'lib-common/types'

import { resetDatabase } from '../../dev-api'
import type { DaycareBuilder, PersonBuilder } from '../../dev-api/fixtures'
import {
  careAreaFixture,
  daycareFixture,
  daycareGroupFixture,
  enduserChildFixtureJari,
  enduserGuardianFixture,
  Fixture,
  uuidv4
} from '../../dev-api/fixtures'
import CitizenCalendarPage from '../../pages/citizen/citizen-calendar'
import CitizenHeader from '../../pages/citizen/citizen-header'
import IncomeStatementsPage from '../../pages/citizen/citizen-income'
import { waitUntilEqual } from '../../utils'
import { Page } from '../../utils/page'
import { enduserLogin } from '../../utils/user'

describe('Citizen income (desktop)', () => {
  citizenIncomeTests('desktop')
})

describe('Citizen income (mobile)', () => {
  citizenIncomeTests('mobile')
})

function citizenIncomeTests(env: 'desktop' | 'mobile') {
  let page: Page
  const child = enduserChildFixtureJari
  let daycare: DaycareBuilder
  let guardian: PersonBuilder
  let financeAdminId: UUID

  const today = LocalDate.of(2022, 1, 5)
  const placementStart = today
  const placementEnd = placementStart.addYears(1)

  beforeEach(async () => {
    await resetDatabase()

    daycare = await Fixture.daycare()
      .with(daycareFixture)
      .with({ openingDate: placementStart.subYears(1).formatIso() })
      .careArea(await Fixture.careArea().with(careAreaFixture).save())
      .save()
    await Fixture.daycareGroup()
      .with(daycareGroupFixture)
      .daycare(daycare)
      .save()

    guardian = await Fixture.person().with(enduserGuardianFixture).save()
    const child1 = await Fixture.person().with(child).save()
    await Fixture.child(child1.data.id).save()
    await Fixture.guardian(child1, guardian).save()
    const placement = await Fixture.placement()
      .child(child1)
      .daycare(daycare)
      .with({
        startDate: placementStart.formatIso(),
        endDate: placementEnd.formatIso()
      })
      .save()

    const daycareGroup = await Fixture.daycareGroup()
      .with({
        daycareId: daycare.data.id,
        name: 'Group 1'
      })
      .save()

    await Fixture.groupPlacement()
      .with({
        startDate: placementStart.formatIso(),
        endDate: placementEnd.formatIso(),
        daycareGroupId: daycareGroup.data.id,
        daycarePlacementId: placement.data.id
      })
      .save()

    const financeAdmin = await Fixture.employeeFinanceAdmin().save()
    financeAdminId = financeAdmin.data.id

    const serviceNeedOption = await Fixture.serviceNeedOption()
      .with({
        feeCoefficient: 42.0
      })
      .save()

    await Fixture.serviceNeed()
      .with({
        id: uuidv4(),
        placementId: placement.data.id,
        startDate: placementStart.formatIso(),
        endDate: placementEnd.formatIso(),
        optionId: serviceNeedOption.data.id,
        shiftCare: false,
        confirmedBy: financeAdmin.data.id,
        confirmedAt: placementStart
      })
      .save()

    const viewport =
      env === 'mobile'
        ? { width: 375, height: 812 }
        : { width: 1920, height: 1080 }

    page = await Page.open({
      viewport,
      screen: viewport,
      mockedTime: today.toSystemTzDate()
    })
  })

  test('Citizen sees expiring income cta and it disappears if income statement is done', async () => {
    const incomeEndDate = today.addWeeks(4).subDays(1)
    await Fixture.income()
      .with({
        personId: guardian.data.id,
        validFrom: placementStart,
        validTo: incomeEndDate,
        updatedBy: financeAdminId,
        updatedAt: placementStart.toSystemTzDate()
      })
      .save()

    await enduserLogin(page)
    const header = new CitizenHeader(page, env)
    await header.selectTab('calendar')
    const calendar = new CitizenCalendarPage(page, 'desktop')
    await waitUntilEqual(
      () => calendar.getExpiringIncomeCtaContent(),
      'Muista päivittää tulotietosi 01.02.2022 mennessä'
    )
    await calendar.clickExpiringIncomeCta()

    const incomeStatementsPage = new IncomeStatementsPage(page)
    await incomeStatementsPage.createNewIncomeStatement()
    await incomeStatementsPage.setValidFromDate(today.format())
    await incomeStatementsPage.selectIncomeStatementType('highest-fee')
    await incomeStatementsPage.checkAssured()
    await incomeStatementsPage.submit()

    await waitUntilEqual(async () => await incomeStatementsPage.rows.count(), 1)
    await incomeStatementsPage.rows
      .only()
      .assertText((text) => text.includes(today.format()))

    await header.selectTab('calendar')
    await calendar.assertExpiringIncomeCtaNotVisible()
  })
}
