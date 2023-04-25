// SPDX-FileCopyrightText: 2017-2023 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

// GENERATED FILE: no manual modifications
/* eslint-disable import/order, prettier/prettier, @typescript-eslint/no-namespace */

import type FiniteDateRange from '../../finite-date-range'
import type HelsinkiDateTime from '../../helsinki-date-time'
import type LocalDate from '../../local-date'
import { type Action } from '../action'
import { type EvakaUser } from './user'
import { type Language } from './daycare'
import { type PilotFeature } from './shared'
import { type ProviderType } from './daycare'
import { type ServiceNeed } from './serviceneed'
import { type UUID } from '../../types'

/**
* Generated from fi.espoo.evaka.placement.ChildBasics
*/
export interface ChildBasics {
  dateOfBirth: LocalDate
  firstName: string
  id: UUID
  lastName: string
  socialSecurityNumber: string | null
}

/**
* Generated from fi.espoo.evaka.placement.ChildPlacement
*/
export interface ChildPlacement {
  childId: UUID
  endDate: LocalDate
  id: UUID
  startDate: LocalDate
  terminatable: boolean
  terminatedBy: EvakaUser | null
  terminationRequestedDate: LocalDate | null
  type: PlacementType
  unitId: UUID
  unitName: string
}

/**
* Generated from fi.espoo.evaka.placement.PlacementControllerCitizen.ChildPlacementResponse
*/
export interface ChildPlacementResponse {
  placements: TerminatablePlacementGroup[]
}

/**
* Generated from fi.espoo.evaka.placement.DaycareBasics
*/
export interface DaycareBasics {
  area: string
  enabledPilotFeatures: PilotFeature[]
  id: UUID
  language: Language
  name: string
  providerType: ProviderType
}

/**
* Generated from fi.espoo.evaka.placement.DaycareGroupPlacement
*/
export interface DaycareGroupPlacement {
  daycarePlacementId: UUID
  endDate: LocalDate
  groupId: UUID | null
  groupName: string | null
  id: UUID | null
  startDate: LocalDate
}

/**
* Generated from fi.espoo.evaka.placement.DaycarePlacementWithDetails
*/
export interface DaycarePlacementWithDetails {
  child: ChildBasics
  daycare: DaycareBasics
  endDate: LocalDate
  groupPlacements: DaycareGroupPlacement[]
  id: UUID
  isRestrictedFromUser: boolean
  missingServiceNeedDays: number
  serviceNeeds: ServiceNeed[]
  startDate: LocalDate
  terminatedBy: EvakaUser | null
  terminationRequestedDate: LocalDate | null
  type: PlacementType
  updated: HelsinkiDateTime | null
}

/**
* Generated from fi.espoo.evaka.placement.GroupPlacementRequestBody
*/
export interface GroupPlacementRequestBody {
  endDate: LocalDate
  groupId: UUID
  startDate: LocalDate
}

/**
* Generated from fi.espoo.evaka.placement.GroupTransferRequestBody
*/
export interface GroupTransferRequestBody {
  groupId: UUID
  startDate: LocalDate
}

/**
* Generated from fi.espoo.evaka.placement.MissingGroupPlacement
*/
export interface MissingGroupPlacement {
  backup: boolean
  childId: UUID
  dateOfBirth: LocalDate
  firstName: string
  gap: FiniteDateRange
  lastName: string
  placementId: UUID
  placementPeriod: FiniteDateRange
  placementType: PlacementType | null
  serviceNeeds: MissingGroupPlacementServiceNeed[]
}

/**
* Generated from fi.espoo.evaka.placement.MissingGroupPlacementServiceNeed
*/
export interface MissingGroupPlacementServiceNeed {
  endDate: LocalDate
  nameFi: string
  startDate: LocalDate
}

/**
* Generated from fi.espoo.evaka.placement.PlacementCreateRequestBody
*/
export interface PlacementCreateRequestBody {
  childId: UUID
  endDate: LocalDate
  startDate: LocalDate
  type: PlacementType
  unitId: UUID
}

/**
* Generated from fi.espoo.evaka.placement.PlacementDraftChild
*/
export interface PlacementDraftChild {
  dob: LocalDate
  firstName: string
  id: UUID
  lastName: string
}

/**
* Generated from fi.espoo.evaka.placement.PlacementDraftPlacement
*/
export interface PlacementDraftPlacement {
  childId: UUID
  endDate: LocalDate
  id: UUID
  startDate: LocalDate
  type: PlacementType
  unit: PlacementDraftUnit
}

