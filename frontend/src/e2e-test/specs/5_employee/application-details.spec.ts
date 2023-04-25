// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import HelsinkiDateTime from 'lib-common/helsinki-date-time'

import config from '../../config'
import {
  cleanUpMessages,
  createPlacementPlan,
  execSimpleApplicationAction,
  getMessages,
  insertApplications,
  resetDatabase,
  runPendingAsyncJobs
} from '../../dev-api'
import type { AreaAndPersonFixtures } from '../../dev-api/data-init'
import { initializeAreaAndPersonData } from '../../dev-api/data-init'
import { applicationFixture, Fixture } from '../../dev-api/fixtures'
import type { Application, EmployeeDetail } from '../../dev-api/types'
import ApplicationDetailsPage from '../../pages/admin/application-details-page'
import { ApplicationWorkbenchPage } from '../../pages/admin/application-workbench-page'
import ApplicationReadView from '../../pages/employee/applications/application-read-view'
import { Page } from '../../utils/page'
import { employeeLogin } from '../../utils/user'

let page: Page
let applicationWorkbench: ApplicationWorkbenchPage
let applicationDetailsPage: ApplicationDetailsPage
let applicationReadView: ApplicationReadView

let fixtures: AreaAndPersonFixtures
let admin: EmployeeDetail

let singleParentApplication: Application
let familyWithTwoGuardiansApplication: Application
let separatedFamilyApplication: Application
let restrictedDetailsGuardianApplication: Application

beforeEach(async () => {
  await resetDatabase()
  fixtures = await initializeAreaAndPersonData()
  singleParentApplication = applicationFixture(
    fixtures.enduserChildFixtureKaarina,
    fixtures.enduserGuardianFixture
  )
  familyWithTwoGuardiansApplication = {
    ...applicationFixture(
      fixtures.familyWithTwoGuardians.children[0],
      fixtures.familyWithTwoGuardians.guardian,
      fixtures.familyWithTwoGuardians.otherGuardian
    ),
    id: '8634e2b9-200b-4a68-b956-66c5126f86a0'
  }
  separatedFamilyApplication = {
    ...applicationFixture(
      fixtures.familyWithSeparatedGuardians.children[0],
      fixtures.familyWithSeparatedGuardians.guardian,
      fixtures.familyWithSeparatedGuardians.otherGuardian,
      'DAYCARE',
      'NOT_AGREED'
    ),
    id: '0c8b9ad3-d283-460d-a5d4-77bdcbc69374'
  }
  restrictedDetailsGuardianApplication = {
    ...applicationFixture(
      fixtures.familyWithRestrictedDetailsGuardian.children[0],
      fixtures.familyWithRestrictedDetailsGuardian.guardian,
      fixtures.familyWithRestrictedDetailsGuardian.otherGuardian,
      'DAYCARE',
      'NOT_AGREED'
    ),
    id: '6a9b1b1e-3fdf-11eb-b378-0242ac130002'
  }
  await cleanUpMessages()

  await insertApplications([
    singleParentApplication,
    familyWithTwoGuardiansApplication,
    separatedFamilyApplication,
    restrictedDetailsGuardianApplication
  ])

  admin = (await Fixture.employeeAdmin().save()).data

  page = await Page.open()
  applicationWorkbench = new ApplicationWorkbenchPage(page)
  applicationDetailsPage = new ApplicationDetailsPage(page)
  applicationReadView = new ApplicationReadView(page)
})

