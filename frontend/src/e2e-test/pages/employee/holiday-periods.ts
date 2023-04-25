// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { Page } from '../../utils/page'
import { Checkbox, DatePicker, Radio, TextInput } from '../../utils/page'

export class HolidayPeriodsPage {
  constructor(private readonly page: Page) {}

  get visiblePeriods(): Promise<string[]> {
    return this.page.findAllByDataQa('holiday-period').allInnerTexts()
  }

  #periodRows = this.page.findAllByDataQa('holiday-period-row')
  #questionnaireRows = this.page.findAllByDataQa('questionnaire-row')

  get visibleQuestionnaires(): Promise<string[]> {
    return this.#questionnaireRows.allInnerTexts()
  }

  async assertQuestionnaireContainsText(nth: number, texts: string[]) {
    const row = this.#questionnaireRows.nth(nth)
    for (const text of texts) {
      await row.findText(text).waitUntilVisible()
    }
  }

  async clickAddPeriodButton() {
    return this.page.findByDataQa('add-holiday-period-button').click()
  }

  async clickAddQuestionnaireButton() {
    return this.page.findByDataQa('add-questionnaire-button').click()
  }

  #periodInputs = {
    start: new DatePicker(
      this.page.findByDataQa('period').findAll('input').first()
    ),
    end: new DatePicker(
      this.page.findByDataQa('period').findAll('input').last()
    ),
    reservationDeadline: new DatePicker(
      this.page.findByDataQa('input-reservation-deadline')
    )
  }

  async fillHolidayPeriodForm(params: {
    start?: string
    end?: string
    reservationDeadline?: string
  }) {
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined) {
        await this.#periodInputs[key as keyof typeof params].fill(val)
      }
    }
  }

  confirmCheckbox = new Checkbox(this.page.findByDataQa('confirm-checkbox'))

  #questionnaireInputs = {
    activeStart: new DatePicker(this.page.findByDataQa('input-start')),
    activeEnd: new DatePicker(this.page.findByDataQa('input-end')),
    title: new TextInput(this.page.findByDataQa('input-title-fi')),
    description: new TextInput(this.page.findByDataQa('input-description-fi')),
    descriptionSv: new TextInput(
      this.page.findByDataQa('input-description-sv')
    ),
    descriptionEn: new TextInput(
      this.page.findByDataQa('input-description-en')
    ),
    descriptionLink: new TextInput(
      this.page.findByDataQa('input-description-link-fi')
    ),
    descriptionLinkSv: new TextInput(
      this.page.findByDataQa('input-description-link-sv')
    ),
    descriptionLinkEn: new TextInput(
      this.page.findByDataQa('input-description-link-en')
    ),
    fixedPeriodOptions: new TextInput(
      this.page.findByDataQa('input-fixed-period-options')
    ),
    fixedPeriodOptionLabel: new TextInput(
      this.page.findByDataQa('input-fixed-period-option-label-fi')
    )
  }

  async fillQuestionnaireForm(params: {
    title?: string
    description?: string
    descriptionSv?: string
    descriptionEn?: string
    descriptionLink?: string
    descriptionLinkSv?: string
    descriptionLinkEn?: string
    activeStart?: string
    activeEnd?: string
    fixedPeriodOptions?: string
    fixedPeriodOptionLabel?: string
  }) {
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined) {
        if (key === 'period') {
          await new Radio(this.page.findByDataQa(`period-${val}`)).click()
        } else {
          await this.#questionnaireInputs[
            key as keyof Omit<typeof params, 'period'>
          ].fill(val)
        }
      }
    }
  }

  async submit() {
    return this.page.findByDataQa('save-btn').click()
  }

  async editHolidayPeriod(nth: number) {
    return this.#periodRows.nth(nth).findByDataQa('btn-edit').click()
  }

  async deleteHolidayPeriod(nth: number) {
    await this.#periodRows.nth(nth).findByDataQa('btn-delete').click()
    return this.page.findByDataQa('modal-okBtn').click()
  }

  async editQuestionnaire(nth: number) {
    return this.#questionnaireRows.nth(nth).findByDataQa('btn-edit').click()
  }

  async deleteQuestionnaire(nth: number) {
    await this.#questionnaireRows.nth(nth).findByDataQa('btn-delete').click()
    return this.page.findByDataQa('modal-okBtn').click()
  }
}
