// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import config from '../../config'
import { resetDatabase } from '../../dev-api'
import { initializeAreaAndPersonData } from '../../dev-api/data-init'
import { Fixture } from '../../dev-api/fixtures'
import type { Daycare } from '../../dev-api/types'
import EmployeeNav from '../../pages/employee/employee-nav'
import {
  UnitEditor,
  UnitInfoPage,
  UnitPage
} from '../../pages/employee/units/unit'
import UnitsPage from '../../pages/employee/units/units'
import { Page } from '../../utils/page'
import { employeeLogin } from '../../utils/user'

describe('Employee - unit details', () => {
  let page: Page
  let unitsPage: UnitsPage
  let daycare1: Daycare

  beforeEach(async () => {
    await resetDatabase()
    const fixtures = await initializeAreaAndPersonData()
    daycare1 = fixtures.daycareFixture
    const admin = await Fixture.employeeAdmin().save()

    page = await Page.open()
    await employeeLogin(page, admin.data)
    await page.goto(config.employeeUrl)
    await new EmployeeNav(page).openTab('units')
    unitsPage = new UnitsPage(page)
  })

  test('Admin creates a new unit', async () => {
    const unitEditorPage = await unitsPage.openNewUnitEditor()

    await unitEditorPage.fillUnitName('Uusi Kerho')
    await unitEditorPage.chooseArea('Superkeskus')
    await unitEditorPage.toggleCareType('CLUB')
    await unitEditorPage.toggleApplicationType('CLUB')
    await unitEditorPage.fillVisitingAddress('Kamreerintie 1', '02100', 'Espoo')
    await unitEditorPage.fillManagerData(
      'Kerhon Johtaja',
      '01234567',
      'manager@example.com'
    )

    await unitEditorPage.submit()
    const unitInfoPage = new UnitInfoPage(page)
    await unitInfoPage.waitUntilLoaded()
    await unitInfoPage.assertUnitName('Uusi Kerho')
  })

  test('Admin can edit unit details', async () => {
    const unitEditorPage = await UnitEditor.openById(page, daycare1.id)

    await unitEditorPage.fillManagerData(
      'Päiväkodin Johtaja',
      '01234567',
      'manager@example.com'
    )

    // The daycare fixture has this on but it needs to be turned off to be able to save
    await unitEditorPage.setInvoiceByMunicipality(false)

    const unitDetailsPage = await unitEditorPage.submit()
    await unitDetailsPage.assertUnitName(daycare1.name)
    await unitDetailsPage.assertManagerData(
      'Päiväkodin Johtaja',
      '01234567',
      'manager@example.com'
    )
  })
})

describe('Employee - unit editor validations and warnings', () => {
  let page: Page
  let unitInfoPage: UnitInfoPage
  let unitEditorPage: UnitEditor

  beforeEach(async () => {
    await resetDatabase()

    const fixtures = await initializeAreaAndPersonData()
    const admin = await Fixture.employeeAdmin().save()

    page = await Page.open()
    await employeeLogin(page, admin.data)
    const unitPage = await UnitPage.openUnit(page, fixtures.daycareFixture.id)
    unitInfoPage = await unitPage.openUnitInformation()
    const unitDetailsPage = await unitInfoPage.openUnitDetails()
    unitEditorPage = await unitDetailsPage.edit()
  })

  test('Unit closing date warning is shown when needed', async () => {
    await unitEditorPage.assertWarningIsNotVisible('closing-date-warning')
    await unitEditorPage.selectSomeClosingDate()
    await unitEditorPage.assertWarningIsVisible('closing-date-warning')
    await unitEditorPage.clearClosingDate()
    await unitEditorPage.assertWarningIsNotVisible('closing-date-warning')
  })

  test('Varda unit warning is shown for non varda units', async () => {
    await unitEditorPage.selectProviderType('MUNICIPAL')
    await unitEditorPage.assertWarningIsNotVisible('send-to-varda-warning')
    await unitEditorPage.selectProviderType('PRIVATE')
    await unitEditorPage.assertWarningIsVisible('send-to-varda-warning')
  })

  test('Municipal, service voucher and purchased units shows warning if handler address is missing', async () => {
    await unitEditorPage.assertUnitHandlerAddressVisibility(
      'MUNICIPAL',
      '',
      true
    )
    await unitEditorPage.assertUnitHandlerAddressVisibility(
      'MUNICIPAL',
      'An address',
      false
    )

    await unitEditorPage.assertUnitHandlerAddressVisibility(
      'MUNICIPAL_SCHOOL',
      '',
      true
    )
    await unitEditorPage.assertUnitHandlerAddressVisibility(
      'MUNICIPAL_SCHOOL',
      'An address',
      false
    )

    await unitEditorPage.assertUnitHandlerAddressVisibility(
      'PURCHASED',
      '',
      true
    )
    await unitEditorPage.assertUnitHandlerAddressVisibility(
      'PURCHASED',
      'An address',
      false
    )

    await unitEditorPage.assertUnitHandlerAddressVisibility(
      'PRIVATE_SERVICE_VOUCHER',
      '',
      true
    )
    await unitEditorPage.assertUnitHandlerAddressVisibility(
      'PRIVATE_SERVICE_VOUCHER',
      'An address',
      false
    )

    await unitEditorPage.assertUnitHandlerAddressVisibility(
      'PRIVATE',
      '',
      false
    )
    await unitEditorPage.assertUnitHandlerAddressVisibility(
      'EXTERNAL_PURCHASED',
      '',
      false
    )
  })

  test('Invoicing related fields are only shown if unit is invoiced by municipality', async () => {
    await unitEditorPage.assertInvoicingFieldsVisibility(true)
    await unitEditorPage.clickInvoicedByMunicipality()
    await unitEditorPage.assertInvoicingFieldsVisibility(false)
  })
})
