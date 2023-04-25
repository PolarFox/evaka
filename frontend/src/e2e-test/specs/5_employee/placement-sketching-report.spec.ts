// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import LocalDate from 'lib-common/local-date'

import config from '../../config'
import {
  insertApplications,
  insertDaycarePlacementFixtures,
  resetDatabase
} from '../../dev-api'
import type { AreaAndPersonFixtures } from '../../dev-api/data-init'
import { initializeAreaAndPersonData } from '../../dev-api/data-init'
import {
  applicationFixture,
  createDaycarePlacementFixture,
  daycareFixture,
  Fixture,
  uuidv4
} from '../../dev-api/fixtures'
import type { Application } from '../../dev-api/types'
import ReportsPage from '../../pages/employee/reports'
import { Page } from '../../utils/page'
import { employeeLogin } from '../../utils/user'

let fixtures: AreaAndPersonFixtures
let page: Page

const mockToday = LocalDate.of(2021, 2, 1)

beforeEach(async () => {
  await resetDatabase()
  fixtures = await initializeAreaAndPersonData()
  const admin = (await Fixture.employeeAdmin().save()).data

  page = await Page.open({ mockedTime: mockToday.toSystemTzDate() })
  await employeeLogin(page, admin)
})

async function openPlacementSketchingReport() {
  await page.goto(config.employeeUrl + '/reports')
  const reports = new ReportsPage(page)
  return await reports.openPlacementSketchingReport()
}

