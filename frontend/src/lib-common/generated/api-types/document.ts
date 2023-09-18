// SPDX-FileCopyrightText: 2017-2023 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

// GENERATED FILE: no manual modifications
/* eslint-disable import/order, prettier/prettier, @typescript-eslint/no-namespace */

import DateRange from '../../date-range'
import HelsinkiDateTime from '../../helsinki-date-time'
import LocalDate from '../../local-date'
import { Action } from '../action'
import { UUID } from '../../types'

export namespace AnsweredQuestion {
  /**
  * Generated from fi.espoo.evaka.document.childdocument.AnsweredQuestion.CheckboxAnswer
  */
  export interface CheckboxAnswer {
    type: 'CHECKBOX'
    answer: boolean
    questionId: string
  }
  
  /**
  * Generated from fi.espoo.evaka.document.childdocument.AnsweredQuestion.CheckboxGroupAnswer
  */
  export interface CheckboxGroupAnswer {
    type: 'CHECKBOX_GROUP'
    answer: CheckboxGroupAnswerContent[]
    questionId: string
  }
  
  /**
  * Generated from fi.espoo.evaka.document.childdocument.AnsweredQuestion.RadioButtonGroupAnswer
  */
  export interface RadioButtonGroupAnswer {
    type: 'RADIO_BUTTON_GROUP'
    answer: string | null
    questionId: string
  }
  
  /**
  * Generated from fi.espoo.evaka.document.childdocument.AnsweredQuestion.TextAnswer
  */
  export interface TextAnswer {
    type: 'TEXT'
    answer: string
    questionId: string
  }
}

/**
* Generated from fi.espoo.evaka.document.childdocument.AnsweredQuestion
*/
export type AnsweredQuestion = AnsweredQuestion.CheckboxAnswer | AnsweredQuestion.CheckboxGroupAnswer | AnsweredQuestion.RadioButtonGroupAnswer | AnsweredQuestion.TextAnswer


/**
* Generated from fi.espoo.evaka.document.childdocument.CheckboxGroupAnswerContent
*/
export interface CheckboxGroupAnswerContent {
  extra: string
  optionId: string
}

/**
* Generated from fi.espoo.evaka.document.CheckboxGroupQuestionOption
*/
export interface CheckboxGroupQuestionOption {
  id: string
  label: string
  withText: boolean
}

/**
* Generated from fi.espoo.evaka.document.childdocument.ChildBasics
*/
export interface ChildBasics {
  dateOfBirth: LocalDate | null
  firstName: string
  id: UUID
  lastName: string
}

/**
* Generated from fi.espoo.evaka.document.childdocument.ChildDocumentCitizenSummary
*/
export interface ChildDocumentCitizenSummary {
  id: UUID
  publishedAt: HelsinkiDateTime
  status: DocumentStatus
  templateName: string
  type: DocumentType
  unread: boolean
}

/**
* Generated from fi.espoo.evaka.document.childdocument.ChildDocumentCreateRequest
*/
export interface ChildDocumentCreateRequest {
  childId: UUID
  templateId: UUID
}

/**
* Generated from fi.espoo.evaka.document.childdocument.ChildDocumentDetails
*/
export interface ChildDocumentDetails {
  child: ChildBasics
  content: DocumentContent
  id: UUID
  publishedAt: HelsinkiDateTime | null
  status: DocumentStatus
  template: DocumentTemplate
}

/**
* Generated from fi.espoo.evaka.document.childdocument.ChildDocumentSummary
*/
export interface ChildDocumentSummary {
  id: UUID
  publishedAt: HelsinkiDateTime | null
  status: DocumentStatus
  templateName: string
  type: DocumentType
}

/**
* Generated from fi.espoo.evaka.document.childdocument.ChildDocumentWithPermittedActions
*/
export interface ChildDocumentWithPermittedActions {
  data: ChildDocumentDetails
  permittedActions: Action.ChildDocument[]
}

/**
* Generated from fi.espoo.evaka.document.childdocument.DocumentContent
*/
export interface DocumentContent {
  answers: AnsweredQuestion[]
}

/**
* Generated from fi.espoo.evaka.document.DocumentLanguage
*/
export type DocumentLanguage =
  | 'FI'
  | 'SV'

/**
* Generated from fi.espoo.evaka.document.childdocument.DocumentStatus
*/
export type DocumentStatus =
  | 'DRAFT'
  | 'PREPARED'
  | 'COMPLETED'

/**
* Generated from fi.espoo.evaka.document.DocumentTemplate
*/
export interface DocumentTemplate {
  confidential: boolean
  content: DocumentTemplateContent
  id: UUID
  language: DocumentLanguage
  legalBasis: string
  name: string
  published: boolean
  type: DocumentType
  validity: DateRange
}

/**
* Generated from fi.espoo.evaka.document.DocumentTemplateContent
*/
export interface DocumentTemplateContent {
  sections: Section[]
}

/**
* Generated from fi.espoo.evaka.document.DocumentTemplateCreateRequest
*/
export interface DocumentTemplateCreateRequest {
  confidential: boolean
  language: DocumentLanguage
  legalBasis: string
  name: string
  type: DocumentType
  validity: DateRange
}

/**
* Generated from fi.espoo.evaka.document.DocumentTemplateSummary
*/
export interface DocumentTemplateSummary {
  id: UUID
  language: DocumentLanguage
  name: string
  published: boolean
  type: DocumentType
  validity: DateRange
}

/**
* Generated from fi.espoo.evaka.document.DocumentType
*/
export const documentTypes = [
  'PEDAGOGICAL_REPORT',
  'PEDAGOGICAL_ASSESSMENT',
  'HOJKS'
] as const

export type DocumentType = typeof documentTypes[number]

export namespace Question {
  /**
  * Generated from fi.espoo.evaka.document.Question.CheckboxGroupQuestion
  */
  export interface CheckboxGroupQuestion {
    type: 'CHECKBOX_GROUP'
    id: string
    infoText: string
    label: string
    options: CheckboxGroupQuestionOption[]
  }
  
  /**
  * Generated from fi.espoo.evaka.document.Question.CheckboxQuestion
  */
  export interface CheckboxQuestion {
    type: 'CHECKBOX'
    id: string
    infoText: string
    label: string
  }
  
  /**
  * Generated from fi.espoo.evaka.document.Question.RadioButtonGroupQuestion
  */
  export interface RadioButtonGroupQuestion {
    type: 'RADIO_BUTTON_GROUP'
    id: string
    infoText: string
    label: string
    options: RadioButtonGroupQuestionOption[]
  }
  
  /**
  * Generated from fi.espoo.evaka.document.Question.TextQuestion
  */
  export interface TextQuestion {
    type: 'TEXT'
    id: string
    infoText: string
    label: string
    multiline: boolean
  }
}

/**
* Generated from fi.espoo.evaka.document.Question
*/
export type Question = Question.CheckboxGroupQuestion | Question.CheckboxQuestion | Question.RadioButtonGroupQuestion | Question.TextQuestion


/**
* Generated from fi.espoo.evaka.document.RadioButtonGroupQuestionOption
*/
export interface RadioButtonGroupQuestionOption {
  id: string
  label: string
}

/**
* Generated from fi.espoo.evaka.document.Section
*/
export interface Section {
  id: string
  infoText: string
  label: string
  questions: Question[]
}

/**
* Generated from fi.espoo.evaka.document.childdocument.ChildDocumentController.StatusChangeRequest
*/
export interface StatusChangeRequest {
  newStatus: DocumentStatus
}