/**
* Generated from fi.espoo.evaka.placement.PlacementDraftUnit
*/
export interface PlacementDraftUnit {
  id: UUID
  name: string
}

/**
* Generated from fi.espoo.evaka.placement.PlacementPlanChild
*/
export interface PlacementPlanChild {
  dateOfBirth: LocalDate
  firstName: string
  id: UUID
  lastName: string
}

/**
* Generated from fi.espoo.evaka.placement.PlacementPlanConfirmationStatus
*/
export type PlacementPlanConfirmationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'REJECTED_NOT_CONFIRMED'

/**
* Generated from fi.espoo.evaka.placement.PlacementPlanDetails
*/
export interface PlacementPlanDetails {
  applicationId: UUID
  child: PlacementPlanChild
  id: UUID
  period: FiniteDateRange
  preschoolDaycarePeriod: FiniteDateRange | null
  rejectedByCitizen: boolean
  type: PlacementType
  unitConfirmationStatus: PlacementPlanConfirmationStatus
  unitId: UUID
  unitRejectOtherReason: string | null
  unitRejectReason: PlacementPlanRejectReason | null
}

/**
* Generated from fi.espoo.evaka.placement.PlacementPlanDraft
*/
export interface PlacementPlanDraft {
  child: PlacementDraftChild
  guardianHasRestrictedDetails: boolean
  period: FiniteDateRange
  placements: PlacementDraftPlacement[]
  preferredUnits: PlacementDraftUnit[]
  preschoolDaycarePeriod: FiniteDateRange | null
  type: PlacementType
}

/**
* Generated from fi.espoo.evaka.placement.PlacementPlanRejectReason
*/
export type PlacementPlanRejectReason =
  | 'OTHER'
  | 'REASON_1'
  | 'REASON_2'
  | 'REASON_3'

/**
* Generated from fi.espoo.evaka.placement.PlacementResponse
*/
export interface PlacementResponse {
  permittedPlacementActions: Record<string, Action.Placement[]>
  permittedServiceNeedActions: Record<string, Action.ServiceNeed[]>
  placements: DaycarePlacementWithDetails[]
}

/**
* Generated from fi.espoo.evaka.placement.PlacementControllerCitizen.PlacementTerminationRequestBody
*/
export interface PlacementTerminationRequestBody {
  terminateDaycareOnly: boolean | null
  terminationDate: LocalDate
  type: TerminatablePlacementType
  unitId: UUID
}

/**
* Generated from fi.espoo.evaka.placement.PlacementType
*/
export type PlacementType =
  | 'CLUB'
  | 'DAYCARE'
  | 'DAYCARE_PART_TIME'
  | 'DAYCARE_FIVE_YEAR_OLDS'
  | 'DAYCARE_PART_TIME_FIVE_YEAR_OLDS'
  | 'PRESCHOOL'
  | 'PRESCHOOL_DAYCARE'
  | 'PRESCHOOL_CLUB'
  | 'PREPARATORY'
  | 'PREPARATORY_DAYCARE'
  | 'TEMPORARY_DAYCARE'
  | 'TEMPORARY_DAYCARE_PART_DAY'
  | 'SCHOOL_SHIFT_CARE'

/**
* Generated from fi.espoo.evaka.placement.PlacementUpdateRequestBody
*/
export interface PlacementUpdateRequestBody {
  endDate: LocalDate
  startDate: LocalDate
}

/**
* Generated from fi.espoo.evaka.placement.TerminatablePlacementGroup
*/
export interface TerminatablePlacementGroup {
  additionalPlacements: ChildPlacement[]
  endDate: LocalDate
  placements: ChildPlacement[]
  startDate: LocalDate
  terminatable: boolean
  type: TerminatablePlacementType
  unitId: UUID
  unitName: string
}

/**
* Generated from fi.espoo.evaka.placement.TerminatablePlacementType
*/
export type TerminatablePlacementType =
  | 'CLUB'
  | 'PREPARATORY'
  | 'DAYCARE'
  | 'PRESCHOOL'

/**
* Generated from fi.espoo.evaka.placement.TerminatedPlacement
*/
export interface TerminatedPlacement {
  child: ChildBasics
  connectedDaycareOnly: boolean
  currentDaycareGroupName: string | null
  endDate: LocalDate
  id: UUID
  terminatedBy: EvakaUser | null
  terminationRequestedDate: LocalDate | null
  type: PlacementType
}

/**
* Generated from fi.espoo.evaka.placement.UnitChildrenCapacityFactors
*/
export interface UnitChildrenCapacityFactors {
  assistanceNeedFactor: number
  childId: UUID
  serviceNeedFactor: number
}
