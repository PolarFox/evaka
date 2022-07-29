// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

// GENERATED FILE: no manual modifications
/* eslint-disable import/order, prettier/prettier */

import type { UUID } from '../../types'

/**
* Generated from fi.espoo.evaka.pairing.Employee
*/
export interface Employee {
  firstName: string
  lastName: string
}

/**
* Generated from fi.espoo.evaka.pairing.MobileDevice
*/
export interface MobileDevice {
  id: UUID
  name: string
}

/**
* Generated from fi.espoo.evaka.pairing.MobileDeviceDetails
*/
export interface MobileDeviceDetails {
  employeeId: UUID | null
  id: UUID
  name: string
  personalDevice: boolean
  unitIds: UUID[]
}

/**
* Generated from fi.espoo.evaka.pairing.MobileDeviceIdentity
*/
export interface MobileDeviceIdentity {
  id: UUID
  longTermToken: UUID
}

/**
* Generated from fi.espoo.evaka.pairing.Pairing
*/
export interface Pairing {
  challengeKey: string
  employeeId: UUID | null
  expires: Date
  id: UUID
  mobileDeviceId: UUID | null
  responseKey: string | null
  status: PairingStatus
  unitId: UUID | null
}

/**
* Generated from fi.espoo.evaka.pairing.PairingStatus
*/
export type PairingStatus =
  | 'WAITING_CHALLENGE'
  | 'WAITING_RESPONSE'
  | 'READY'
  | 'PAIRED'

/**
* Generated from fi.espoo.evaka.pairing.PairingsController.PairingStatusRes
*/
export interface PairingStatusRes {
  status: PairingStatus
}

/**
* Generated from fi.espoo.evaka.pairing.PinLoginRequest
*/
export interface PinLoginRequest {
  employeeId: UUID
  pin: string
}

/**
* Generated from fi.espoo.evaka.pairing.PinLoginResponse
*/
export interface PinLoginResponse {
  employee: Employee | null
  status: PinLoginStatus
}

/**
* Generated from fi.espoo.evaka.pairing.PinLoginStatus
*/
export type PinLoginStatus =
  | 'SUCCESS'
  | 'WRONG_PIN'
  | 'PIN_LOCKED'

/**
* Generated from fi.espoo.evaka.pairing.PairingsController.PostPairingChallengeReq
*/
export interface PostPairingChallengeReq {
  challengeKey: string
}

/**
* Generated from fi.espoo.evaka.pairing.PairingsController.PostPairingResponseReq
*/
export interface PostPairingResponseReq {
  challengeKey: string
  responseKey: string
}

/**
* Generated from fi.espoo.evaka.pairing.PairingsController.PostPairingValidationReq
*/
export interface PostPairingValidationReq {
  challengeKey: string
  responseKey: string
}

/**
* Generated from fi.espoo.evaka.pairing.MobileDevicesController.RenameRequest
*/
export interface RenameRequest {
  name: string
}
