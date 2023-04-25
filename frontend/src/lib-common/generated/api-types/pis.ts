// SPDX-FileCopyrightText: 2017-2023 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

// GENERATED FILE: no manual modifications
/* eslint-disable import/order, prettier/prettier, @typescript-eslint/no-namespace */

import type DateRange from '../../date-range'
import type HelsinkiDateTime from '../../helsinki-date-time'
import type LocalDate from '../../local-date'
import { type Action } from '../action'
import { type EmployeeFeatures } from './shared'
import { type ExternalId } from './identity'
import { type IncomeEffect } from './invoicing'
import { type Nationality } from './vtjclient'
import { type NativeLanguage } from './vtjclient'
import { type UUID } from '../../types'
import { type UserRole } from './shared'

/**
* Generated from fi.espoo.evaka.pis.controllers.PersonController.AddSsnRequest
*/
export interface AddSsnRequest {
  ssn: string
}

/**
* Generated from fi.espoo.evaka.pis.CitizenUser
*/
export interface CitizenUser {
  id: UUID
}

/**
* Generated from fi.espoo.evaka.pis.controllers.CreateFosterParentRelationshipBody
*/
export interface CreateFosterParentRelationshipBody {
  childId: UUID
  parentId: UUID
  validDuring: DateRange
}

/**
* Generated from fi.espoo.evaka.pis.controllers.CreatePersonBody
*/
export interface CreatePersonBody {
  dateOfBirth: LocalDate
  email: string | null
  firstName: string
  lastName: string
  phone: string
  postOffice: string
  postalCode: string
  streetAddress: string
}

/**
* Generated from fi.espoo.evaka.pis.DaycareRole
*/
export interface DaycareRole {
  daycareId: UUID
  daycareName: string
  role: UserRole
}

/**
* Generated from fi.espoo.evaka.pis.controllers.PersonController.DisableSsnRequest
*/
export interface DisableSsnRequest {
  disabled: boolean
}

/**
* Generated from fi.espoo.evaka.pis.Employee
*/
export interface Employee {
  created: HelsinkiDateTime
  email: string | null
  externalId: ExternalId | null
  firstName: string
  id: UUID
  lastName: string
  preferredFirstName: string | null
  temporaryInUnitId: UUID | null
  updated: HelsinkiDateTime | null
}

/**
* Generated from fi.espoo.evaka.pis.controllers.EmployeeController.EmployeePreferredFirstName
*/
export interface EmployeePreferredFirstName {
  preferredFirstName: string | null
  preferredFirstNameOptions: string[]
}

/**
* Generated from fi.espoo.evaka.pis.controllers.EmployeeController.EmployeeSetPreferredFirstNameUpdateRequest
*/
export interface EmployeeSetPreferredFirstNameUpdateRequest {
  preferredFirstName: string | null
}

/**
* Generated from fi.espoo.evaka.pis.controllers.EmployeeController.EmployeeUpdate
*/
export interface EmployeeUpdate {
  globalRoles: UserRole[]
}

/**
* Generated from fi.espoo.evaka.pis.EmployeeUser
*/
export interface EmployeeUser {
  allScopedRoles: UserRole[]
  firstName: string
  globalRoles: UserRole[]
  id: UUID
  lastName: string
  preferredFirstName: string | null
}

/**
* Generated from fi.espoo.evaka.pis.SystemController.EmployeeUserResponse
*/
export interface EmployeeUserResponse {
  accessibleFeatures: EmployeeFeatures
  allScopedRoles: UserRole[]
  firstName: string
  globalRoles: UserRole[]
  id: UUID
  lastName: string
  permittedGlobalActions: Action.Global[]
}

/**
* Generated from fi.espoo.evaka.pis.EmployeeWithDaycareRoles
*/
export interface EmployeeWithDaycareRoles {
  created: HelsinkiDateTime
  daycareRoles: DaycareRole[]
  email: string | null
  firstName: string
  globalRoles: UserRole[]
  id: UUID
  lastName: string
  updated: HelsinkiDateTime | null
}

/**
* Generated from fi.espoo.evaka.pis.controllers.PersonController.EvakaRightsRequest
*/
export interface EvakaRightsRequest {
  denied: boolean
  guardianId: UUID
}

/**
* Generated from fi.espoo.evaka.pis.FamilyContact
*/
export interface FamilyContact {
  backupPhone: string
  email: string | null
  firstName: string
  id: UUID
  lastName: string
  phone: string
  postOffice: string
  postalCode: string
  priority: number | null
  role: FamilyContactRole
  streetAddress: string
}

