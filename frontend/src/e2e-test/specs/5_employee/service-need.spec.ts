// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { UUID } from 'lib-common/types'

import config from '../../config'
import { resetDatabase } from '../../dev-api'
import { initializeAreaAndPersonData } from '../../dev-api/data-init'
import type {
  EmployeeBuilder,
  PlacementBuilder,
  ServiceNeedOptionBuilder
} from '../../dev-api/fixtures'
import { Fixture } from '../../dev-api/fixtures'
import ChildInformationPage from '../../pages/employee/child-information'
import { Page } from '../../utils/page'
import { employeeLogin } from '../../utils/user'

let page: Page
let childId: UUID
let employee: EmployeeBuilder
let placement: PlacementBuilder
let activeServiceNeedOption: ServiceNeedOptionBuilder
let inactiveServiceNeedOption: ServiceNeedOptionBuilder

beforeEach(async () => {
  await resetDatabase()
  const fixtures = await initializeAreaAndPersonData()
  const unitId = fixtures.daycareFixture.id
  childId = fixtures.familyWithTwoGuardians.children[0].id
  employee = await Fixture.employee()
    .with({ roles: ['ADMIN'] })
    .save()
  placement = await Fixture.placement()
    .with({
      childId,
      unitId
    })
    .save()
  activeServiceNeedOption = await Fixture.serviceNeedOption()
    .with({ validPlacementType: placement.data.type })
    .save()
  inactiveServiceNeedOption = await Fixture.serviceNeedOption()
    .with({ validPlacementType: placement.data.type, active: false })
    .save()

  const admin = await Fixture.employeeAdmin().save()

  page = await Page.open()
  await employeeLogin(page, admin.data)
})

const openCollapsible = async () => {
  await page.goto(config.employeeUrl + '/child-information/' + childId)
  const childInformationPage = new ChildInformationPage(page)
  await childInformationPage.waitUntilLoaded()
  return await childInformationPage.openCollapsible('placements')
}

describe('Service need', () => {
  test('add service need to a placement', async () => {
    const section = await openCollapsible()
    await section.addMissingServiceNeed(
      placement.data.id,
      activeServiceNeedOption.data.nameFi
    )
    await section.assertNthServiceNeedName(
      0,
      activeServiceNeedOption.data.nameFi
    )
  })

  test('only active service need options can be selected', async () => {
    const section = await openCollapsible()

    await section.assertServiceNeedOptions(placement.data.id, [
      activeServiceNeedOption.data.id
    ])
  })

  test('inactive service need name is shown on placement', async () => {
    await Fixture.serviceNeed()
      .with({
        placementId: placement.data.id,
        optionId: inactiveServiceNeedOption.data.id,
        confirmedBy: employee.data.id
      })
      .save()
    const section = await openCollapsible()

    await section.assertNthServiceNeedName(
      0,
      inactiveServiceNeedOption.data.nameFi
    )
  })
})
