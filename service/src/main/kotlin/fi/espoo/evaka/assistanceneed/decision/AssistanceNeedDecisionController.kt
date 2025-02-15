// SPDX-FileCopyrightText: 2017-2020 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later
package fi.espoo.evaka.assistanceneed.decision

import fi.espoo.evaka.Audit
import fi.espoo.evaka.pis.Employee
import fi.espoo.evaka.pis.service.getChildGuardians
import fi.espoo.evaka.shared.AssistanceNeedDecisionId
import fi.espoo.evaka.shared.ChildId
import fi.espoo.evaka.shared.EmployeeId
import fi.espoo.evaka.shared.FeatureConfig
import fi.espoo.evaka.shared.async.AsyncJob
import fi.espoo.evaka.shared.async.AsyncJobRunner
import fi.espoo.evaka.shared.auth.AuthenticatedUser
import fi.espoo.evaka.shared.db.Database
import fi.espoo.evaka.shared.domain.BadRequest
import fi.espoo.evaka.shared.domain.Conflict
import fi.espoo.evaka.shared.domain.EvakaClock
import fi.espoo.evaka.shared.domain.Forbidden
import fi.espoo.evaka.shared.domain.NotFound
import fi.espoo.evaka.shared.security.AccessControl
import fi.espoo.evaka.shared.security.Action
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

data class AssistanceNeedDecisionRequest(val decision: AssistanceNeedDecisionForm)

