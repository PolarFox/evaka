// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import FiniteDateRange from 'lib-common/finite-date-range'
import type { StaffAttendanceType } from 'lib-common/generated/api-types/attendance'
import LocalDate from 'lib-common/local-date'
import type { UUID } from 'lib-common/types'

import { waitUntilEqual } from '../../../utils'
import type { Page } from '../../../utils/page'
import {
  AsyncButton,
  DatePickerDeprecated,
  Element,
  Modal,
  Select,
  SelectionChip,
  TextInput
} from '../../../utils/page'

export class UnitAttendancesPage {
  constructor(private readonly page: Page) {}

  #reservationCell = (date: LocalDate, row: number) =>
    this.page.findByDataQa(`reservation-${date.formatIso()}-${row}`)
  #attendanceCell = (date: LocalDate, row: number) =>
    this.page.findByDataQa(`attendance-${date.formatIso()}-${row}`)

  #ellipsisMenu = (childId: UUID) =>
    this.page.find(`[data-qa="ellipsis-menu-${childId}"]`)
  #editInline = this.page.find('[data-qa="menu-item-edit-row"]')

  occupancies = new UnitOccupanciesSection(
    this.page.find('[data-qa="occupancies"]')
  )

  async waitUntilLoaded() {
    await this.page
      .find('[data-qa="unit-attendances"][data-isloading="false"]')
      .waitUntilVisible()
  }

  async setFilterStartDate(date: LocalDate) {
    await new DatePickerDeprecated(
      this.page.find('[data-qa="unit-filter-start-date"]')
    ).fill(date.format())
    await this.waitUntilLoaded()
  }

  async selectMode(mode: 'week' | 'month') {
    const foo = new SelectionChip(
      this.page.find(`[data-qa="choose-calendar-mode-${mode}"]`)
    )
    await foo.click()
  }

  private async getWeekDateRange() {
    const rawRange = await this.page
      .find('[data-qa-week-range]')
      .getAttribute('data-qa-week-range')

    if (!rawRange) throw Error('Week range cannot be found')

    const [start, end] = rawRange
      .replace(/^\[/, '')
      .replace(/\]$/, '')
      .split(', ')
    return new FiniteDateRange(
      LocalDate.parseIso(start),
      LocalDate.parseIso(end)
    )
  }

  async changeWeekToDate(date: LocalDate) {
    for (let i = 0; i < 50; i++) {
      const currentRange = await this.getWeekDateRange()
      if (currentRange.includes(date)) return

      await this.page
        .findByDataQa(
          currentRange.start.isBefore(date) ? 'next-week' : 'previous-week'
        )
        .click()
      await this.waitForWeekLoaded()
    }
    throw Error(`Unable to seek to date ${date.formatIso()}`)
  }

  async childRowCount(childId: UUID): Promise<number> {
    return await this.page
      .findAllByDataQa(`reservation-row-child-${childId}`)
      .count()
  }

  async childInOtherUnitCount(childId: UUID): Promise<number> {
    return await this.page
      .findAllByDataQa(`reservation-row-child-${childId}`)
      .findAll('[data-qa="in-other-unit"]')
      .count()
  }

  getReservationStart(date: LocalDate, row: number): Promise<string> {
    return this.#reservationCell(date, row).findByDataQa('reservation-start')
      .innerText
  }

  getReservationEnd(date: LocalDate, row: number): Promise<string> {
    return this.#reservationCell(date, row).findByDataQa('reservation-end')
      .innerText
  }

  getAttendanceStart(date: LocalDate, row: number): Promise<string> {
    return this.#attendanceCell(date, row).findByDataQa('attendance-start')
      .innerText
  }

  getAttendanceEnd(date: LocalDate, row: number): Promise<string> {
    return this.#attendanceCell(date, row).findByDataQa('attendance-end')
      .innerText
  }

  async openInlineEditor(childId: UUID) {
    await this.#ellipsisMenu(childId).click()
    await this.#editInline.click()
  }

  async closeInlineEditor() {
    await this.page.findByDataQa('inline-editor-state-button').click()
  }

  async setReservationTimes(
    date: LocalDate,
    startTime: string,
    endTime: string
  ) {
    const reservations = this.#reservationCell(date, 0)
    await new TextInput(reservations.findByDataQa('input-start-time')).fill(
      startTime
    )
    await new TextInput(reservations.findByDataQa('input-end-time')).fill(
      endTime
    )
    // Click table header to trigger last input's onblur
    await this.page.findAll('thead').first().click()
  }

  async setAttendanceTimes(
    date: LocalDate,
    startTime: string,
    endTime: string
  ) {
    const attendances = this.#attendanceCell(date, 0)
    await new TextInput(attendances.findByDataQa('input-start-time')).fill(
      startTime
    )
    await new TextInput(attendances.findByDataQa('input-end-time')).fill(
      endTime
    )
    // Click table header to trigger last input's onblur
    await this.page.findAll('thead').first().click()
  }

