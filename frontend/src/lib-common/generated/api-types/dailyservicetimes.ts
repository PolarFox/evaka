// SPDX-FileCopyrightText: 2017-2023 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

// GENERATED FILE: no manual modifications
/* eslint-disable import/order, prettier/prettier, @typescript-eslint/no-namespace */

import type DateRange from '../../date-range'
import type LocalDate from '../../local-date'
import { type Action } from '../action'
import { type TimeRange } from './shared'
import { type UUID } from '../../types'

/**
* Generated from fi.espoo.evaka.dailyservicetimes.DailyServiceTimeNotification
*/
export interface DailyServiceTimeNotification {
  dateFrom: LocalDate
  hasDeletedReservations: boolean
  id: UUID
}

/**
* Generated from fi.espoo.evaka.dailyservicetimes.DailyServiceTimes
*/
export interface DailyServiceTimes {
  childId: UUID
  id: UUID
  times: DailyServiceTimesValue
}

/**
* Generated from fi.espoo.evaka.dailyservicetimes.DailyServiceTimesController.DailyServiceTimesEndDate
*/
export interface DailyServiceTimesEndDate {
  endDate: LocalDate | null
}

/**
* Generated from fi.espoo.evaka.dailyservicetimes.DailyServiceTimesController.DailyServiceTimesResponse
*/
export interface DailyServiceTimesResponse {
  dailyServiceTimes: DailyServiceTimes
  permittedActions: Action.DailyServiceTime[]
}

export namespace DailyServiceTimesValue {
  /**
  * Generated from fi.espoo.evaka.dailyservicetimes.DailyServiceTimesValue.IrregularTimes
  */
  export interface IrregularTimes {
    type: 'IRREGULAR'
    friday: TimeRange | null
    monday: TimeRange | null
    saturday: TimeRange | null
    sunday: TimeRange | null
    thursday: TimeRange | null
    tuesday: TimeRange | null
    validityPeriod: DateRange
    wednesday: TimeRange | null
  }
  
  /**
  * Generated from fi.espoo.evaka.dailyservicetimes.DailyServiceTimesValue.RegularTimes
  */
  export interface RegularTimes {
    type: 'REGULAR'
    regularTimes: TimeRange
    validityPeriod: DateRange
  }
  
  /**
  * Generated from fi.espoo.evaka.dailyservicetimes.DailyServiceTimesValue.VariableTimes
  */
  export interface VariableTimes {
    type: 'VARIABLE_TIME'
    validityPeriod: DateRange
  }
}

/**
* Generated from fi.espoo.evaka.dailyservicetimes.DailyServiceTimesValue
*/
export type DailyServiceTimesValue = DailyServiceTimesValue.IrregularTimes | DailyServiceTimesValue.RegularTimes | DailyServiceTimesValue.VariableTimes