describe('Placement sketching report', () => {
  test('Not placed child shows on report', async () => {
    const fixture = applicationFixture(
      fixtures.enduserChildFixtureJari,
      fixtures.enduserGuardianFixture,
      undefined,
      'PRESCHOOL',
      'AGREED'
    )

    const preferredStartDate = LocalDate.of(2021, 8, 13)
    const sentDate = preferredStartDate.subMonths(4)
    const applicationId = uuidv4()

    const createdApplication: Application = {
      ...fixture,
      form: {
        ...fixture.form,
        preferences: {
          ...fixture.form.preferences,
          preferredStartDate
        }
      },
      sentDate: sentDate.formatIso(),
      status: 'SENT',
      id: applicationId
    }

    await insertApplications([createdApplication])

    const preferredUnit = daycareFixture

    const report = await openPlacementSketchingReport()
    await report.assertRow(
      createdApplication.id,
      preferredUnit.name,
      `${fixtures.enduserChildFixtureJari.lastName} ${fixtures.enduserChildFixtureJari.firstName}`
    )
  })

  test('Placed child shows on report', async () => {
    const fixture = applicationFixture(
      fixtures.enduserChildFixtureJari,
      fixtures.enduserGuardianFixture,
      undefined,
      'PRESCHOOL',
      'AGREED'
    )

    const preferredStartDate = LocalDate.of(2021, 8, 13)
    const sentDate = preferredStartDate.subMonths(4)
    const applicationId = uuidv4()

    const createdApplication: Application = {
      ...fixture,
      form: {
        ...fixture.form,
        preferences: {
          ...fixture.form.preferences,
          preferredStartDate
        }
      },
      sentDate: sentDate.formatIso(),
      status: 'SENT',
      id: applicationId
    }

    await insertApplications([createdApplication])

    const placementStartDate = LocalDate.of(2021, 1, 1)
    const preferredUnit = daycareFixture
    const currentUnit = preferredUnit

    const daycarePlacementFixture = createDaycarePlacementFixture(
      uuidv4(),
      createdApplication.childId,
      preferredUnit.id,
      placementStartDate.formatIso()
    )
    await insertDaycarePlacementFixtures([daycarePlacementFixture])

    const report = await openPlacementSketchingReport()
    await report.assertRow(
      createdApplication.id,
      preferredUnit.name,
      `${fixtures.enduserChildFixtureJari.lastName} ${fixtures.enduserChildFixtureJari.firstName}`,
      currentUnit.name
    )
  })

  test('Application status filter works', async () => {
    const preferredStartDate = LocalDate.of(2021, 8, 13)
    const sentDate = preferredStartDate.subMonths(4)

    const fixtureForStatusSent = applicationFixture(
      fixtures.enduserChildFixtureJari,
      fixtures.enduserGuardianFixture,
      undefined,
      'PRESCHOOL',
      'AGREED'
    )
    const applicationWithStatusSent: Application = {
      ...fixtureForStatusSent,
      form: {
        ...fixtureForStatusSent.form,
        preferences: {
          ...fixtureForStatusSent.form.preferences,
          preferredStartDate
        }
      },
      sentDate: sentDate.formatIso(),
      status: 'SENT',
      id: uuidv4()
    }

    const fixtureForStatusWaitingPlacement = applicationFixture(
      fixtures.enduserChildFixtureKaarina,
      fixtures.enduserGuardianFixture,
      undefined,
      'PRESCHOOL',
      'AGREED'
    )
    const applicationWithStatusWaitingPlacement: Application = {
      ...fixtureForStatusWaitingPlacement,
      form: {
        ...fixtureForStatusWaitingPlacement.form,
        preferences: {
          ...fixtureForStatusWaitingPlacement.form.preferences,
          preferredStartDate
        }
      },
      sentDate: sentDate.formatIso(),
      status: 'WAITING_PLACEMENT',
      id: uuidv4()
    }

    const fixtureForStatusActive = applicationFixture(
      fixtures.enduserChildFixturePorriHatterRestricted,
      fixtures.enduserGuardianFixture,
      undefined,
      'PRESCHOOL',
      'AGREED'
    )
    const applicationWithStatusActive: Application = {
      ...fixtureForStatusActive,
      form: {
        ...fixtureForStatusActive.form,
        preferences: {
          ...fixtureForStatusActive.form.preferences,
          preferredStartDate
        }
      },
      sentDate: sentDate.formatIso(),
      status: 'ACTIVE',
      id: uuidv4()
    }

    await insertApplications([
      applicationWithStatusSent,
      applicationWithStatusWaitingPlacement,
      applicationWithStatusActive
    ])

    const report = await openPlacementSketchingReport()
    await report.assertRow(
      applicationWithStatusSent.id,
      daycareFixture.name,
      `${fixtures.enduserChildFixtureJari.lastName} ${fixtures.enduserChildFixtureJari.firstName}`
    )
    await report.assertRow(
      applicationWithStatusWaitingPlacement.id,
      daycareFixture.name,
      `${fixtures.enduserChildFixtureKaarina.lastName} ${fixtures.enduserChildFixtureKaarina.firstName}`
    )
    await report.assertRow(
      applicationWithStatusActive.id,
      daycareFixture.name,
      `${fixtures.enduserChildFixturePorriHatterRestricted.lastName} ${fixtures.enduserChildFixturePorriHatterRestricted.firstName}`
    )

    await report.toggleApplicationStatus('SENT')
    await report.assertRow(
      applicationWithStatusSent.id,
      daycareFixture.name,
      `${fixtures.enduserChildFixtureJari.lastName} ${fixtures.enduserChildFixtureJari.firstName}`
    )
    await report.assertNotRow(applicationWithStatusWaitingPlacement.id)
    await report.assertNotRow(applicationWithStatusActive.id)

    await report.toggleApplicationStatus('WAITING_PLACEMENT')
    await report.assertRow(
      applicationWithStatusSent.id,
      daycareFixture.name,
      `${fixtures.enduserChildFixtureJari.lastName} ${fixtures.enduserChildFixtureJari.firstName}`
    )
    await report.assertRow(
      applicationWithStatusWaitingPlacement.id,
      daycareFixture.name,
      `${fixtures.enduserChildFixtureKaarina.lastName} ${fixtures.enduserChildFixtureKaarina.firstName}`
    )
    await report.assertNotRow(applicationWithStatusActive.id)

    await report.toggleApplicationStatus('SENT')
    await report.assertNotRow(applicationWithStatusSent.id)
    await report.assertRow(
      applicationWithStatusWaitingPlacement.id,
      daycareFixture.name,
      `${fixtures.enduserChildFixtureKaarina.lastName} ${fixtures.enduserChildFixtureKaarina.firstName}`
    )
    await report.assertNotRow(applicationWithStatusActive.id)
  })
})
