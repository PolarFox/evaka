// SPDX-FileCopyrightText: 2017-2023 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

package fi.espoo.evaka.document.childdocument

import fi.espoo.evaka.Audit
import fi.espoo.evaka.document.DocumentTemplateContent
import fi.espoo.evaka.document.getTemplate
import fi.espoo.evaka.shared.ChildDocumentId
import fi.espoo.evaka.shared.PersonId
import fi.espoo.evaka.shared.auth.AuthenticatedUser
import fi.espoo.evaka.shared.db.Database
import fi.espoo.evaka.shared.domain.BadRequest
import fi.espoo.evaka.shared.domain.Conflict
import fi.espoo.evaka.shared.domain.EvakaClock
import fi.espoo.evaka.shared.domain.NotFound
import fi.espoo.evaka.shared.security.AccessControl
import fi.espoo.evaka.shared.security.Action
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/child-documents")
class ChildDocumentController(
    private val accessControl: AccessControl,
    private val emailNotificationService: ChildDocumentNotificationService
) {
    @PostMapping
    fun createDocument(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @RequestBody body: ChildDocumentCreateRequest
    ): ChildDocumentId {
        return db.connect { dbc ->
                dbc.transaction { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.Child.CREATE_CHILD_DOCUMENT,
                        body.childId
                    )

                    val template =
                        tx.getTemplate(body.templateId)?.also {
                            if (!it.published || !it.validity.includes(clock.today())) {
                                throw BadRequest("Invalid template")
                            }
                        }
                            ?: throw NotFound()

                    val sameTypeAlreadyStarted =
                        tx.getChildDocuments(body.childId).any {
                            it.type == template.type && it.status != DocumentStatus.COMPLETED
                        }
                    if (sameTypeAlreadyStarted) {
                        throw Conflict("Child already has incomplete document of same type")
                    }

                    tx.insertChildDocument(body)
                }
            }
            .also { Audit.ChildDocumentCreate.log(targetId = it) }
    }

    @GetMapping
    fun getDocuments(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @RequestParam(required = true) childId: PersonId
    ): List<ChildDocumentSummary> {
        return db.connect { dbc ->
                dbc.read { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.Child.READ_CHILD_DOCUMENT,
                        childId
                    )
                    tx.getChildDocuments(childId)
                }
            }
            .also { Audit.ChildDocumentRead.log(targetId = childId) }
    }

    @GetMapping("/{documentId}")
    fun getDocument(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable documentId: ChildDocumentId
    ): ChildDocumentWithPermittedActions {
        return db.connect { dbc ->
                dbc.read { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.ChildDocument.READ,
                        documentId
                    )

                    val document =
                        tx.getChildDocument(documentId)
                            ?: throw NotFound("Document $documentId not found")

                    val permittedActions =
                        accessControl.getPermittedActions<ChildDocumentId, Action.ChildDocument>(
                            tx,
                            user,
                            clock,
                            documentId
                        )

                    ChildDocumentWithPermittedActions(
                        data = document,
                        permittedActions = permittedActions
                    )
                }
            }
            .also { Audit.ChildDocumentRead.log(targetId = documentId) }
    }

    @PutMapping("/{documentId}/content")
    fun updateDocumentContent(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable documentId: ChildDocumentId,
        @RequestBody body: DocumentContent
    ) {
        db.connect { dbc ->
            dbc.transaction { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.ChildDocument.UPDATE,
                        documentId
                    )
                    val document =
                        tx.getChildDocument(documentId)
                            ?: throw NotFound("Document $documentId not found")

                    if (!document.status.editable)
                        throw BadRequest("Cannot update contents of document in this status")

                    validateContentAgainstTemplate(body, document.template.content)

                    tx.updateChildDocumentContent(documentId, document.status, body)
                }
                .also { Audit.ChildDocumentUpdateContent.log(targetId = documentId) }
        }
    }

    private fun validateContentAgainstTemplate(
        documentContent: DocumentContent,
        templateContent: DocumentTemplateContent
    ) {
        val questions = templateContent.sections.flatMap { it.questions }
        val valid =
            documentContent.answers.all { answeredQuestion ->
                questions.any { question ->
                    question.id == answeredQuestion.questionId &&
                        question.type == answeredQuestion.type &&
                        answeredQuestion.isStructurallyValid(question)
                }
            }
        if (!valid) {
            throw BadRequest("Answered questions and template do not match")
        }
    }

    @PutMapping("/{documentId}/publish")
    fun publishDocument(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable documentId: ChildDocumentId
    ) {
        db.connect { dbc ->
                dbc.transaction { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.ChildDocument.PUBLISH,
                        documentId
                    )
                    tx.publishChildDocument(documentId, clock.now())
                    emailNotificationService.scheduleEmailNotification(tx, documentId, clock.now())
                }
            }
            .also { Audit.ChildDocumentPublish.log(targetId = documentId) }
    }

    data class StatusChangeRequest(
        // needed to ensure idempotency
        val newStatus: DocumentStatus
    )

    @PutMapping("/{documentId}/next-state")
    fun nextState(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable documentId: ChildDocumentId,
        @RequestBody body: StatusChangeRequest
    ) {
        db.connect { dbc ->
                dbc.transaction { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.ChildDocument.NEXT_STATE,
                        documentId
                    )
                    val statusTransition =
                        validateStatusTransition(
                            tx = tx,
                            documentId = documentId,
                            requestedStatus = body.newStatus,
                            goingForward = true
                        )

                    tx.changeStatusAndPublish(documentId, statusTransition, clock.now())
                    emailNotificationService.scheduleEmailNotification(tx, documentId, clock.now())
                }
            }
            .also {
                Audit.ChildDocumentNextState.log(targetId = documentId, objectId = body.newStatus)
                Audit.ChildDocumentPublish.log(targetId = documentId)
            }
    }

    @PutMapping("/{documentId}/prev-state")
    fun prevState(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable documentId: ChildDocumentId,
        @RequestBody body: StatusChangeRequest
    ) {
        db.connect { dbc ->
                dbc.transaction { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.ChildDocument.NEXT_STATE,
                        documentId
                    )
                    val statusTransition =
                        validateStatusTransition(
                            tx = tx,
                            documentId = documentId,
                            requestedStatus = body.newStatus,
                            goingForward = false
                        )
                    tx.changeStatus(documentId, statusTransition)
                }
            }
            .also {
                Audit.ChildDocumentNextState.log(targetId = documentId, objectId = body.newStatus)
            }
    }

    @DeleteMapping("/{documentId}")
    fun deleteDraftDocument(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable documentId: ChildDocumentId
    ) {
        db.connect { dbc ->
                dbc.transaction { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.ChildDocument.DELETE,
                        documentId
                    )
                    tx.getChildDocument(documentId)
                    tx.deleteUnpublishedChildDocumentDraft(documentId)
                }
            }
            .also { Audit.ChildDocumentDelete.log(targetId = documentId) }
    }
}
