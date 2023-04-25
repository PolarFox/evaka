// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { PlacementType } from 'lib-common/generated/api-types/placement'
import LocalDate from 'lib-common/local-date'

import {
  insertApplications,
  insertDaycarePlacementFixtures,
  resetDatabase
} from '../../dev-api'
import type { AreaAndPersonFixtures } from '../../dev-api/data-init'
import { initializeAreaAndPersonData } from '../../dev-api/data-init'
import {
  applicationFixture,
  applicationFixtureId,
  Fixture,
  uuidv4
} from '../../dev-api/fixtures'
import type { DaycarePlacement } from '../../dev-api/types'
import CitizenApplicationsPage from '../../pages/citizen/citizen-applications'
import { CitizenChildPage } from '../../pages/citizen/citizen-children'
import CitizenHeader from '../../pages/citizen/citizen-header'
import { waitUntilEqual } from '../../utils'
import { Page } from '../../utils/page'
import { enduserLogin } from '../../utils/user'

let fixtures: AreaAndPersonFixtures
let page: Page
let header: CitizenHeader
let childPage: CitizenChildPage

const mockedDate = LocalDate.of(2022, 3, 1)

beforeEach(async () => {
  await resetDatabase()
  fixtures = await initializeAreaAndPersonData()

  page = await Page.open({ mockedTime: mockedDate.toSystemTzDate() })
  await enduserLogin(page)
  header = new CitizenHeader(page)
  childPage = new CitizenChildPage(page)
})

