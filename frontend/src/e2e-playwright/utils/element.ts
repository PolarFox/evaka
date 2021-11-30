// SPDX-FileCopyrightText: 2017-2021 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

import { Locator, Page } from 'playwright'
import {
  BoundingBox,
  toCssString,
  waitUntilEqual,
  waitUntilDefined,
  waitUntilTrue
} from '.'

/**
 * @deprecated Use playwright locators instead
 */
export class RawElementDEPRECATED {
  constructor(public page: Page, public selector: string) {}

  /**
   * Returns the client-side bounding box of this element.
   *
   * If the element does not exist on the page, an error is thrown
   */
  get boundingBox(): Promise<BoundingBox> {
    return this.page
      .$eval(this.selector, (el) => {
        // DOMRect doesn't serialize nicely, so extract the individual fields
        const rect = el.getBoundingClientRect()
        const { x, y, width, height } = rect
        return { x, y, width, height }
      })
      .then((box) => new BoundingBox(box))
  }

  get innerText(): Promise<string> {
    return this.page.innerText(this.selector)
  }

  get visible(): Promise<boolean> {
    return this.page.isVisible(this.selector)
  }

  get disabled(): Promise<boolean> {
    return this.page.isDisabled(this.selector)
  }

  async click(): Promise<void> {
    await this.page.click(this.selector)
  }

  async waitUntilVisible(): Promise<void> {
    await this.page.waitForSelector(this.selector, { state: 'visible' })
  }

  async waitUntilHidden(): Promise<void> {
    await this.page.waitForSelector(this.selector, { state: 'hidden' })
  }

  async getAttribute(name: string): Promise<string | null> {
    return this.page.getAttribute(this.selector, name)
  }

  find(descendant: string): RawElementDEPRECATED {
    return new RawElementDEPRECATED(this.page, `${this.selector} ${descendant}`)
  }

  findInput(descendant: string): RawTextInput {
    return new RawTextInput(this.page, `${this.selector} ${descendant}`)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T extends RawElementDEPRECATED> = new (...args: any[]) => T
const identity = <T>(x: T) => x
export const descendantInput = (selector: string) => `${selector} input`

export const WithChecked = <T extends Constructor<RawElementDEPRECATED>>(
  Base: T,
  inputSelector: (selector: string) => string = identity
) =>
  class Checked extends Base {
    readonly #input = inputSelector(this.selector)

    get checked(): Promise<boolean> {
      return this.page.isChecked(this.#input)
    }
  }

export const WithTextInput = <T extends Constructor<RawElementDEPRECATED>>(
  Base: T,
  inputSelector: (selector: string) => string = identity
) =>
  class TextInput extends Base {
    readonly #input = inputSelector(this.selector)

    async type(text: string): Promise<void> {
      await this.page.type(this.#input, text)
    }

    async fill(text: string): Promise<void> {
      await this.page.fill(this.#input, text)
    }

    async clear(): Promise<void> {
      await this.page.click(this.#input, { clickCount: 3 })
      await this.page.keyboard.press('Backspace')
    }
  }

export class Checkbox extends WithChecked(
  RawElementDEPRECATED,
  descendantInput
) {}

export class Radio extends WithChecked(RawElementDEPRECATED, descendantInput) {}

export class RawTextInput extends WithTextInput(RawElementDEPRECATED) {}

export class RawRadio extends WithChecked(RawElementDEPRECATED) {}

export class SelectionChip extends WithChecked(
  RawElementDEPRECATED,
  descendantInput
) {}

export class Combobox extends WithTextInput(
  RawElementDEPRECATED,
  descendantInput
) {
  findItem(label: string): RawElementDEPRECATED {
    return this.find(`[data-qa="item"]:has-text(${toCssString(label)})`)
  }
}

export class Collapsible extends RawElementDEPRECATED {
  #trigger = this.find('[data-qa="collapsible-trigger"]')

  async isOpen() {
    const status = await waitUntilDefined(() =>
      this.getAttribute('data-status')
    )
    return status !== 'closed'
  }

  async open() {
    await waitUntilTrue(async () => {
      if (!(await this.isOpen())) {
        await this.#trigger.click()
      }
      return this.isOpen()
    })
  }
}

export class AsyncButton {
  readonly #root: Locator

  constructor(root: Locator) {
    this.#root = root
  }

  async click() {
    await this.#root.click()
  }

  async status() {
    return this.#root.getAttribute('data-status')
  }

  async waitUntilSuccessful() {
    await waitUntilEqual(() => this.status(), 'success')
  }
}

export class CheckboxLocator {
  readonly #root: Locator

  constructor(root: Locator) {
    this.#root = root
  }

  async click() {
    await this.#root.click()
  }

  async isChecked() {
    return this.#root.locator('input').isChecked()
  }

  async waitUntilChecked(checked = true) {
    await waitUntilEqual(() => this.isChecked(), checked)
  }
}
