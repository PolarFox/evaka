// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import type { AbsenceType } from 'lib-common/generated/api-types/daycare'
import type { UUID } from 'lib-common/types'

import { waitUntilEqual } from '../../../utils'
import type { Page } from '../../../utils/page'
import {
  Checkbox,
  Element,
  Modal,
  Radio,
  Select,
  TextInput
} from '../../../utils/page'

export class UnitDiaryPage {
  constructor(private page: Page) {}

  #unitName = this.page.find('[data-qa="attendances-unit-name"]')
  #groupSelector = new Select(
    this.page.find('[data-qa="attendances-group-select"]')
  )
  #childRows = this.page.findAll('[data-qa="absence-child-row"]')

  #staffAttendanceCells = this.page.findAll('[data-qa="staff-attendance-cell"]')
  #addAbsencesButton = this.page.find('[data-qa="add-absences-button"]')

  async assertUnitName(expectedName: string) {
    await waitUntilEqual(() => this.#unitName.innerText, expectedName)
  }

  async assertSelectedGroup(groupId: UUID) {
    await waitUntilEqual(() => this.#groupSelector.selectedOption, groupId)
  }

  async addAbsenceToChild(n: number, type: AbsenceType | 'NO_ABSENCE') {
    const childRow = new DiaryChildRow(this.#childRows.nth(n))
    await childRow.selectDay(0)
    await this.#addAbsencesButton.click()

    const modal = new AbsenceModal(this.page.find('[data-qa="absence-modal"]'))
    await modal.selectAbsenceType(type)
    await modal.selectBillableCaretype()
    await modal.submit()
  }

  async childHasAbsence(n: number, type: AbsenceType) {
    const childRow = new DiaryChildRow(this.#childRows.nth(n))
    await childRow.assertAbsenceType(0, type)
  }

  async assertTooltipContains(n: number, expectedTexts: string[]) {
    const childRow = new DiaryChildRow(this.#childRows.nth(n))
    const tooltipText = await childRow.hoverAndGetTooltip(n)
    return expectedTexts.every((text) => tooltipText.includes(text))
  }

  async childHasNoAbsence(n: number) {
    const childRow = new DiaryChildRow(this.#childRows.nth(n))
    await childRow.assertNoAbsence(0)
  }

  async fillStaffAttendance(n: number, staffCount: number) {
    const cell = this.#staffAttendanceCells.nth(n)
    await new TextInput(cell.find('input')).fill(staffCount.toString())

    // Wait until saved
    await waitUntilEqual(() => cell.getAttribute('data-state'), 'clean')
  }

  async assertStaffAttendance(n: number, staffCount: number) {
    const input = new TextInput(this.#staffAttendanceCells.nth(n).find('input'))
    await waitUntilEqual(() => input.inputValue, staffCount.toString())
  }
}

export class DiaryChildRow extends Element {
  #absenceCells = this.findAll('[data-qa="absence-cell"]')

  async selectDay(n: number) {
    await this.#absenceCells.nth(n).click()
  }

  async assertAbsenceType(n: number, type: AbsenceType) {
    await this.#absenceCells
      .nth(n)
      .find(`.absence-cell-right-${type}`)
      .waitUntilVisible()
  }

  async assertNoAbsence(n: number) {
    await this.#absenceCells
      .nth(n)
      .find(`.absence-cell-right-empty`)
      .waitUntilVisible()
  }

  async hoverAndGetTooltip(n: number): Promise<string> {
    const cell = this.#absenceCells.nth(n)
    await cell.hover()
    return (await cell.findByDataQa('absence-cell-tooltip').textContent) || ''
  }
}

export class AbsenceModal extends Modal {
  #absenceTypeRadio = (type: AbsenceType | 'NO_ABSENCE') =>
    new Radio(this.find(`[data-qa="absence-type-${type}"]`))
  #checkboxBillable = new Checkbox(
    this.find('[data-qa="absences-select-BILLABLE"]')
  )

  async selectAbsenceType(type: AbsenceType | 'NO_ABSENCE') {
    await this.#absenceTypeRadio(type).check()
  }

  async selectBillableCaretype() {
    await this.#checkboxBillable.check()
  }
}