/**
* Generated from fi.espoo.evaka.pis.controllers.FamilyContactPriorityUpdate
*/
export interface FamilyContactPriorityUpdate {
  childId: UUID
  contactPersonId: UUID
  priority: number | null
}

/**
* Generated from fi.espoo.evaka.pis.FamilyContactRole
*/
export type FamilyContactRole =
  | 'LOCAL_GUARDIAN'
  | 'LOCAL_FOSTER_PARENT'
  | 'LOCAL_ADULT'
  | 'LOCAL_SIBLING'
  | 'REMOTE_GUARDIAN'
  | 'REMOTE_FOSTER_PARENT'

/**
* Generated from fi.espoo.evaka.pis.controllers.FamilyContactUpdate
*/
export interface FamilyContactUpdate {
  backupPhone: string | null
  childId: UUID
  contactPersonId: UUID
  email: string | null
  phone: string | null
}

/**
* Generated from fi.espoo.evaka.pis.service.FamilyOverview
*/
export interface FamilyOverview {
  children: FamilyOverviewPerson[]
  headOfFamily: FamilyOverviewPerson
  partner: FamilyOverviewPerson | null
  totalIncome: FamilyOverviewIncome | null
}

/**
* Generated from fi.espoo.evaka.pis.service.FamilyOverviewIncome
*/
export interface FamilyOverviewIncome {
  effect: IncomeEffect | null
  total: number | null
}

/**
* Generated from fi.espoo.evaka.pis.service.FamilyOverviewPerson
*/
export interface FamilyOverviewPerson {
  dateOfBirth: LocalDate
  firstName: string
  headOfChild: UUID | null
  income: FamilyOverviewIncome | null
  lastName: string
  personId: UUID
  postOffice: string
  postalCode: string
  restrictedDetailsEnabled: boolean
  streetAddress: string
}

/**
* Generated from fi.espoo.evaka.pis.controllers.FosterParentRelationship
*/
export interface FosterParentRelationship {
  child: PersonSummary
  parent: PersonSummary
  relationshipId: UUID
  validDuring: DateRange
}

/**
* Generated from fi.espoo.evaka.pis.controllers.GetOrCreatePersonBySsnRequest
*/
export interface GetOrCreatePersonBySsnRequest {
  readonly: boolean
  ssn: string
}

/**
* Generated from fi.espoo.evaka.pis.controllers.PersonController.MergeRequest
*/
export interface MergeRequest {
  duplicate: UUID
  master: UUID
}

/**
* Generated from fi.espoo.evaka.pis.NewEmployee
*/
export interface NewEmployee {
  email: string | null
  employeeNumber: string | null
  externalId: ExternalId | null
  firstName: string
  lastName: string
  roles: UserRole[]
  temporaryInUnitId: UUID | null
}

/**
* Generated from fi.espoo.evaka.pis.service.PersonAddressDTO.Origin
*/
export type Origin =
  | 'VTJ'
  | 'MUNICIPAL'
  | 'EVAKA'

/**
* Generated from fi.espoo.evaka.pis.service.Parentship
*/
export interface Parentship {
  child: PersonJSON
  childId: UUID
  conflict: boolean
  endDate: LocalDate
  headOfChild: PersonJSON
  headOfChildId: UUID
  id: UUID
  startDate: LocalDate
}

/**
* Generated from fi.espoo.evaka.pis.controllers.ParentshipController.ParentshipRequest
*/
export interface ParentshipRequest {
  childId: UUID
  endDate: LocalDate
  headOfChildId: UUID
  startDate: LocalDate
}

/**
* Generated from fi.espoo.evaka.pis.controllers.ParentshipController.ParentshipUpdateRequest
*/
export interface ParentshipUpdateRequest {
  endDate: LocalDate
  startDate: LocalDate
}

/**
* Generated from fi.espoo.evaka.pis.controllers.ParentshipController.ParentshipWithPermittedActions
*/
export interface ParentshipWithPermittedActions {
  data: Parentship
  permittedActions: Action.Parentship[]
}

/**
* Generated from fi.espoo.evaka.pis.service.Partnership
*/
export interface Partnership {
  conflict: boolean
  endDate: LocalDate | null
  id: UUID
  partners: PersonJSON[]
  startDate: LocalDate
}

/**
* Generated from fi.espoo.evaka.pis.controllers.PartnershipsController.PartnershipRequest
*/
export interface PartnershipRequest {
  endDate: LocalDate | null
  person1Id: UUID
  person2Id: UUID
  startDate: LocalDate
}