  async openReservationModal(childId: UUID): Promise<ReservationModal> {
    await this.#ellipsisMenu(childId).click()
    await this.page.find(`[data-qa="menu-item-reservation-modal"]`).click()

    return new ReservationModal(this.page.find('[data-qa="modal"]'))
  }

  async selectPeriod(period: '1 day' | '3 months' | '6 months' | '1 year') {
    await this.page
      .find(`[data-qa="unit-filter-period-${period.replace(' ', '-')}"]`)
      .click()
  }

  async selectGroup(groupId: UUID | 'no-group' | 'staff'): Promise<void> {
    const select = new Select(
      this.page.findByDataQa('attendances-group-select')
    )
    await select.selectOption(groupId)
  }

  async staffInAttendanceTable(): Promise<string[]> {
    return this.page.findAllByDataQa('staff-attendance-name').allInnerTexts()
  }

  async assertPositiveOccupancyCoefficientCount(
    expectedCount: number
  ): Promise<void> {
    const icons = this.page.findAllByDataQa('icon-occupancy-coefficient-pos')
    await waitUntilEqual(() => icons.count(), expectedCount)
  }
  async assertZeroOccupancyCoefficientCount(
    expectedCount: number
  ): Promise<void> {
    const icons = this.page.findAllByDataQa('icon-occupancy-coefficient')
    await waitUntilEqual(() => icons.count(), expectedCount)
  }

  async clickEditOnRow(rowIx: number): Promise<void> {
    await this.page
      .findByDataQa(`attendance-row-${rowIx}`)
      .findByDataQa('row-menu')
      .click()
    await this.page.findByDataQa('menu-item-edit-row').click()
  }

  async clickCommitOnRow(rowIx: number): Promise<void> {
    await this.page
      .findByDataQa(`attendance-row-${rowIx}`)
      .findByDataQa('inline-editor-state-button')
      .click()
  }

  async openDetails(
    employeeId: string,
    date: LocalDate
  ): Promise<StaffAttendanceDetailsModal> {
    await this.page
      .findByDataQa(`day-cell-${employeeId}-${date.formatIso()}`)
      .hover()
    await this.page
      .findByDataQa(`open-details-${employeeId}-${date.formatIso()}`)
      .click()
    return new StaffAttendanceDetailsModal(
      this.page.findByDataQa('staff-attendance-details-modal')
    )
  }

  async assertNoTimeInputsVisible(): Promise<void> {
    const startInputs = this.page.findAllByDataQa('input-start-time')
    const endInputs = this.page.findAllByDataQa('input-end-time')
    await waitUntilEqual(() => startInputs.count(), 0)
    await waitUntilEqual(() => endInputs.count(), 0)
  }

  async assertCountTimeInputsVisible(count: number): Promise<void> {
    const startInputs = this.page.findAllByDataQa('input-start-time')
    const endInputs = this.page.findAllByDataQa('input-end-time')
    await waitUntilEqual(() => startInputs.count(), count)
    await waitUntilEqual(() => endInputs.count(), count)
  }

  async setNthStartTime(nth: number, time: string): Promise<void> {
    const input = new TextInput(
      this.page.findAllByDataQa('input-start-time').nth(nth)
    )
    await input.fill(time)
  }

  private nthEditor(nth: number, dayNth: number, rowIx = 0) {
    return this.page
      .findByDataQa(`attendance-row-${rowIx}`)
      .findAllByDataQa('attendance-day')
      .nth(dayNth)
      .findAllByDataQa('time-range-editor')
      .nth(nth)
  }

  async setNthArrivalDeparture(
    nth: number,
    dayNth: number,
    arrival: string,
    departure: string,
    rowIx?: number
  ): Promise<void> {
    await new TextInput(
      this.nthEditor(nth, dayNth, rowIx).findByDataQa('input-start-time')
    ).fill(arrival)
    await this.setNthDeparture(nth, dayNth, departure, rowIx)
  }

  async setNthDeparture(
    nth: number,
    dayNth: number,
    departure: string,
    rowIx?: number
  ): Promise<void> {
    await new TextInput(
      this.nthEditor(nth, dayNth, rowIx).findByDataQa('input-end-time')
    ).fill(departure)
  }

  async assertArrivalDeparture({
    rowIx,
    nth,
    timeNth,
    arrival,
    departure
  }: {
    rowIx: number
    nth: number
    timeNth?: number
    arrival: string
    departure: string
  }): Promise<void> {
    await waitUntilEqual(
      () =>
        this.page
          .findByDataQa(`attendance-row-${rowIx}`)
          .findAllByDataQa('attendance-day')
          .nth(nth)
          .findAllByDataQa('arrival-time')
          .nth(timeNth ?? 0).innerText,
      arrival
    )
    await waitUntilEqual(
      () =>
        this.page
          .findByDataQa(`attendance-row-${rowIx}`)
          .findAllByDataQa('attendance-day')
          .nth(nth)
          .findAllByDataQa('departure-time')
          .nth(timeNth ?? 0).innerText,
      departure
    )
  }

