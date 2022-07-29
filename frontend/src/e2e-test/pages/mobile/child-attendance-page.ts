// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { AbsenceType } from 'lib-common/generated/api-types/daycare'

import { waitUntilEqual, waitUntilTrue } from '../../utils'
import type { Page } from '../../utils/page'
import { TextInput } from '../../utils/page'

export default class ChildAttendancePage {
  constructor(private readonly page: Page) {}

  #presentTab = this.page.find('[data-qa="present-tab"]')
  #markPresentButton = this.page.find('[data-qa="mark-present-btn"]')
  #childLink = (n: number) => this.page.findAll('[data-qa="child-name"]').nth(n)
  #markDepartedLink = this.page.find('[data-qa="mark-departed-link"]')
  #markDepartedButton = this.page.find('[data-qa="mark-departed-btn"]')
  #markAbsentButton = this.page.find('[data-qa="mark-absent-btn"]')
  #markDepartedWithAbsenceButton = this.page.find(
    '[data-qa="mark-departed-with-absence-btn"]'
  )
  #noChildrenIndicator = this.page
    .findAll('[data-qa="no-children-indicator"]')
    .first()
  #childStatusLabel = this.page.find('[data-qa="child-status"]')
  #nonAbsenceActions = this.page.find('[data-qa="non-absence-actions"]')
  #setTimeInput = new TextInput(this.page.find('[data-qa="set-time"]'))

  #markAbsentByTypeButton = (type: AbsenceType) =>
    this.page.find(`[data-qa="mark-absent-${type}"]`)

  async selectMarkPresent() {
    await this.#markPresentButton.click()
  }

  async selectPresentTab() {
    await this.#presentTab.click()
  }

  async selectChildLink(nth: number) {
    await this.#childLink(nth).click()
  }

  async selectMarkDepartedLink() {
    await this.#markDepartedLink.click()
  }

  async selectMarkDepartedButton() {
    await this.#markDepartedButton.click()
  }

  async selectMarkDepartedWithAbsenceButton() {
    await this.#markDepartedWithAbsenceButton.click()
  }

  async selectMarkAbsentByType(type: AbsenceType) {
    await this.#markAbsentByTypeButton(type).click()
  }

  async selectMarkAbsentButton() {
    await this.#markAbsentButton.click()
  }

  async assertMarkAbsenceTypeButtonsNotShown() {
    await waitUntilTrue(() => this.#nonAbsenceActions.visible)
  }

  async assertMarkAbsenceTypeButtonsAreShown(type: AbsenceType) {
    await waitUntilTrue(() => this.#markAbsentByTypeButton(type).visible)
  }

  async assertNoChildrenPresentIndicatorIsShown() {
    await waitUntilTrue(() => this.#noChildrenIndicator.visible)
  }

  async assertChildStatusLabelIsShown(expectedText: string) {
    await waitUntilEqual(() => this.#childStatusLabel.innerText, expectedText)
  }

  // time format: "09:46"
  async setTime(time: string) {
    await this.#setTimeInput.click()
    await this.#setTimeInput.type(time)
  }
}