describe('Citizen children page', () => {
  describe('Child page', () => {
    test('Citizen can see its children and navigate to their page', async () => {
      await insertDaycarePlacementFixtures(
        [
          fixtures.enduserChildFixtureJari,
          fixtures.enduserChildFixtureKaarina
        ].map((child) => ({
          id: uuidv4(),
          type: 'DAYCARE',
          childId: child.id,
          unitId: fixtures.daycareFixture.id,
          startDate: mockedDate.subMonths(1).formatIso(),
          endDate: mockedDate.formatIso()
        }))
      )
      await page.reload()

      await header.openChildPage(fixtures.enduserChildFixtureJari.id)
      await childPage.assertChildNameIsShown(
        'Jari-Petteri Mukkelis-Makkelis Vetelä-Viljami Eelis-Juhani Karhula'
      )
      await header.openChildPage(fixtures.enduserChildFixtureKaarina.id)
      await childPage.assertChildNameIsShown('Kaarina Veera Nelli Karhula')
    })
  })

  async function createDaycarePlacement(
    endDate: LocalDate,
    unitId = fixtures.daycareFixture.id,
    type: PlacementType = 'DAYCARE',
    startDate: LocalDate = mockedDate.subMonths(2)
  ) {
    await insertDaycarePlacementFixtures([
      {
        id: uuidv4(),
        type,
        childId: fixtures.enduserChildFixtureKaarina.id,
        unitId,
        startDate: startDate.formatIso(),
        endDate: endDate.formatIso()
      }
    ])
  }

  describe('Placement termination', () => {
    const assertToggledPlacements = async (labels: string[]) =>
      waitUntilEqual(() => childPage.getToggledPlacements(), labels)
    const assertTerminatablePlacements = async (labels: string[]) =>
      waitUntilEqual(() => childPage.getTerminatablePlacements(), labels)
    const assertNonTerminatablePlacements = async (labels: string[]) =>
      waitUntilEqual(() => childPage.getNonTerminatablePlacements(), labels)
    const assertTerminatedPlacements = async (labels: string | string[]) =>
      waitUntilEqual(
        () => childPage.getTerminatedPlacements(),
        typeof labels === 'string' ? [labels] : labels
      )

    test('Simple daycare placement can be terminated', async () => {
      const endDate = mockedDate.addYears(2)
      await createDaycarePlacement(endDate)
      await page.reload()

      await header.openChildPage(fixtures.enduserChildFixtureKaarina.id)
      await childPage.openCollapsible('termination')

      await childPage.assertTerminatedPlacementCount(0)
      await childPage.assertTerminatablePlacementCount(1)
      await childPage.togglePlacement(
        `Varhaiskasvatus, Alkuräjähdyksen päiväkoti, voimassa ${endDate.format()}`
      )
      await childPage.fillTerminationDate(mockedDate)
      await childPage.submitTermination()
      await childPage.assertTerminatablePlacementCount(0)

      await childPage.assertTerminatedPlacementCount(1)
      await assertTerminatedPlacements(
        `Varhaiskasvatus, Alkuräjähdyksen päiväkoti, viimeinen läsnäolopäivä: ${mockedDate.format()}`
      )
    })

    test('Daycare placement cannot be terminated if termination is not enabled for unit', async () => {
      const endDate = mockedDate.addYears(2)
      await createDaycarePlacement(endDate, fixtures.clubFixture.id, 'CLUB')
      await page.reload()
      await header.openChildPage(fixtures.enduserChildFixtureKaarina.id)
      await childPage.openCollapsible('termination')

      await childPage.assertTerminatedPlacementCount(0)
      await childPage.assertTerminatablePlacementCount(0)
      await assertNonTerminatablePlacements([
        `Alkuräjähdyksen kerho, voimassa ${endDate.format()}`
      ])
    })

    test('Daycare placement cannot be terminated if placement is in the future', async () => {
      const startDate = mockedDate.addDays(1)
      const endDate = startDate
      await createDaycarePlacement(
        endDate,
        fixtures.daycareFixture.id,
        'DAYCARE',
        startDate
      )
      await page.reload()
      await header.openChildPage(fixtures.enduserChildFixtureKaarina.id)
      await childPage.openCollapsible('termination')

      await childPage.assertTerminatedPlacementCount(0)
      await childPage.assertTerminatablePlacementCount(0)
      await assertNonTerminatablePlacements([
        `Alkuräjähdyksen päiväkoti, voimassa ${endDate.format()}`
      ])
    })

    test('Upcoming transfer application is deleted when placement is terminated', async () => {
      const endDate = mockedDate.addYears(2)
      await createDaycarePlacement(endDate)
      await page.reload()

      const application = applicationFixture(
        fixtures.enduserChildFixtureKaarina,
        fixtures.enduserGuardianFixture,
        undefined,
        'DAYCARE',
        null,
        [fixtures.daycareFixture.id],
        true,
        'SENT',
        mockedDate,
        true
      )
      await insertApplications([application])
      await page.reload()

      await header.selectTab('applications')
      await new CitizenApplicationsPage(page).assertApplicationExists(
        applicationFixtureId
      )

      await header.openChildPage(fixtures.enduserChildFixtureKaarina.id)
      await childPage.openCollapsible('termination')
      const placementLabel = `Varhaiskasvatus, Alkuräjähdyksen päiväkoti, voimassa ${endDate.format()}`
      await childPage.togglePlacement(placementLabel)
      await childPage.fillTerminationDate(mockedDate)
      await childPage.submitTermination()
      await childPage.assertTerminatablePlacementCount(0)

      await header.selectTab('applications')
      await new CitizenApplicationsPage(page).assertApplicationDoesNotExist(
        applicationFixtureId
      )
    })

    test('Daycare placements are grouped by type and unit, and invoiced daycare can be terminated separately', async () => {
      const daycare1Start = mockedDate.subMonths(2)
      const daycare1End = mockedDate.addMonths(3)
      const daycare2start = daycare1End.addDays(1)
      const daycare2end = daycare1End.addMonths(2)
      const preschool1Start = daycare2end.addDays(1)
      const preschool1End = daycare2end.addMonths(6)
      const preschool2Start = preschool1End.addDays(1)
      const preschool2End = preschool1End.addMonths(6)
      const daycareAfterPreschoolStart = preschool2End.addDays(1)
      const daycareAfterPreschoolEnd = preschool2End.addMonths(6)
      const placements: DaycarePlacement[] = [
        {
          id: uuidv4(),
          type: 'DAYCARE',
          childId: fixtures.enduserChildFixtureKaarina.id,
          unitId: fixtures.daycareFixture.id,
          startDate: daycare1Start.formatIso(),
          endDate: daycare1End.formatIso()
        },
        {
          id: uuidv4(),
          type: 'DAYCARE',
          childId: fixtures.enduserChildFixtureKaarina.id,
          unitId: fixtures.preschoolFixture.id,
          startDate: daycare2start.formatIso(),
          endDate: daycare2end.formatIso()
        },
        {
          id: uuidv4(),
          type: 'PRESCHOOL',
          childId: fixtures.enduserChildFixtureKaarina.id,
          unitId: fixtures.preschoolFixture.id,
          startDate: preschool1Start.formatIso(),
          endDate: preschool1End.formatIso()
        },
        {
          id: uuidv4(),
          type: 'PRESCHOOL_DAYCARE', // this gets grouped with the above
          childId: fixtures.enduserChildFixtureKaarina.id,
          unitId: fixtures.preschoolFixture.id,
          startDate: preschool2Start.formatIso(),
          endDate: preschool2End.formatIso()
        },
        {
          id: uuidv4(),
          type: 'DAYCARE', // this is shown under PRESCHOOL as "Maksullinen varhaiskasvatus"
          childId: fixtures.enduserChildFixtureKaarina.id,
          unitId: fixtures.preschoolFixture.id,
          startDate: daycareAfterPreschoolStart.formatIso(),
          endDate: daycareAfterPreschoolEnd.formatIso()
        }
      ]
      await insertDaycarePlacementFixtures(placements)
      await page.reload()
      const labels = {
        daycare1: `Varhaiskasvatus, Alkuräjähdyksen päiväkoti, voimassa ${daycare1End.format()}`,
        daycare2: `Varhaiskasvatus, Alkuräjähdyksen eskari, voimassa ${daycare2end.format()}`,
        preschool: `Esiopetus, Alkuräjähdyksen eskari, voimassa ${preschool2End.format()}`,
        daycareAfterPreschool: `Maksullinen varhaiskasvatus, Alkuräjähdyksen eskari, voimassa ${daycareAfterPreschoolEnd.format()}`
      }

      await header.openChildPage(fixtures.enduserChildFixtureKaarina.id)
      await childPage.openCollapsible('termination')

      await childPage.assertTerminatedPlacementCount(0)
      await childPage.assertTerminatablePlacementCount(1)
      await childPage.assertNonTerminatablePlacementCount(2)
      await assertTerminatablePlacements([labels.daycare1])
      await assertNonTerminatablePlacements([
        `Alkuräjähdyksen eskari, voimassa ${daycare2end.format()}`,
        `Alkuräjähdyksen eskari, voimassa ${preschool2End.format()}`
      ])
    })

    test('Daycare placements are grouped by type and unit, future placement cannot be terminated', async () => {
      const daycare1Start = mockedDate.subMonths(2)
      const daycare1End = mockedDate.addMonths(3)
      const daycare2start = daycare1End.addDays(1)
      const daycare2end = daycare1End.addMonths(2)
      const placements: DaycarePlacement[] = [
        {
          id: uuidv4(),
          type: 'DAYCARE',
          childId: fixtures.enduserChildFixtureKaarina.id,
          unitId: fixtures.daycareFixture.id,
          startDate: daycare1Start.formatIso(),
          endDate: daycare1End.formatIso()
        },
        {
          id: uuidv4(),
          type: 'DAYCARE',
          childId: fixtures.enduserChildFixtureKaarina.id,
          unitId: fixtures.preschoolFixture.id,
          startDate: daycare2start.formatIso(),
          endDate: daycare2end.formatIso()
        }
      ]
      await insertDaycarePlacementFixtures(placements)
      await page.reload()
      const labels = {
        daycare1: `Varhaiskasvatus, Alkuräjähdyksen päiväkoti, voimassa ${daycare1End.format()}`,
        daycare2: `Varhaiskasvatus, Alkuräjähdyksen eskari, voimassa ${daycare2end.format()}`
      }

      await header.openChildPage(fixtures.enduserChildFixtureKaarina.id)
      await childPage.openCollapsible('termination')

      await childPage.assertTerminatedPlacementCount(0)
      await childPage.assertTerminatablePlacementCount(1)
      await assertTerminatablePlacements([labels.daycare1])
      await childPage.togglePlacement(labels.daycare1)
      const daycare1FirstTermination = mockedDate.addWeeks(1)
      await childPage.fillTerminationDate(daycare1FirstTermination, 0)
      await childPage.submitTermination(0)
      await childPage.assertTerminatablePlacementCount(1)
      await childPage.assertTerminatedPlacementCount(1)
      await assertTerminatedPlacements(
        `Varhaiskasvatus, Alkuräjähdyksen päiväkoti, viimeinen läsnäolopäivä: ${daycare1FirstTermination.format()}`
      )
      await assertToggledPlacements([])
      await childPage.togglePlacement(
        `Varhaiskasvatus, Alkuräjähdyksen päiväkoti, voimassa ${daycare1FirstTermination.format()}`
      )
      await childPage.fillTerminationDate(mockedDate, 0)
      await childPage.submitTermination(0)
      await childPage.assertTerminatablePlacementCount(0)
      await assertTerminatedPlacements(
        `Varhaiskasvatus, Alkuräjähdyksen päiväkoti, viimeinen läsnäolopäivä: ${mockedDate.format()}`
      )

      await childPage.assertNonTerminatablePlacementCount(1)
      await assertNonTerminatablePlacements([
        `Alkuräjähdyksen eskari, voimassa ${daycare2end.format()}`
      ])
    })

    test('Invoiced daycare can be terminated separately', async () => {
      const preschool2Start = mockedDate.subMonths(2)
      const preschool2End = mockedDate.addMonths(3)
      const daycareAfterPreschoolStart = preschool2End.addDays(1)
      const daycareAfterPreschoolEnd = preschool2End.addMonths(6)
      const placements: DaycarePlacement[] = [
        {
          id: uuidv4(),
          type: 'PRESCHOOL_DAYCARE', // this gets grouped with the above
          childId: fixtures.enduserChildFixtureKaarina.id,
          unitId: fixtures.preschoolFixture.id,
          startDate: preschool2Start.formatIso(),
          endDate: preschool2End.formatIso()
        },
        {
          id: uuidv4(),
          type: 'DAYCARE', // this is shown under PRESCHOOL as "Maksullinen varhaiskasvatus"
          childId: fixtures.enduserChildFixtureKaarina.id,
          unitId: fixtures.preschoolFixture.id,
          startDate: daycareAfterPreschoolStart.formatIso(),
          endDate: daycareAfterPreschoolEnd.formatIso()
        }
      ]
      await insertDaycarePlacementFixtures(placements)
      await page.reload()
      const labels = {
        preschool: `Esiopetus, Alkuräjähdyksen eskari, voimassa ${preschool2End.format()}`,
        daycareAfterPreschool: `Maksullinen varhaiskasvatus, Alkuräjähdyksen eskari, voimassa ${daycareAfterPreschoolEnd.format()}`
      }

      await header.openChildPage(fixtures.enduserChildFixtureKaarina.id)
      await childPage.openCollapsible('termination')

      await childPage.assertTerminatedPlacementCount(0)
      await childPage.assertTerminatablePlacementCount(2)

      // selecting preschool selects daycare after preschool too
      await childPage.togglePlacement(labels.preschool)
      await assertToggledPlacements([
        labels.preschool,
        labels.daycareAfterPreschool
      ])
      // deselecting preschool does not deselect daycare after preschool
      await childPage.togglePlacement(labels.preschool)
      await assertToggledPlacements([labels.daycareAfterPreschool])
      // re-selecting preschool selects daycare after preschool too
      await childPage.togglePlacement(labels.preschool)
      await assertToggledPlacements([
        labels.preschool,
        labels.daycareAfterPreschool
      ])
      // de-selecting daycare after preschool de-selects preschool too
      await childPage.togglePlacement(labels.daycareAfterPreschool)
      await assertToggledPlacements([])

      await childPage.togglePlacement(labels.daycareAfterPreschool)
      await childPage.fillTerminationDate(daycareAfterPreschoolEnd.subMonths(1))
      await childPage.submitTermination()

      await assertTerminatedPlacements([
        `Maksullinen varhaiskasvatus, Alkuräjähdyksen eskari, viimeinen läsnäolopäivä: ${daycareAfterPreschoolEnd
          .subMonths(1)
          .format()}`
      ])

      // terminating preschool terminates daycare after preschool
      await childPage.togglePlacement(labels.preschool)
      await childPage.fillTerminationDate(mockedDate)
      await childPage.submitTermination()
      await assertTerminatedPlacements([
        `Esiopetus, Alkuräjähdyksen eskari, viimeinen läsnäolopäivä: ${mockedDate.format()}`
      ])
    })

    test('Terminating paid daycare only is possible', async () => {
      const endDate = mockedDate.addYears(2)
      await createDaycarePlacement(
        endDate,
        fixtures.preschoolFixture.id,
        'PRESCHOOL_DAYCARE'
      )
      await page.reload()

      await header.openChildPage(fixtures.enduserChildFixtureKaarina.id)
      await childPage.openCollapsible('termination')

      await childPage.assertTerminatedPlacementCount(0)
      await assertTerminatablePlacements([
        `Esiopetus, Alkuräjähdyksen eskari, voimassa ${endDate.format()}`,
        `Maksullinen varhaiskasvatus, Alkuräjähdyksen eskari, voimassa ${endDate.format()}`
      ])
      await childPage.togglePlacement(
        `Maksullinen varhaiskasvatus, Alkuräjähdyksen eskari, voimassa ${endDate.format()}`
      )
      const terminationDate = mockedDate.addMonths(1)
      await childPage.fillTerminationDate(terminationDate)
      await childPage.submitTermination()
      await assertTerminatablePlacements([
        `Esiopetus, Alkuräjähdyksen eskari, voimassa ${endDate.format()}`,
        `Maksullinen varhaiskasvatus, Alkuräjähdyksen eskari, voimassa ${terminationDate.format()}`
      ])

      await childPage.assertTerminatedPlacementCount(1) // the paid daycare is not terminated, just split to PRESCHOOL_DAYCARE and PRESCHOOL
      await assertTerminatedPlacements([
        `Maksullinen varhaiskasvatus, Alkuräjähdyksen eskari, viimeinen läsnäolopäivä: ${terminationDate.format()}`
      ])
    })
  })

  describe('Consents', () => {
    beforeEach(async () => {
      await Fixture.placement()
        .with({
          unitId: fixtures.daycareFixture.id,
          childId: fixtures.enduserChildFixturePorriHatterRestricted.id,
          startDate: mockedDate.subDays(10).formatIso()
        })
        .save()

      await Fixture.placement()
        .with({
          unitId: fixtures.daycareFixture.id,
          childId: fixtures.enduserChildFixtureKaarina.id,
          startDate: mockedDate.subDays(10).formatIso()
        })
        .save()

      await Fixture.placement()
        .with({
          unitId: fixtures.daycareFixture.id,
          childId: fixtures.enduserChildFixtureJari.id,
          startDate: mockedDate.subDays(10).formatIso()
        })
        .save()

      await page.reload()
    })

    test('can give consent once', async () => {
      await header.openChildPage(fixtures.enduserChildFixtureKaarina.id)
      await childPage.openCollapsible('consents')
      await childPage.evakaProfilePicYes.check()
      await childPage.saveConsent()
      await waitUntilEqual(() => childPage.evakaProfilePicYes.disabled, true)

      await page.reload()
      await header.openChildPage(fixtures.enduserChildFixtureKaarina.id)
      await childPage.openCollapsible('consents')
      await childPage.evakaProfilePicYes.waitUntilChecked(true)
      await childPage.evakaProfilePicNo.waitUntilChecked(false)
      await waitUntilEqual(() => childPage.evakaProfilePicYes.disabled, true)
      await waitUntilEqual(() => childPage.evakaProfilePicNo.disabled, true)
    })

    test('shows unconsented count', async () => {
      await page.reload()
      await header.assertUnreadChildrenCount(3)

      await header.assertChildUnreadCount(
        fixtures.enduserChildFixtureKaarina.id,
        1
      )
      await header.assertChildUnreadCount(
        fixtures.enduserChildFixturePorriHatterRestricted.id,
        1
      )

      await header.openChildPage(fixtures.enduserChildFixtureKaarina.id)
      await childPage.assertUnconsentedCount(1)

      await childPage.openCollapsible('consents')
      await childPage.evakaProfilePicYes.check()
      await childPage.saveConsent()

      await header.assertUnreadChildrenCount(2)
    })
  })
})
