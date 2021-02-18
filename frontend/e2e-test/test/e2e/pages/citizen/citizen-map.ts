// SPDX-FileCopyrightText: 2017-2021 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { Selector, t } from 'testcafe'
import { Daycare } from '../../dev-api/types'
import { SelectionChip } from '../../utils/helpers'

export default class CitizenMapPage {
  readonly mapView = Selector('[data-qa="map-view"]')

  readonly daycareFilter = Selector('[data-qa="map-filter-daycare"]')
  readonly preschoolFilter = Selector('[data-qa="map-filter-preschool"]')
  readonly clubFilter = Selector('[data-qa="map-filter-club"]')

  readonly unitDetailsPanel = new UnitDetailsPanel(
    Selector('[data-qa="map-unit-details"]')
  )

  readonly map = new Map(Selector('[data-qa="map-view"]'))
  readonly searchInput = new MapSearchInput(
    Selector('[data-qa="map-search-input"]')
  )

  readonly addressMarker = Selector('[data-qa="map-marker-address"]')

  async setLanguageFilter(language: 'fi' | 'sv', selected: boolean) {
    const chip = new SelectionChip(
      Selector(`[data-qa="map-filter-${language}"]`)
    )
    if ((await chip.selected) !== selected) {
      await chip.click()
    }
  }

  listItemFor(daycare: Daycare): Selector {
    return Selector(`[data-qa="map-unit-list-${daycare.id}"]`)
  }

  mapMarkerFor(daycare: Daycare): Selector {
    return Selector(`[data-qa="map-marker-${daycare.id}"]`)
  }

  mapPopupFor(daycare: Daycare): MapPopup {
    return new MapPopup(Selector(`[data-qa="map-popup-${daycare.id}"]`))
  }
}

class UnitDetailsPanel {
  private readonly _name: Selector
  readonly backButton: Selector
  constructor(private readonly selector: Selector) {
    this._name = selector.find('[data-qa="map-unit-details-name"]')
    this.backButton = selector.find('[data-qa="map-unit-details-back"]')
  }

  get exists(): Promise<boolean> {
    return this.selector.exists
  }

  get name(): Promise<string> {
    return this._name.textContent
  }
}

class Map {
  static readonly MAX_ZOOM_ATTEMPTS = 20
  private readonly _zoomIn: Selector

  constructor(readonly selector: Selector) {
    this._zoomIn = selector.find('.leaflet-control-zoom-in')
  }

  get zoomInDisabled(): Promise<boolean> {
    return this._zoomIn.hasClass('leaflet-disabled')
  }

  async zoomInFully() {
    let attempts = 0
    while (attempts < Map.MAX_ZOOM_ATTEMPTS) {
      if (await this.zoomInDisabled) {
        return
      }
      await t.click(this._zoomIn)
      attempts++
    }
    throw new Error(`Failed to zoom in after ${attempts} attempts`)
  }
}

class MapPopup {
  private readonly _name: Selector
  constructor(private readonly selector: Selector) {
    this._name = selector.find('[data-qa="map-popup-name"]')
  }

  get visible(): Promise<boolean> {
    return this.selector.visible
  }

  get name(): Promise<string> {
    return this._name.textContent
  }
}

class MapSearchInput {
  private readonly _input: Selector
  constructor(private readonly selector: Selector) {
    this._input = selector.find('input')
  }

  async typeText(text: string) {
    await t.expect(this._input.exists).ok()
    await t.click(this.selector)
    const keys = text.split('').join(' ')
    await t.pressKey(keys)
  }

  async clickUnitResult(daycare: Daycare) {
    await t.click(this.selector.find(`[data-qa="map-search-${daycare.id}"]`))
  }

  async clickAddressResult(streetAddress: string) {
    await t.click(
      this.selector.find(
        `[data-qa="map-search-address"][data-address="${streetAddress}"]`
      )
    )
  }
}