@RestController
class AssistanceNeedDecisionController(
    private val assistanceNeedDecisionService: AssistanceNeedDecisionService,
    private val featureConfig: FeatureConfig,
    private val accessControl: AccessControl,
    private val asyncJobRunner: AsyncJobRunner<AsyncJob>
) {
    @PostMapping("/children/{childId}/assistance-needs/decision")
    fun createAssistanceNeedDecision(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable childId: ChildId,
        @RequestBody body: AssistanceNeedDecisionRequest
    ): AssistanceNeedDecision {
        return db.connect { dbc ->
                dbc.transaction { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.Child.CREATE_ASSISTANCE_NEED_DECISION,
                        childId
                    )
                    var decision: AssistanceNeedDecisionForm =
                        body.decision.copy(
                            status = AssistanceNeedDecisionStatus.DRAFT,
                            sentForDecision = null,
                            validityPeriod = body.decision.validityPeriod.copy(end = null)
                        )
                    if (decision.guardianInfo.isEmpty()) {
                        val guardianIds = tx.getChildGuardians(childId)
                        decision =
                            body.decision.copy(
                                guardianInfo =
                                    guardianIds
                                        .map { gid ->
                                            AssistanceNeedDecisionGuardian(
                                                personId = gid,
                                                name = "", // not stored
                                                isHeard = false,
                                                details = null
                                            )
                                        }
                                        .toSet()
                            )
                    }

                    tx.insertAssistanceNeedDecision(childId, decision)
                }
            }
            .also { assistanceNeedDecision ->
                Audit.ChildAssistanceNeedDecisionCreate.log(
                    targetId = childId,
                    objectId = assistanceNeedDecision.id
                )
            }
    }

    @GetMapping("/assistance-need-decision/{id}")
    fun getAssistanceNeedDecision(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable id: AssistanceNeedDecisionId
    ): AssistanceNeedDecisionResponse {
        return db.connect { dbc ->
                dbc.read { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.AssistanceNeedDecision.READ,
                        id
                    )
                    val decision = tx.getAssistanceNeedDecisionById(id)

                    AssistanceNeedDecisionResponse(
                        decision,
                        permittedActions = accessControl.getPermittedActions(tx, user, clock, id),
                        hasMissingFields = hasMissingFields(decision)
                    )
                }
            }
            .also { Audit.ChildAssistanceNeedDecisionRead.log(targetId = id) }
    }

    @PutMapping("/assistance-need-decision/{id}")
    fun updateAssistanceNeedDecision(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable id: AssistanceNeedDecisionId,
        @RequestBody body: AssistanceNeedDecisionRequest
    ) {
        return db.connect { dbc ->
                dbc.transaction { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.AssistanceNeedDecision.UPDATE,
                        id
                    )
                    val decision = tx.getAssistanceNeedDecisionById(id)

                    if (
                        decision.status != AssistanceNeedDecisionStatus.NEEDS_WORK &&
                            (decision.status != AssistanceNeedDecisionStatus.DRAFT ||
                                decision.sentForDecision != null)
                    ) {
                        throw Forbidden(
                            "Only non-sent draft or workable decisions can be edited",
                            "UNEDITABLE_DECISION"
                        )
                    }

                    tx.updateAssistanceNeedDecision(
                        id,
                        body.decision.copy(
                            sentForDecision = decision.sentForDecision,
                            status = decision.status,
                            validityPeriod =
                                if (
                                    body.decision.assistanceLevels.contains(
                                        AssistanceLevel.ASSISTANCE_SERVICES_FOR_TIME
                                    )
                                ) {
                                    body.decision.validityPeriod
                                } else {
                                    body.decision.validityPeriod.copy(end = null)
                                }
                        )
                    )
                }
            }
            .also { Audit.ChildAssistanceNeedDecisionUpdate.log(targetId = id) }
    }

    @PostMapping("/assistance-need-decision/{id}/send")
    fun sendAssistanceNeedDecision(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable id: AssistanceNeedDecisionId
    ) {
        return db.connect { dbc ->
                dbc.transaction { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.AssistanceNeedDecision.SEND,
                        id
                    )
                    val decision = tx.getAssistanceNeedDecisionById(id)

                    if (
                        decision.status != AssistanceNeedDecisionStatus.NEEDS_WORK &&
                            (decision.status != AssistanceNeedDecisionStatus.DRAFT ||
                                decision.sentForDecision != null)
                    ) {
                        throw Forbidden(
                            "Only non-sent draft or workable decisions can be sent",
                            "UNSENDABLE_DECISION"
                        )
                    }

                    if (hasMissingFields(decision)) {
                        throw BadRequest("Decision has missing fields", "MISSING_FIELDS")
                    }

                    if (decision.child?.id == null) {
                        throw BadRequest("The decision must have a child")
                    }

                    tx.updateAssistanceNeedDecision(
                        id,
                        decision
                            .copy(
                                sentForDecision = clock.today(),
                                status = AssistanceNeedDecisionStatus.DRAFT
                            )
                            .toForm(),
                        false
                    )
                }
            }
            .also { Audit.ChildAssistanceNeedDecisionSend.log(targetId = id) }
    }

    @PostMapping("/assistance-need-decision/{id}/revert-to-unsent")
    fun revertToUnsentAssistanceNeedDecision(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable id: AssistanceNeedDecisionId
    ) {
        return db.connect { dbc ->
                dbc.transaction { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.AssistanceNeedDecision.REVERT_TO_UNSENT,
                        id
                    )
                    val decision = tx.getAssistanceNeedDecisionById(id)

                    if (
                        !(decision.status == AssistanceNeedDecisionStatus.DRAFT &&
                            decision.sentForDecision != null)
                    ) {
                        throw Forbidden(
                            "Only sent draft decisions can be reverted",
                            "UNREVERTABLE_DECISION"
                        )
                    }

                    tx.updateAssistanceNeedDecision(
                        id,
                        decision.copy(sentForDecision = null).toForm(),
                        false
                    )
                }
            }
            .also { Audit.ChildAssistanceNeedDecisionRevertToUnsent.log(targetId = id) }
    }

    @GetMapping("/children/{childId}/assistance-needs/decisions")
    fun getAssistanceNeedDecisions(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable childId: ChildId
    ): List<AssistanceNeedDecisionBasicsResponse> {
        return db.connect { dbc ->
                dbc.read { tx ->
                    val filter =
                        accessControl.requireAuthorizationFilter(
                            tx,
                            user,
                            clock,
                            Action.AssistanceNeedDecision.READ
                        )
                    val decisions = tx.getAssistanceNeedDecisionsByChildId(childId, filter)
                    val permittedActions =
                        accessControl.getPermittedActions<
                            AssistanceNeedDecisionId,
                            Action.AssistanceNeedDecision
                        >(
                            tx,
                            user,
                            clock,
                            decisions.map { it.id }
                        )
                    decisions.map {
                        AssistanceNeedDecisionBasicsResponse(
                            decision = it,
                            permittedActions = permittedActions[it.id]!!
                        )
                    }
                }
            }
            .also {
                Audit.ChildAssistanceNeedDecisionsList.log(
                    targetId = childId,
                    meta = mapOf("count" to it.size)
                )
            }
    }

    @DeleteMapping("/assistance-need-decision/{id}")
    fun deleteAssistanceNeedDecision(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable id: AssistanceNeedDecisionId
    ) {
        return db.connect { dbc ->
                dbc.transaction { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.AssistanceNeedDecision.DELETE,
                        id
                    )
                    if (!tx.deleteAssistanceNeedDecision(id)) {
                        throw NotFound(
                            "Assistance need decision $id cannot found or cannot be deleted",
                            "DECISION_NOT_FOUND"
                        )
                    }
                }
            }
            .also { Audit.ChildAssistanceNeedDecisionDelete.log(targetId = id) }
    }

    @PostMapping("/assistance-need-decision/{id}/decide")
    fun decideAssistanceNeedDecision(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable id: AssistanceNeedDecisionId,
        @RequestBody body: DecideAssistanceNeedDecisionRequest
    ) {
        if (
            body.status == AssistanceNeedDecisionStatus.DRAFT ||
                body.status == AssistanceNeedDecisionStatus.ANNULLED
        ) {
            throw BadRequest(
                "Assistance need decisions cannot be decided to be a draft or annulled"
            )
        }

        return db.connect { dbc ->
                dbc.transaction { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.AssistanceNeedDecision.DECIDE,
                        id
                    )

                    val decision = tx.getAssistanceNeedDecisionById(id)

                    if (
                        decision.status == AssistanceNeedDecisionStatus.ACCEPTED ||
                            decision.status == AssistanceNeedDecisionStatus.REJECTED ||
                            decision.status == AssistanceNeedDecisionStatus.ANNULLED
                    ) {
                        throw BadRequest("Already-decided decisions cannot be decided again")
                    }

                    if (decision.child?.id == null) {
                        throw BadRequest(
                            "The assistance need decision needs to be associated with a child"
                        )
                    }

                    if (body.status == AssistanceNeedDecisionStatus.ACCEPTED) {
                        if (
                            tx.hasLaterAssistanceNeedDecisions(
                                decision.child.id,
                                decision.validityPeriod.start
                            )
                        ) {
                            throw Conflict(
                                "Another decision has the same or later start date and must be annulled",
                                "CONFLICTING_DECISION"
                            )
                        }
                        tx.endActiveAssistanceNeedDecisions(
                            decision.id,
                            decision.validityPeriod.start,
                            decision.child.id
                        )
                    }

                    tx.decideAssistanceNeedDecision(
                        id,
                        body.status,
                        if (body.status == AssistanceNeedDecisionStatus.NEEDS_WORK) null
                        else clock.today(),
                        if (body.status == AssistanceNeedDecisionStatus.NEEDS_WORK) {
                            null
                        } else {
                            tx.getChildGuardians(decision.child.id)
                        }
                    )

                    if (body.status != AssistanceNeedDecisionStatus.NEEDS_WORK) {
                        asyncJobRunner.plan(
                            tx,
                            listOf(
                                AsyncJob.SendAssistanceNeedDecisionEmail(id),
                                AsyncJob.CreateAssistanceNeedDecisionPdf(id),
                                AsyncJob.SendAssistanceNeedDecisionSfiMessage(id)
                            ),
                            runAt = clock.now()
                        )
                    }
                }
            }
            .also {
                Audit.ChildAssistanceNeedDecisionDecide.log(
                    targetId = id,
                    meta = mapOf("status" to body.status)
                )
            }
    }

    @PostMapping("/assistance-need-decision/{id}/mark-as-opened")
    fun markAssistanceNeedDecisionAsOpened(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable id: AssistanceNeedDecisionId
    ) {
        return db.connect { dbc ->
                dbc.transaction { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.AssistanceNeedDecision.MARK_AS_OPENED,
                        id
                    )
                    tx.markAssistanceNeedDecisionAsOpened(id)
                }
            }
            .also { Audit.ChildAssistanceNeedDecisionOpened.log(targetId = id) }
    }

    @PostMapping("/assistance-need-decision/{id}/update-decision-maker")
    fun updateAssistanceNeedDecisionDecisionMaker(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable id: AssistanceNeedDecisionId,
        @RequestBody body: UpdateDecisionMakerForAssistanceNeedDecisionRequest
    ) {
        return db.connect { dbc ->
                dbc.transaction { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.AssistanceNeedDecision.UPDATE_DECISION_MAKER,
                        id
                    )
                    val decision = tx.getAssistanceNeedDecisionById(id)

                    if (
                        decision.status == AssistanceNeedDecisionStatus.ACCEPTED ||
                            decision.status == AssistanceNeedDecisionStatus.REJECTED ||
                            decision.status == AssistanceNeedDecisionStatus.ANNULLED ||
                            decision.sentForDecision == null
                    ) {
                        throw BadRequest(
                            "Decision maker cannot be changed for already-decided or unsent decisions"
                        )
                    }

                    tx.updateAssistanceNeedDecision(
                        id,
                        decision
                            .copy(
                                decisionMaker =
                                    AssistanceNeedDecisionMaker(
                                        employeeId = EmployeeId(user.rawId()),
                                        title = body.title
                                    )
                            )
                            .toForm(),
                        true
                    )
                }
            }
            .also { Audit.ChildAssistanceNeedDecisionUpdateDecisionMaker.log(targetId = id) }
    }

    @GetMapping("/assistance-need-decision/{id}/decision-maker-option")
    fun getAssistanceDecisionMakerOptions(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable id: AssistanceNeedDecisionId,
    ): List<Employee> {
        return db.connect { dbc ->
                dbc.read { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.AssistanceNeedDecision.READ_DECISION_MAKER_OPTIONS,
                        id
                    )
                    assistanceNeedDecisionService.getDecisionMakerOptions(
                        tx,
                        id,
                        featureConfig.assistanceDecisionMakerRoles
                    )
                }
            }
            .also {
                Audit.ChildAssistanceNeedDecisionReadDecisionMakerOptions.log(
                    targetId = id,
                    meta = mapOf("count" to it.size)
                )
            }
    }

    @PostMapping("/assistance-need-decision/{id}/annul")
    fun annulAssistanceNeedDecision(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable id: AssistanceNeedDecisionId,
        @RequestBody body: AnnulAssistanceNeedDecisionRequest
    ) {
        if (body.reason.isEmpty()) {
            throw BadRequest("Reason must not be empty")
        }
        return db.connect { dbc ->
                dbc.transaction { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.AssistanceNeedDecision.ANNUL,
                        id
                    )
                    val decision = tx.getAssistanceNeedDecisionById(id)
                    if (decision.status != AssistanceNeedDecisionStatus.ACCEPTED) {
                        throw BadRequest("Only accepted decisions can be annulled")
                    }
                    tx.annulAssistanceNeedDecision(id, body.reason)
                }
            }
            .also { Audit.ChildAssistanceNeedDecisionAnnul.log(targetId = id) }
    }

    private fun hasMissingFields(decision: AssistanceNeedDecision): Boolean {
        return decision.selectedUnit == null ||
            (decision.assistanceLevels.contains(AssistanceLevel.ASSISTANCE_SERVICES_FOR_TIME) &&
                decision.validityPeriod.end == null) ||
            decision.pedagogicalMotivation.isNullOrEmpty() ||
            decision.guardiansHeardOn == null ||
            ((decision.preparedBy1?.employeeId == null ||
                decision.preparedBy1.title.isNullOrEmpty()) &&
                (decision.preparedBy2?.employeeId == null ||
                    decision.preparedBy2.title.isNullOrEmpty())) ||
            decision.decisionMaker?.employeeId == null ||
            decision.guardianInfo.any { !it.isHeard || it.details.isNullOrEmpty() } ||
            decision.assistanceLevels.isEmpty() ||
            (decision.otherRepresentativeHeard &&
                decision.otherRepresentativeDetails.isNullOrEmpty())
    }

    data class AssistanceNeedDecisionBasicsResponse(
        val decision: AssistanceNeedDecisionBasics,
        val permittedActions: Set<Action.AssistanceNeedDecision>
    )

    data class AssistanceNeedDecisionResponse(
        val decision: AssistanceNeedDecision,
        val permittedActions: Set<Action.AssistanceNeedDecision>,
        val hasMissingFields: Boolean
    )

    data class DecideAssistanceNeedDecisionRequest(val status: AssistanceNeedDecisionStatus)

    data class UpdateDecisionMakerForAssistanceNeedDecisionRequest(val title: String)

    data class AnnulAssistanceNeedDecisionRequest(val reason: String)
}
