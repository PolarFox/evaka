// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type LocalDate from 'lib-common/local-date'

import { waitUntilEqual } from '../../utils'
import type { Page } from '../../utils/page'
import { AsyncButton, Radio, TextInput } from '../../utils/page'

export class CitizenChildPage {
  constructor(private readonly page: Page) {}

  #placements = this.page.findAllByDataQa('placement')
  #terminatedPlacements = this.page.findAllByDataQa('terminated-placement')

  async assertChildNameIsShown(name: string) {
    await this.page.find(`h1:has-text("${name}")`).waitUntilVisible()
  }

  async goBack() {
    await this.page.findText('Palaa').click()
  }

  async openCollapsible(
    collapsible: 'termination' | 'consents' | 'pedagogical-documents' | 'vasu'
  ) {
    await this.page.findByDataQa(`collapsible-${collapsible}`).click()
  }

  async assertTerminatablePlacementCount(count: number) {
    await this.#placements.assertCount(count)
  }

  async assertNonTerminatablePlacementCount(count: number) {
    await this.page
      .findAllByDataQa('non-terminatable-placement')
      .assertCount(count)
  }

  async assertTerminatedPlacementCount(count: number) {
    await this.#terminatedPlacements.assertCount(count)
  }

  getTerminatedPlacements(): Promise<string[]> {
    return this.#terminatedPlacements.allInnerTexts()
  }

  async togglePlacement(label: string) {
    await this.page.findText(label).click()
  }

  async fillTerminationDate(date: LocalDate, nth = 0) {
    await new TextInput(
      this.page.findAllByDataQa('termination-date').nth(nth)
    ).fill(date.format())
  }

  async submitTermination(nth = 0) {
    await this.page.findAll('text=Irtisano paikka').nth(nth).click()
    const modalOkButton = new AsyncButton(this.page.findByDataQa('modal-okBtn'))
    await modalOkButton.click()
    await modalOkButton.waitUntilHidden()
  }

  getTerminatablePlacements(): Promise<string[]> {
    return this.#placements.allInnerTexts()
  }

  getNonTerminatablePlacements(): Promise<string[]> {
    return this.page
      .findAllByDataQa('non-terminatable-placement')
      .allInnerTexts()
  }

  getToggledPlacements(): Promise<string[]> {
    return this.#placements.evaluateAll((elems) =>
      elems
        .filter((e) => !!e.querySelector('input:checked'))
        .map((e) => e.textContent ?? '')
    )
  }

  readonly evakaProfilePicYes = new Radio(
    this.page.findByDataQa('consent-profilepic-yes')
  )
  readonly evakaProfilePicNo = new Radio(
    this.page.findByDataQa('consent-profilepic-no')
  )

  #consentConfirmButton = this.page.findByDataQa('consent-confirm')

  async saveConsent() {
    await this.#consentConfirmButton.click()
  }

  async assertUnconsentedCount(count: number) {
    await this.page
      .findByDataQa('collapsible-consents')
      .findByDataQa('count-indicator')
      .assertTextEquals(count.toString())
  }

  readonly #vasuRowStateChip = (vasuId: string) =>
    this.page.find(`[data-qa="state-chip-${vasuId}"] >> visible=true`)
  readonly #vasuRowPublishedAt = (vasuId: string) =>
    this.page.find(`[data-qa="published-at-${vasuId}"] >> visible=true`)
  readonly #vasuChildContainer = this.page.findAll(
    `[data-qa="vasu-child-container"] >> visible=true`
  )

  async assertVasuRow(
    vasuId: string,
    expectedStatus: string,
    expectedPublishedAt: string
  ) {
    await this.#vasuRowStateChip(vasuId).assertTextEquals(expectedStatus)
    await this.#vasuRowPublishedAt(vasuId).assertTextEquals(expectedPublishedAt)
  }

  async openVasu(vasuId: string) {
    await this.page
      .findByDataQa(`vasu-${vasuId}`)
      .findByDataQa('vasu-link')
      .click()
  }

  async assertVasuChildCount(expectedCount: number) {
    await waitUntilEqual(() => this.#vasuChildContainer.count(), expectedCount)
  }
}
