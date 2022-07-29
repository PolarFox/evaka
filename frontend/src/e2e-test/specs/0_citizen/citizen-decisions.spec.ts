// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import LocalDate from 'lib-common/local-date'

import config from '../../config'
import {
  execSimpleApplicationActions,
  getDecisionsByApplication,
  insertApplications,
  resetDatabase,
  runPendingAsyncJobs
} from '../../dev-api'
import type { AreaAndPersonFixtures } from '../../dev-api/data-init'
import { initializeAreaAndPersonData } from '../../dev-api/data-init'
import { applicationFixture } from '../../dev-api/fixtures'
import CitizenDecisionsPage from '../../pages/citizen/citizen-decisions'
import CitizenHeader from '../../pages/citizen/citizen-header'
import { Page } from '../../utils/page'
import { enduserLogin } from '../../utils/user'

let page: Page
let header: CitizenHeader
let citizenDecisionsPage: CitizenDecisionsPage
let fixtures: AreaAndPersonFixtures

beforeEach(async () => {
  await resetDatabase()
  fixtures = await initializeAreaAndPersonData()

  page = await Page.open()
  header = new CitizenHeader(page)
  citizenDecisionsPage = new CitizenDecisionsPage(page)
  await enduserLogin(page)
  await page.goto(config.enduserUrl)
})

describe('Citizen page', () => {
  test('Citizen sees their decisions, accepts preschool and rejects preschool daycare', async () => {
    const application = applicationFixture(
      fixtures.enduserChildFixtureJari,
      fixtures.enduserGuardianFixture,
      undefined,
      'PRESCHOOL',
      null,
      [fixtures.daycareFixture.id],
      true
    )
    const applicationId = application.id
    await insertApplications([application])

    await execSimpleApplicationActions(applicationId, [
      'move-to-waiting-placement',
      'create-default-placement-plan',
      'send-decisions-without-proposal'
    ])
    await runPendingAsyncJobs()

    const decisions = await getDecisionsByApplication(applicationId)
    if (decisions.length !== 2) throw Error('Expected 2 decisions')
    const preschoolDecisionId = decisions.find(
      (d) => d.type === 'PRESCHOOL'
    )?.id
    if (!preschoolDecisionId)
      throw Error('Expected a decision with type PRESCHOOL')
    const preschoolDaycareDecisionId = decisions.find(
      (d) => d.type === 'PRESCHOOL_DAYCARE'
    )?.id
    if (!preschoolDaycareDecisionId)
      throw Error('Expected a decision with type PRESCHOOL_DAYCARE')

    await header.selectTab('decisions')

    await citizenDecisionsPage.assertUnresolvedDecisionsCount(2)
    await citizenDecisionsPage.assertApplicationDecision(
      applicationId,
      preschoolDecisionId,
      `${fixtures.enduserChildFixtureJari.firstName} ${fixtures.enduserChildFixtureJari.lastName}`,
      'Päätös esiopetuksesta',
      LocalDate.todayInSystemTz().format(),
      'Vahvistettavana huoltajalla'
    )
    await citizenDecisionsPage.assertApplicationDecision(
      applicationId,
      preschoolDaycareDecisionId,
      `${fixtures.enduserChildFixtureJari.firstName} ${fixtures.enduserChildFixtureJari.lastName}`,
      'Päätös liittyvästä varhaiskasvatuksesta',
      LocalDate.todayInSystemTz().format(),
      'Vahvistettavana huoltajalla'
    )

    const responsePage = await citizenDecisionsPage.navigateToDecisionResponse(
      applicationId
    )
    await responsePage.assertUnresolvedDecisionsCount(2)

    // preschool daycare decision cannot be accepted before accepting preschool
    await responsePage.assertDecisionCannotBeAccepted(
      preschoolDaycareDecisionId
    )

    await responsePage.assertDecisionData(
      preschoolDecisionId,
      'Päätös esiopetuksesta',
      fixtures.daycareFixture.decisionPreschoolName,
      'Vahvistettavana huoltajalla'
    )

    await responsePage.acceptDecision(preschoolDecisionId)
    await responsePage.assertDecisionStatus(preschoolDecisionId, 'Hyväksytty')
    await responsePage.assertUnresolvedDecisionsCount(1)

    await responsePage.assertDecisionData(
      preschoolDaycareDecisionId,
      'Päätös liittyvästä varhaiskasvatuksesta',
      fixtures.daycareFixture.decisionDaycareName,
      'Vahvistettavana huoltajalla'
    )

    await responsePage.rejectDecision(preschoolDaycareDecisionId)
    await responsePage.assertDecisionStatus(
      preschoolDaycareDecisionId,
      'Hylätty'
    )
    await responsePage.assertUnresolvedDecisionsCount(0)
  })

  test('Rejecting preschool decision also rejects connected daycare after confirmation', async () => {
    const application = applicationFixture(
      fixtures.enduserChildFixtureJari,
      fixtures.enduserGuardianFixture,
      undefined,
      'PRESCHOOL',
      null,
      [fixtures.daycareFixture.id],
      true
    )
    const applicationId = application.id
    await insertApplications([application])

    await execSimpleApplicationActions(applicationId, [
      'move-to-waiting-placement',
      'create-default-placement-plan',
      'send-decisions-without-proposal'
    ])
    await runPendingAsyncJobs()

    const decisions = await getDecisionsByApplication(applicationId)
    if (decisions.length !== 2) throw Error('Expected 2 decisions')
    const preschoolDecisionId = decisions.find(
      (d) => d.type === 'PRESCHOOL'
    )?.id
    if (!preschoolDecisionId)
      throw Error('Expected a decision with type PRESCHOOL')
    const preschoolDaycareDecisionId = decisions.find(
      (d) => d.type === 'PRESCHOOL_DAYCARE'
    )?.id
    if (!preschoolDaycareDecisionId)
      throw Error('Expected a decision with type PRESCHOOL_DAYCARE')

    await header.selectTab('decisions')

    await citizenDecisionsPage.assertUnresolvedDecisionsCount(2)
    const responsePage = await citizenDecisionsPage.navigateToDecisionResponse(
      applicationId
    )
    await responsePage.rejectDecision(preschoolDecisionId)
    await responsePage.confirmRejectCascade()

    await responsePage.assertDecisionStatus(preschoolDecisionId, 'Hylätty')
    await responsePage.assertDecisionStatus(
      preschoolDaycareDecisionId,
      'Hylätty'
    )
    await responsePage.assertUnresolvedDecisionsCount(0)
  })
})