describe('Application details', () => {
  test('Admin can view application details', async () => {
    await employeeLogin(page, admin)
    await page.goto(config.adminUrl)

    const application = await applicationWorkbench.openApplicationById(
      singleParentApplication.id
    )
    await application.assertGuardianName(
      `${fixtures.enduserGuardianFixture.lastName} ${fixtures.enduserGuardianFixture.firstName}`
    )
  })

  test('Other VTJ guardian is shown as empty if there is no other guardian', async () => {
    await employeeLogin(page, admin)
    await page.goto(config.adminUrl)

    const application = await applicationWorkbench.openApplicationById(
      singleParentApplication.id
    )
    await application.assertNoOtherVtjGuardian()
  })

  test('Other VTJ guardian in same address is shown', async () => {
    await employeeLogin(page, admin)
    await page.goto(config.adminUrl)

    const application = await applicationWorkbench.openApplicationById(
      familyWithTwoGuardiansApplication.id
    )
    await application.assertVtjGuardianName(
      `${fixtures.familyWithTwoGuardians.otherGuardian.lastName} ${fixtures.familyWithTwoGuardians.otherGuardian.firstName}`
    )
    await application.assertOtherGuardianSameAddress(true)
  })

  test('Other VTJ guardian in different address is shown', async () => {
    await employeeLogin(page, admin)
    await page.goto(config.adminUrl)

    const application = await applicationWorkbench.openApplicationById(
      separatedFamilyApplication.id
    )
    await application.assertVtjGuardianName(
      `${fixtures.familyWithSeparatedGuardians.otherGuardian.lastName} ${fixtures.familyWithSeparatedGuardians.otherGuardian.firstName}`
    )
    await application.assertOtherGuardianSameAddress(false)
    await application.assertOtherGuardianAgreementStatus(false)
  })

  test('Decision is not sent automatically to the other guardian if the first guardian has restricted details enabled', async () => {
    const serviceWorker = await Fixture.employeeServiceWorker().save()

    await execSimpleApplicationAction(
      restrictedDetailsGuardianApplication.id,
      'move-to-waiting-placement',
      HelsinkiDateTime.now() // TODO: use mock clock
    )
    await createPlacementPlan(restrictedDetailsGuardianApplication.id, {
      unitId: fixtures.preschoolFixture.id,
      period: {
        start:
          restrictedDetailsGuardianApplication.form.preferences.preferredStartDate?.formatIso() ??
          '',
        end:
          restrictedDetailsGuardianApplication.form.preferences.preferredStartDate?.formatIso() ??
          ''
      }
    })
    await execSimpleApplicationAction(
      restrictedDetailsGuardianApplication.id,
      'send-decisions-without-proposal',
      HelsinkiDateTime.now() // TODO: use mock clock
    )

    await employeeLogin(page, serviceWorker.data)
    await applicationReadView.navigateToApplication(
      restrictedDetailsGuardianApplication.id
    )
    await applicationDetailsPage.assertApplicationStatus(
      'Vahvistettavana huoltajalla'
    )

    await runPendingAsyncJobs(
      HelsinkiDateTime.now() // TODO: use mock clock
    )
    const messages = await getMessages()
    expect(messages.length).toEqual(1)
    expect(messages[0].ssn).toEqual(
      fixtures.familyWithRestrictedDetailsGuardian.guardian.ssn
    )
  })

  test('Supervisor can read an accepted application although the supervisors unit is not a preferred unit before and after accepting the decision', async () => {
    const unitSupervisor = await Fixture.employeeUnitSupervisor(
      fixtures.preschoolFixture.id
    ).save()

    await execSimpleApplicationAction(
      singleParentApplication.id,
      'move-to-waiting-placement',
      HelsinkiDateTime.now() // TODO: use mock clock
    )
    await createPlacementPlan(singleParentApplication.id, {
      unitId: fixtures.preschoolFixture.id,
      period: {
        start:
          singleParentApplication.form.preferences.preferredStartDate?.formatIso() ??
          '',
        end:
          singleParentApplication.form.preferences.preferredStartDate?.formatIso() ??
          ''
      }
    })
    await execSimpleApplicationAction(
      singleParentApplication.id,
      'send-decisions-without-proposal',
      HelsinkiDateTime.now() // TODO: use mock clock
    )

    await employeeLogin(page, unitSupervisor.data)
    await applicationReadView.navigateToApplication(singleParentApplication.id)
    await applicationDetailsPage.assertApplicationStatus(
      'Vahvistettavana huoltajalla'
    )
    await applicationReadView.acceptDecision('DAYCARE')
    await applicationDetailsPage.assertApplicationStatus('Paikka vastaanotettu')
  })

  test('Service worker can create, edit and delete application notes', async () => {
    const serviceWorker = await Fixture.employeeServiceWorker().save()
    await employeeLogin(page, serviceWorker.data)
    await page.goto(config.employeeUrl)

    const application = await applicationWorkbench.openApplicationById(
      singleParentApplication.id
    )
    const newNote = 'New note.'
    await application.addNote(newNote)
    await application.assertNote(0, newNote)
    const editedNote = 'Edited note.'
    await application.editNote(0, editedNote)
    await application.assertNote(0, editedNote)
    await application.deleteNote(0)
    await application.assertNoNote(0)
  })
})