  async assertDepartureLocked(nth: number, dayNth: number, rowIx?: number) {
    await this.nthEditor(nth, dayNth, rowIx)
      .findByDataQa('departure-lock')
      .waitUntilVisible()
  }

  private async waitForWeekLoaded() {
    await waitUntilEqual(
      () =>
        this.page
          .findByDataQa('staff-attendances-status')
          .getAttribute('data-qa-value'),
      'success'
    )
  }

  async assertFormWarning() {
    await this.page.findByDataQa('form-error-warning').waitUntilVisible()
  }
}

export class ReservationModal extends Modal {
  #repetitionSelect = new Select(this.find('[data-qa="repetition"]'))
  #startDate = new TextInput(this.find('[data-qa="reservation-start-date"]'))
  #endDate = new TextInput(this.find('[data-qa="reservation-end-date"]'))

  async selectRepetitionType(value: 'DAILY' | 'WEEKLY' | 'IRREGULAR') {
    await this.#repetitionSelect.selectOption(value)
  }

  async setStartDate(date: string) {
    await this.#startDate.fill(date)
  }

  async setEndDate(date: string) {
    await this.#endDate.fill(date)
  }

  async setStartTime(time: string, index: number) {
    await new TextInput(
      this.findAll('[data-qa="reservation-start-time"]').nth(index)
    ).fill(time)
  }

  async setEndTime(time: string, index: number) {
    await new TextInput(
      this.findAll('[data-qa="reservation-end-time"]').nth(index)
    ).fill(time)
  }

  async addNewTimeRow(index: number) {
    await this.findAll(`[data-qa="add-new-reservation-timerange"]`)
      .nth(index)
      .click()
  }

  async save() {
    await this.submit()
  }

  async addReservation(endDate: LocalDate) {
    await this.selectRepetitionType('IRREGULAR')
    await this.setEndDate(endDate.format())
    await this.setStartTime('10:00', 0)
    await this.setEndTime('16:00', 0)
    await this.save()
  }

  async addOvernightReservation() {
    await this.selectRepetitionType('IRREGULAR')
    await this.setEndDate(LocalDate.todayInSystemTz().addDays(1).format())
    await this.setStartTime('22:00', 0)
    await this.setEndTime('23:59', 0)
    await this.setStartTime('00:00', 1)
    await this.setEndTime('08:00', 1)
    await this.save()
  }
}

export class UnitOccupanciesSection extends Element {
  #graph = this.find('canvas')
  #noDataPlaceholder = this.findByDataQa('no-data-placeholder')

  #elem = (
    which: 'minimum' | 'maximum' | 'no-valid-values',
    type: 'confirmed' | 'planned'
  ) => this.find(`[data-qa="occupancies-${which}-${type}"]`)

  async assertGraphIsVisible() {
    await this.#graph.waitUntilVisible()
  }

  async assertGraphHasNoData() {
    await this.#noDataPlaceholder.waitUntilVisible()
  }

  async assertNoValidValues() {
    await this.#elem('no-valid-values', 'confirmed').waitUntilVisible()
    await this.#elem('no-valid-values', 'planned').waitUntilVisible()
  }

  async assertConfirmed(minimum: string, maximum: string) {
    await waitUntilEqual(
      () => this.#elem('minimum', 'confirmed').innerText,
      minimum
    )
    await waitUntilEqual(
      () => this.#elem('maximum', 'confirmed').innerText,
      maximum
    )
  }

  async assertPlanned(minimum: string, maximum: string) {
    await waitUntilEqual(
      () => this.#elem('minimum', 'planned').innerText,
      minimum
    )
    await waitUntilEqual(
      () => this.#elem('maximum', 'planned').innerText,
      maximum
    )
  }
}

export class StaffAttendanceDetailsModal extends Element {
  async setGroup(row: number, groupId: UUID) {
    await new Select(
      this.findAllByDataQa('group-indicator')
        .nth(row)
        .findByDataQa('attendance-group-select')
    ).selectOption(groupId)
  }

  async setType(row: number, type: StaffAttendanceType) {
    await new Select(
      this.findAllByDataQa('attendance-type-select').nth(row)
    ).selectOption(type)
  }

  async setArrivalTime(row: number, time: string) {
    await new TextInput(
      this.findAllByDataQa('arrival-time-input').nth(row)
    ).fill(time)
  }

  async setDepartureTime(row: number, time: string) {
    await new TextInput(
      this.findAllByDataQa('departure-time-input').nth(row)
    ).fill(time)
  }

  async addNewAttendance() {
    await this.findByDataQa('new-attendance').click()
  }

  async save() {
    const button = new AsyncButton(this.findByDataQa('save'))
    await button.click()
    await button.waitUntilIdle()
  }

  async close() {
    await this.findByDataQa('close').click()
  }
}