/**
* Generated from fi.espoo.evaka.pis.controllers.PartnershipsController.PartnershipUpdateRequest
*/
export interface PartnershipUpdateRequest {
  endDate: LocalDate | null
  startDate: LocalDate
}

/**
* Generated from fi.espoo.evaka.pis.service.PersonAddressDTO
*/
export interface PersonAddressDTO {
  city: string
  origin: Origin
  postalCode: string
  residenceCode: string
  streetAddress: string
}

/**
* Generated from fi.espoo.evaka.pis.controllers.PersonController.PersonIdentityResponseJSON
*/
export interface PersonIdentityResponseJSON {
  id: UUID
  socialSecurityNumber: string | null
}

/**
* Generated from fi.espoo.evaka.pis.service.PersonJSON
*/
export interface PersonJSON {
  backupPhone: string
  dateOfBirth: LocalDate
  dateOfDeath: LocalDate | null
  email: string | null
  firstName: string
  forceManualFeeDecisions: boolean
  id: UUID
  invoiceRecipientName: string
  invoicingPostOffice: string
  invoicingPostalCode: string
  invoicingStreetAddress: string
  language: string | null
  lastName: string
  ophPersonOid: string | null
  phone: string
  postOffice: string
  postalCode: string
  residenceCode: string
  restrictedDetailsEnabled: boolean
  socialSecurityNumber: string | null
  ssnAddingDisabled: boolean
  streetAddress: string
  updatedFromVtj: HelsinkiDateTime | null
}

/**
* Generated from fi.espoo.evaka.pis.service.PersonPatch
*/
export interface PersonPatch {
  backupPhone: string | null
  dateOfBirth: LocalDate | null
  email: string | null
  firstName: string | null
  forceManualFeeDecisions: boolean | null
  invoiceRecipientName: string | null
  invoicingPostOffice: string | null
  invoicingPostalCode: string | null
  invoicingStreetAddress: string | null
  lastName: string | null
  ophPersonOid: string | null
  phone: string | null
  postOffice: string | null
  postalCode: string | null
  streetAddress: string | null
}

/**
* Generated from fi.espoo.evaka.pis.controllers.PersonController.PersonResponse
*/
export interface PersonResponse {
  permittedActions: Action.Person[]
  person: PersonJSON
}

/**
* Generated from fi.espoo.evaka.pis.PersonSummary
*/
export interface PersonSummary {
  dateOfBirth: LocalDate
  dateOfDeath: LocalDate | null
  firstName: string
  id: UUID
  lastName: string
  restrictedDetailsEnabled: boolean
  socialSecurityNumber: string | null
  streetAddress: string
}

/**
* Generated from fi.espoo.evaka.pis.service.PersonWithChildrenDTO
*/
export interface PersonWithChildrenDTO {
  address: PersonAddressDTO
  backupPhone: string
  children: PersonWithChildrenDTO[]
  dateOfBirth: LocalDate
  dateOfDeath: LocalDate | null
  email: string | null
  firstName: string
  id: UUID
  lastName: string
  nationalities: Nationality[]
  nativeLanguage: NativeLanguage | null
  phone: string
  preferredName: string
  residenceCode: string
  restrictedDetails: RestrictedDetails
  socialSecurityNumber: string | null
}

/**
* Generated from fi.espoo.evaka.pis.controllers.PersonalDataUpdate
*/
export interface PersonalDataUpdate {
  backupPhone: string
  email: string
  phone: string
  preferredName: string
}

/**
* Generated from fi.espoo.evaka.pis.controllers.PinCode
*/
export interface PinCode {
  pin: string
}

/**
* Generated from fi.espoo.evaka.pis.service.RestrictedDetails
*/
export interface RestrictedDetails {
  enabled: boolean
  endDate: LocalDate | null
}

/**
* Generated from fi.espoo.evaka.pis.controllers.SearchEmployeeRequest
*/
export interface SearchEmployeeRequest {
  page: number | null
  pageSize: number | null
  searchTerm: string | null
}

/**
* Generated from fi.espoo.evaka.pis.controllers.SearchPersonBody
*/
export interface SearchPersonBody {
  orderBy: string
  searchTerm: string
  sortDirection: string
}

/**
* Generated from fi.espoo.evaka.pis.TemporaryEmployee
*/
export interface TemporaryEmployee {
  firstName: string
  groupIds: UUID[]
  lastName: string
  occupancyCoefficient: number
  pinCode: PinCode | null
}
