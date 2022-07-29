// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { Lang } from 'lib-customizations/citizen'

import { waitUntilEqual, waitUntilFalse } from '../../utils'
import type { Page } from '../../utils/page'

export default class CitizenHeader {
  constructor(
    private readonly page: Page,
    private readonly type: 'desktop' | 'mobile' = 'desktop'
  ) {}

  #menuButton = this.page.find('[data-qa="menu-button"]')
  #loginButton = this.page.find(
    `[data-qa="${this.type}-nav"] [data-qa="login-btn"]`
  )
  #languageMenuToggle = this.page.find('[data-qa="button-select-language"]')
  #languageOptionList = this.page.find('[data-qa="select-lang"]')
  #userMenu = this.page.find(`[data-qa="user-menu-title-${this.type}"]`)
  #applyingTab = this.page.find('[data-qa="nav-applying"]')
  #unreadChildDocumentsCount = this.page.findAllByDataQa(
    'unread-child-documents-count'
  )

  #languageOption(lang: Lang) {
    return this.#languageOptionList.find(`[data-qa="lang-${lang}"]`)
  }

  async logIn() {
    if (this.type === 'mobile') {
      await this.#menuButton.click()
    }
    await this.#loginButton.click()
  }

  async waitUntilLoggedIn() {
    await this.#userMenu.waitUntilVisible()
  }

  async selectTab(
    tab:
      | 'applications'
      | 'decisions'
      | 'income'
      | 'calendar'
      | 'children'
      | 'child-documents'
  ) {
    const isContainedInApplyingSubheader = [
      'applications',
      'decisions'
    ].includes(tab)
    if (this.type === 'mobile') {
      await this.#menuButton.click()
    }
    if (tab !== 'income') {
      if (isContainedInApplyingSubheader) {
        await this.page
          .find(`[data-qa="${this.type}-nav"] [data-qa="nav-applying"]`)
          .click()
        await this.page
          .find('[data-qa="applying-subnavigation"]')
          .waitUntilVisible()
        await this.page
          .find(`[data-qa="applying-subnavigation"] [data-qa="${tab}-tab"]`)
          .click()
      } else {
        await this.page
          .find(`[data-qa="${this.type}-nav"] [data-qa="nav-${tab}"]`)
          .click()
      }
    } else {
      await this.#userMenu.click()
      await this.page.find('[data-qa="user-menu-income"]').waitUntilVisible()
      await this.page.find(`[data-qa="user-menu-income"]`).click()
    }
  }

  async selectLanguage(lang: 'fi' | 'sv' | 'en') {
    await this.#languageMenuToggle.click()
    await this.#languageOption(lang).click()
  }

  async listLanguages(): Promise<Record<Lang, boolean>> {
    const isVisible = (lang: Lang) => this.#languageOption(lang).visible
    await this.#languageMenuToggle.click()
    const languages = {
      fi: await isVisible('fi'),
      sv: await isVisible('sv'),
      en: await isVisible('en')
    }
    await this.#languageMenuToggle.click()
    return languages
  }

  async assertDOMLangAttrib(lang: 'fi' | 'sv' | 'en') {
    await this.page.find(`html[lang=${lang}]`).waitUntilVisible()
  }

  async assertApplyingTabHasText(text: string) {
    await this.#applyingTab.findText(text).waitUntilVisible()
  }

  async checkPersonalDetailsAttentionIndicatorsAreShown() {
    const attentionIndicator = this.page.find(
      `[data-qa="attention-indicator-${this.type}"]`
    )
    const personalDetailsAttentionIndicator = this.page.find(
      `[data-qa="personal-details-attention-indicator-${this.type}"]`
    )

    await attentionIndicator.waitUntilVisible()
    if (this.type === 'mobile') {
      await this.#menuButton.click()
      await attentionIndicator.waitUntilVisible()
    }

    await this.#userMenu.click()
    await personalDetailsAttentionIndicator.waitUntilVisible()
  }

  async navigateToPersonalDetailsPage() {
    const personalDetailsLink = this.page.find(
      '[data-qa="user-menu-personal-details"]'
    )

    if (this.type === 'mobile' && !(await this.#userMenu.visible)) {
      await this.#menuButton.click()
    }

    if (!(await personalDetailsLink.visible)) {
      await this.#userMenu.click()
    }

    await personalDetailsLink.click()
  }

  async assertUnreadChildDocumentsCount(expectedCount: number) {
    expectedCount != 0
      ? await waitUntilEqual(
          () => this.#unreadChildDocumentsCount.first().textContent,
          expectedCount.toString()
        )
      : await waitUntilFalse(
          () => this.#unreadChildDocumentsCount.first().visible
        )
  }
}
