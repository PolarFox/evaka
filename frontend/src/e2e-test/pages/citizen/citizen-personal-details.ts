// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { waitUntilFalse, waitUntilTrue } from '../../utils'
import type { Page } from '../../utils/page'
import { Checkbox, Select, TextInput } from '../../utils/page'

export default class CitizenPersonalDetails {
  constructor(private readonly page: Page) {}

  #missingEmailOrPhoneBox = this.page.find(
    '[data-qa="missing-email-or-phone-box"]'
  )
  #startEditing = this.page.find('[data-qa="start-editing"]')
  #preferredName = this.page.find('[data-qa="preferred-name"]')
  #phone = this.page.find('[data-qa="phone"]')
  #backupPhone = this.page.find('[data-qa="backup-phone"]')
  #email = this.page.find('[data-qa="email"]')
  #noEmail = new Checkbox(this.page.find('[data-qa="no-email"]'))
  #save = this.page.find('[data-qa="save"]')

  async checkMissingEmailWarningIsShown() {
    await this.#missingEmailOrPhoneBox.waitUntilVisible()
    await this.#missingEmailOrPhoneBox.assertText((text) =>
      text.includes('Sähköpostiosoitteesi puuttuu')
    )
  }

  async checkMissingPhoneWarningIsShown() {
    await waitUntilTrue(() => this.#missingEmailOrPhoneBox.visible)
    await waitUntilTrue(async () =>
      ((await this.#missingEmailOrPhoneBox.text) ?? '').includes(
        'Puhelinnumerosi puuttuu'
      )
    )
  }

  async assertAlertIsNotShown() {
    await waitUntilFalse(() => this.#missingEmailOrPhoneBox.visible)
  }

  async editPersonalData(
    data: {
      preferredName: string
      phone: string | null
      backupPhone: string
      email: string | null
    },
    expectValid: boolean
  ) {
    await this.#startEditing.click()
    await new Select(this.#preferredName).selectOption({
      label: data.preferredName
    })
    if (data.phone)
      await new TextInput(this.#phone.find('input')).fill(data.phone)
    await new TextInput(this.#backupPhone.find('input')).fill(data.backupPhone)
    if (data.email === null) {
      if (!(await this.#noEmail.checked)) {
        await this.#noEmail.click()
      }
    } else {
      await new TextInput(this.#email.find('input')).fill(data.email)
    }

    if (expectValid) {
      await this.#save.click()
      await waitUntilFalse(() => this.#startEditing.disabled)
    }
  }

  async assertSaveIsDisabled() {
    await waitUntilTrue(() => this.#save.hasAttribute('disabled'))
  }

  async checkPersonalData(data: {
    preferredName: string
    phone: string | null
    backupPhone: string
    email: string | null
  }) {
    await this.#preferredName.assertTextEquals(data.preferredName)
    await this.#phone.assertTextEquals(
      data.phone === null ? 'Puhelinnumerosi puuttuu' : data.phone
    )
    await this.#backupPhone.assertTextEquals(data.backupPhone)
    await this.#email.assertTextEquals(
      data.email === null ? 'Sähköpostiosoite puuttuu' : data.email
    )
  }
}
