// SPDX-FileCopyrightText: 2017-2020 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

package fi.espoo.evaka.application

import fi.espoo.evaka.Audit
import fi.espoo.evaka.BucketEnv
import fi.espoo.evaka.application.ApplicationStatus.ACTIVE
import fi.espoo.evaka.application.ApplicationStatus.CANCELLED
import fi.espoo.evaka.application.ApplicationStatus.CREATED
import fi.espoo.evaka.application.ApplicationStatus.REJECTED
import fi.espoo.evaka.application.ApplicationStatus.SENT
import fi.espoo.evaka.application.ApplicationStatus.WAITING_CONFIRMATION
import fi.espoo.evaka.application.ApplicationStatus.WAITING_DECISION
import fi.espoo.evaka.application.ApplicationStatus.WAITING_MAILING
import fi.espoo.evaka.application.ApplicationStatus.WAITING_PLACEMENT
import fi.espoo.evaka.application.ApplicationStatus.WAITING_UNIT_CONFIRMATION
import fi.espoo.evaka.attachment.AttachmentType
import fi.espoo.evaka.attachment.deleteAttachmentsByApplicationAndType
import fi.espoo.evaka.daycare.controllers.AdditionalInformation
import fi.espoo.evaka.daycare.controllers.Child
import fi.espoo.evaka.daycare.domain.Language
import fi.espoo.evaka.daycare.getActivePreschoolTermAt
import fi.espoo.evaka.daycare.getClubTerms
import fi.espoo.evaka.daycare.getDaycare
import fi.espoo.evaka.daycare.getPreschoolTerms
import fi.espoo.evaka.daycare.getUnitApplyPeriods
import fi.espoo.evaka.daycare.upsertChild
import fi.espoo.evaka.decision.DecisionDraftService
import fi.espoo.evaka.decision.DecisionService
import fi.espoo.evaka.decision.DecisionStatus
import fi.espoo.evaka.decision.DecisionType
import fi.espoo.evaka.decision.clearDecisionDrafts
import fi.espoo.evaka.decision.fetchDecisionDrafts
import fi.espoo.evaka.decision.getDecisionsByApplication
import fi.espoo.evaka.decision.markApplicationDecisionsSent
import fi.espoo.evaka.decision.markDecisionAccepted
import fi.espoo.evaka.decision.markDecisionRejected
import fi.espoo.evaka.identity.ExternalIdentifier
import fi.espoo.evaka.pis.getPersonById
import fi.espoo.evaka.pis.service.PersonDTO
import fi.espoo.evaka.pis.service.PersonService
import fi.espoo.evaka.pis.updatePersonBasicContactInfo
import fi.espoo.evaka.placement.PlacementPlanConfirmationStatus
import fi.espoo.evaka.placement.PlacementPlanExtent
import fi.espoo.evaka.placement.PlacementPlanRejectReason
import fi.espoo.evaka.placement.PlacementPlanService
import fi.espoo.evaka.placement.PlacementType
import fi.espoo.evaka.placement.deletePlacementPlans
import fi.espoo.evaka.placement.getPlacementPlan
import fi.espoo.evaka.placement.updatePlacementPlanUnitConfirmation
import fi.espoo.evaka.s3.DocumentService
import fi.espoo.evaka.serviceneed.ServiceNeedOptionPublicInfo
import fi.espoo.evaka.serviceneed.getServiceNeedOptionPublicInfos
import fi.espoo.evaka.shared.ApplicationId
import fi.espoo.evaka.shared.DaycareId
import fi.espoo.evaka.shared.DecisionId
import fi.espoo.evaka.shared.EvakaUserId
import fi.espoo.evaka.shared.FeatureConfig
import fi.espoo.evaka.shared.PlacementPlanId
import fi.espoo.evaka.shared.async.AsyncJob
import fi.espoo.evaka.shared.async.AsyncJobRunner
import fi.espoo.evaka.shared.auth.AuthenticatedUser
import fi.espoo.evaka.shared.db.Database
import fi.espoo.evaka.shared.domain.BadRequest
import fi.espoo.evaka.shared.domain.EvakaClock
import fi.espoo.evaka.shared.domain.HelsinkiDateTime
import fi.espoo.evaka.shared.domain.NotFound
import fi.espoo.evaka.shared.security.AccessControl
import fi.espoo.evaka.shared.security.Action
import fi.espoo.evaka.shared.security.actionrule.AccessControlFilter
import java.time.LocalDate
import org.springframework.stereotype.Service

@Service
class ApplicationStateService(
    private val accessControl: AccessControl,
    private val placementPlanService: PlacementPlanService,
    private val decisionService: DecisionService,
    private val decisionDraftService: DecisionDraftService,
    private val personService: PersonService,
    private val asyncJobRunner: AsyncJobRunner<AsyncJob>,
    private val documentClient: DocumentService,
    private val featureConfig: FeatureConfig,
    env: BucketEnv
) {
    private val filesBucket = env.attachments

    fun initializeApplicationForm(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        today: LocalDate,
        applicationId: ApplicationId,
        type: ApplicationType,
        guardian: PersonDTO,
        child: PersonDTO
    ) {
        val form =
            ApplicationForm.initForm(type, guardian, child)
                .let { form -> withDefaultStartDate(tx, today, type, form) }
                .let { form -> withDefaultOtherChildren(tx, user, guardian, child, form) }
                .let { form -> withDefaultServiceNeedOption(tx, type, form) }

        tx.updateForm(
            applicationId,
            form,
            type,
            child.restrictedDetailsEnabled,
            guardian.restrictedDetailsEnabled
        )
    }

    private fun withDefaultStartDate(
        tx: Database.Transaction,
        today: LocalDate,
        type: ApplicationType,
        form: ApplicationForm
    ): ApplicationForm {
        val startDate =
            when (type) {
                ApplicationType.PRESCHOOL ->
                    tx.getPreschoolTerms()
                        .find {
                            it.applicationPeriod.start <= today && today < it.extendedTerm.start
                        }
                        ?.extendedTerm
                        ?.start
                ApplicationType.CLUB ->
                    tx.getClubTerms()
                        .find { it.applicationPeriod.start <= today && today < it.term.start }
                        ?.term
                        ?.start
                else -> null
            }

        return form.copy(preferences = form.preferences.copy(preferredStartDate = startDate))
    }

    private fun withDefaultOtherChildren(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        guardian: PersonDTO,
        child: PersonDTO,
        form: ApplicationForm
    ): ApplicationForm {
        val vtjChildren =
            personService.getPersonWithChildren(tx, user, guardian.id)?.children ?: listOf()
        // if the applicant is not the child's guardian (ie. they are a foster parent) do not
        // include other children
        val vtjOtherChildren =
            if (vtjChildren.none { it.id == child.id }) {
                listOf()
            } else {
                vtjChildren
                    .filter { it.id != child.id }
                    .filter {
                        personService.personsLiveInTheSameAddress(guardian, it.toPersonDTO())
                    }
                    .map {
                        PersonBasics(
                            firstName = it.firstName,
                            lastName = it.lastName,
                            socialSecurityNumber = it.socialSecurityNumber
                        )
                    }
            }
        return form.copy(otherChildren = vtjOtherChildren)
    }

    private fun withDefaultServiceNeedOption(
        tx: Database.Transaction,
        type: ApplicationType,
        form: ApplicationForm
    ): ApplicationForm {
        var defaultServiceNeedOption: ServiceNeedOptionPublicInfo? = null
        if (
            ApplicationType.DAYCARE == type &&
                featureConfig.daycareApplicationServiceNeedOptionsEnabled
        ) {
            defaultServiceNeedOption =
                tx.getServiceNeedOptionPublicInfos(listOf(PlacementType.DAYCARE)).firstOrNull()
        }

        return form.copy(
            preferences =
                form.preferences.copy(
                    serviceNeed =
                        form.preferences.serviceNeed?.copy(
                            serviceNeedOption =
                                defaultServiceNeedOption?.let {
                                    ServiceNeedOption(
                                        id = it.id,
                                        nameFi = it.nameFi,
                                        nameSv = it.nameSv,
                                        nameEn = it.nameEn,
                                        validPlacementType = it.validPlacementType
                                    )
                                }
                        )
                )
        )
    }

    // STATE TRANSITIONS

    fun sendApplication(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        clock: EvakaClock,
        applicationId: ApplicationId
    ) {
        accessControl.requirePermissionFor(tx, user, clock, Action.Application.SEND, applicationId)

        val currentDate = clock.today()
        val application = getApplication(tx, applicationId)
        verifyStatus(application, CREATED)
        validateApplication(
            tx,
            application.type,
            application.form,
            currentDate,
            strict = user is AuthenticatedUser.Citizen
        )

        personService.getGuardians(tx, user, application.childId)
        tx.syncApplicationOtherGuardians(application.id)

        val applicationFlags = tx.applicationFlags(application, currentDate)
        tx.updateApplicationFlags(application.id, applicationFlags)

        val sentDate = application.sentDate ?: currentDate
        val dueDate =
            application.dueDate
                ?: calculateDueDate(
                    application.type,
                    sentDate,
                    application.form.preferences.urgent,
                    applicationFlags.isTransferApplication,
                    application.attachments
                )
        tx.updateApplicationDates(application.id, sentDate, dueDate)

        tx.getPersonById(application.guardianId)?.let {
            val email = application.form.guardian.email.ifBlank { it.email }

            tx.updatePersonBasicContactInfo(
                id = application.guardianId,
                email = email ?: "",
                phone = application.form.guardian.phoneNumber
            )
        }

        if (!application.hideFromGuardian && application.type == ApplicationType.DAYCARE) {
            val preferredUnit =
                tx.getDaycare(
                    application.form.preferences.preferredUnits.first().id
                )!! // should never be null after validation

            asyncJobRunner.plan(
                tx,
                listOf(
                    AsyncJob.SendApplicationEmail(
                        application.guardianId,
                        preferredUnit.language,
                        ApplicationType.DAYCARE
                    )
                ),
                runAt = clock.now()
            )
        }

        if (!application.hideFromGuardian && application.type == ApplicationType.CLUB) {
            asyncJobRunner.plan(
                tx,
                listOf(
                    AsyncJob.SendApplicationEmail(
                        application.guardianId,
                        Language.fi,
                        ApplicationType.CLUB
                    )
                ),
                runAt = clock.now()
            )
        }

        if (!application.hideFromGuardian && application.type == ApplicationType.PRESCHOOL) {
            val sentWithinPreschoolApplicationPeriod =
                tx.sentWithinPreschoolApplicationPeriod(sentDate)
            asyncJobRunner.plan(
                tx,
                listOf(
                    AsyncJob.SendApplicationEmail(
                        application.guardianId,
                        Language.fi,
                        ApplicationType.PRESCHOOL,
                        sentWithinPreschoolApplicationPeriod
                    )
                ),
                runAt = clock.now()
            )
        }

        tx.updateApplicationStatus(application.id, SENT)
        Audit.ApplicationSend.log(targetId = applicationId)
    }

    fun moveToWaitingPlacement(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        clock: EvakaClock,
        applicationId: ApplicationId
    ) {
        accessControl.requirePermissionFor(
            tx,
            user,
            clock,
            Action.Application.MOVE_TO_WAITING_PLACEMENT,
            applicationId
        )

        val application = getApplication(tx, applicationId)
        verifyStatus(application, SENT)

        tx.upsertChild(
            Child(
                id = application.childId,
                additionalInformation =
                    AdditionalInformation(
                        allergies = application.form.child.allergies,
                        diet = application.form.child.diet
                    )
            )
        )

        tx.setCheckedByAdminToDefault(applicationId, application.form)

        asyncJobRunner.plan(
            tx,
            listOf(AsyncJob.InitializeFamilyFromApplication(application.id, user)),
            runAt = clock.now()
        )
        tx.updateApplicationStatus(application.id, WAITING_PLACEMENT)
        Audit.ApplicationVerify.log(targetId = applicationId)
    }

    fun returnToSent(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        clock: EvakaClock,
        applicationId: ApplicationId
    ) {
        accessControl.requirePermissionFor(
            tx,
            user,
            clock,
            Action.Application.RETURN_TO_SENT,
            applicationId
        )

        val application = getApplication(tx, applicationId)
        verifyStatus(application, WAITING_PLACEMENT)
        tx.updateApplicationStatus(application.id, SENT)
        Audit.ApplicationReturnToSent.log(targetId = applicationId)
    }

    fun cancelApplication(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        clock: EvakaClock,
        applicationId: ApplicationId
    ) {
        accessControl.requirePermissionFor(
            tx,
            user,
            clock,
            Action.Application.CANCEL,
            applicationId
        )

        val application = getApplication(tx, applicationId)
        verifyStatus(application, setOf(SENT, WAITING_PLACEMENT))
        tx.updateApplicationStatus(application.id, CANCELLED)
        Audit.ApplicationCancel.log(targetId = applicationId)
    }

    fun setVerified(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        clock: EvakaClock,
        applicationId: ApplicationId
    ) {
        accessControl.requirePermissionFor(
            tx,
            user,
            clock,
            Action.Application.VERIFY,
            applicationId
        )

        val application = getApplication(tx, applicationId)
        verifyStatus(application, WAITING_PLACEMENT)
        tx.setApplicationVerified(applicationId, true)
        Audit.ApplicationAdminDetailsUpdate.log(targetId = applicationId)
    }

    fun setUnverified(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        clock: EvakaClock,
        applicationId: ApplicationId
    ) {
        accessControl.requirePermissionFor(
            tx,
            user,
            clock,
            Action.Application.VERIFY,
            applicationId
        )

        val application = getApplication(tx, applicationId)
        verifyStatus(application, WAITING_PLACEMENT)
        tx.setApplicationVerified(applicationId, false)
        Audit.ApplicationAdminDetailsUpdate.log(targetId = applicationId)
    }

    fun createPlacementPlan(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        applicationId: ApplicationId,
        placementPlan: DaycarePlacementPlan
    ): PlacementPlanId {
        val application = getApplication(tx, applicationId)
        verifyStatus(application, WAITING_PLACEMENT)

        val guardian =
            tx.getPersonById(application.guardianId) ?: throw NotFound("Guardian not found")
        val secondDecisionTo =
            personService
                .getGuardians(tx, user, application.childId, true)
                .firstOrNull {
                    it.id != guardian.id &&
                        !livesInSameAddress(guardian.residenceCode, it.residenceCode)
                }
                ?.id

        tx.updateApplicationOtherGuardian(applicationId, secondDecisionTo)
        val placementPlanId =
            placementPlanService.createPlacementPlan(tx, application, placementPlan)
        decisionDraftService.createDecisionDrafts(tx, user, application)

        tx.updateApplicationStatus(application.id, WAITING_DECISION)
        return placementPlanId
    }

    fun cancelPlacementPlan(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        clock: EvakaClock,
        applicationId: ApplicationId
    ) {
        accessControl.requirePermissionFor(
            tx,
            user,
            clock,
            Action.Application.CANCEL_PLACEMENT_PLAN,
            applicationId
        )

        val application = getApplication(tx, applicationId)
        verifyStatus(application, WAITING_DECISION)
        tx.deletePlacementPlans(listOf(application.id))
        tx.clearDecisionDrafts(listOf(application.id))
        tx.updateApplicationStatus(application.id, WAITING_PLACEMENT)
        Audit.ApplicationReturnToWaitingPlacement.log(targetId = applicationId)
    }

    fun sendDecisionsWithoutProposal(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        clock: EvakaClock,
        applicationId: ApplicationId
    ) {
        accessControl.requirePermissionFor(
            tx,
            user,
            clock,
            Action.Application.SEND_DECISIONS_WITHOUT_PROPOSAL,
            applicationId
        )

        val application = getApplication(tx, applicationId)
        verifyStatus(application, WAITING_DECISION)
        val decisionIds = finalizeDecisions(tx, user, clock, application)
        Audit.ApplicationSendDecisionsWithoutProposal.log(
            targetId = applicationId,
            objectId = decisionIds
        )
    }

    fun sendPlacementProposal(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        clock: EvakaClock,
        applicationId: ApplicationId
    ) {
        accessControl.requirePermissionFor(
            tx,
            user,
            clock,
            Action.Application.SEND_PLACEMENT_PROPOSAL,
            applicationId
        )

        val application = getApplication(tx, applicationId)
        verifyStatus(application, WAITING_DECISION)
        tx.updateApplicationStatus(application.id, WAITING_UNIT_CONFIRMATION)
        Audit.PlacementProposalCreate.log(targetId = applicationId)
    }

    fun withdrawPlacementProposal(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        clock: EvakaClock,
        applicationId: ApplicationId
    ) {
        accessControl.requirePermissionFor(
            tx,
            user,
            clock,
            Action.Application.WITHDRAW_PLACEMENT_PROPOSAL,
            applicationId
        )

        val application = getApplication(tx, applicationId)
        verifyStatus(application, WAITING_UNIT_CONFIRMATION)
        tx.updateApplicationStatus(application.id, WAITING_DECISION)
        Audit.ApplicationReturnToWaitingDecision.log(targetId = applicationId)
    }

    fun respondToPlacementProposal(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        clock: EvakaClock,
        applicationId: ApplicationId,
        status: PlacementPlanConfirmationStatus,
        rejectReason: PlacementPlanRejectReason? = null,
        rejectOtherReason: String? = null
    ) {
        accessControl.requirePermissionFor(
            tx,
            user,
            clock,
            Action.Application.RESPOND_TO_PLACEMENT_PROPOSAL,
            applicationId
        )

        val application = getApplication(tx, applicationId)
        verifyStatus(application, WAITING_UNIT_CONFIRMATION)

        if (
            status == PlacementPlanConfirmationStatus.REJECTED ||
                status == PlacementPlanConfirmationStatus.REJECTED_NOT_CONFIRMED
        ) {
            if (rejectReason == null) {
                throw BadRequest("Must give reason for rejecting")
            }
            if (
                rejectReason == PlacementPlanRejectReason.OTHER && rejectOtherReason.isNullOrBlank()
            ) {
                throw BadRequest("Must describe other reason for rejecting")
            }

            tx.updatePlacementPlanUnitConfirmation(
                applicationId,
                status,
                rejectReason,
                rejectOtherReason
            )
        } else {
            tx.updatePlacementPlanUnitConfirmation(applicationId, status, null, null)
        }
        Audit.PlacementPlanRespond.log(targetId = applicationId, meta = mapOf("status" to status))
    }

    fun confirmPlacementProposalChanges(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        clock: EvakaClock,
        unitId: DaycareId
    ) {
        accessControl.requirePermissionFor(
            tx,
            user,
            clock,
            Action.Unit.ACCEPT_PLACEMENT_PROPOSAL,
            unitId
        )

        // language=sql
        val rejectSQL =
            """
            UPDATE placement_plan
            SET unit_confirmation_status = 'REJECTED'
            WHERE 
                unit_id = :unitId AND
                unit_confirmation_status = 'REJECTED_NOT_CONFIRMED'
            """
                .trimIndent()

        tx.createUpdate(rejectSQL).bind("unitId", unitId).execute()

        // language=sql
        val acceptSQL =
            """
            SELECT application_id
            FROM placement_plan pp
            JOIN application a ON a.id = pp.application_id
            WHERE 
                a.status = 'WAITING_UNIT_CONFIRMATION'::application_status_type AND 
                pp.unit_id = :unitId AND
                pp.unit_confirmation_status = 'ACCEPTED'
            """
                .trimIndent()

        val validIds =
            tx.createQuery(acceptSQL).bind("unitId", unitId).mapTo<ApplicationId>().toList()

        validIds.map { getApplication(tx, it) }.forEach { finalizeDecisions(tx, user, clock, it) }
        Audit.PlacementProposalAccept.log(targetId = unitId, objectId = validIds)
    }

    fun confirmDecisionMailed(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        clock: EvakaClock,
        applicationId: ApplicationId
    ) {
        accessControl.requirePermissionFor(
            tx,
            user,
            clock,
            Action.Application.CONFIRM_DECISIONS_MAILED,
            applicationId
        )

        val application = getApplication(tx, applicationId)
        verifyStatus(application, WAITING_MAILING)
        tx.updateApplicationStatus(application.id, WAITING_CONFIRMATION)
        tx.markApplicationDecisionsSent(application.id, clock.today())
        Audit.ApplicationConfirmDecisionsMailed.log(targetId = applicationId)
    }

    fun acceptDecision(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        clock: EvakaClock,
        applicationId: ApplicationId,
        decisionId: DecisionId,
        requestedStartDate: LocalDate
    ) {
        accessControl.requirePermissionFor(
            tx,
            user,
            clock,
            Action.Application.ACCEPT_DECISION,
            applicationId
        )

        val application = getApplication(tx, applicationId)
        verifyStatus(application, setOf(WAITING_CONFIRMATION, ACTIVE))

        val decisions = tx.getDecisionsByApplication(applicationId, AccessControlFilter.PermitAll)

        val decision =
            decisions.find { it.id == decisionId }
                ?: throw NotFound("Decision $decisionId not found on application $applicationId")

        if (decision.status != DecisionStatus.PENDING) {
            throw BadRequest("Decision is not pending")
        }

        if (
            (decision.type == DecisionType.PRESCHOOL_DAYCARE ||
                decision.type == DecisionType.PRESCHOOL_CLUB) &&
                decisions.any {
                    it.type in listOf(DecisionType.PRESCHOOL, DecisionType.PREPARATORY_EDUCATION) &&
                        it.status != DecisionStatus.ACCEPTED
                }
        ) {
            throw BadRequest("Primary decision must be accepted first")
        }

        if (!decision.validRequestedStartDatePeriod(featureConfig).includes(requestedStartDate)) {
            throw BadRequest(
                "Invalid start date $requestedStartDate for ${decision.type} [${decision.startDate}, ${decision.endDate}]",
                "decision.validation.invalid-requested-start-date"
            )
        }

        val plan =
            tx.getPlacementPlan(applicationId)
                ?: throw IllegalStateException("Application $applicationId has no placement plan")

        val extent =
            when (plan.type) {
                PlacementType.PRESCHOOL_DAYCARE,
                PlacementType.PRESCHOOL_CLUB,
                PlacementType.PREPARATORY_DAYCARE -> {
                    when (decision.type) {
                        DecisionType.PRESCHOOL,
                        DecisionType.PREPARATORY_EDUCATION ->
                            PlacementPlanExtent.OnlyPreschool(
                                plan.period.copy(start = requestedStartDate)
                            )
                        DecisionType.PRESCHOOL_DAYCARE,
                        DecisionType.PRESCHOOL_CLUB ->
                            PlacementPlanExtent.OnlyPreschoolDaycare(
                                plan.preschoolDaycarePeriod!!.copy(start = requestedStartDate)
                            )
                        else ->
                            throw IllegalStateException(
                                "Placement plan ${plan.id} has type ${plan.type} but decision ${decision.id} has type ${decision.type}"
                            )
                    }
                }
                else -> PlacementPlanExtent.FullSingle(plan.period.copy(start = requestedStartDate))
            }

        // everything validated now!

        tx.markDecisionAccepted(user, clock, decision.id, requestedStartDate)

        placementPlanService.applyPlacementPlan(
            tx,
            clock,
            application,
            if (featureConfig.applyPlacementUnitFromDecision) decision.unit.id else plan.unitId,
            plan.type,
            extent
        )

        placementPlanService.softDeleteUnusedPlacementPlanByApplication(tx, applicationId)

        if (application.status == WAITING_CONFIRMATION) {
            tx.updateApplicationStatus(application.id, ACTIVE)
        }
        Audit.DecisionAccept.log(
            targetId = decisionId,
            meta =
                mapOf("applicationId" to applicationId, "requestedStartDate" to requestedStartDate)
        )
    }

    fun rejectDecision(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        clock: EvakaClock,
        applicationId: ApplicationId,
        decisionId: DecisionId
    ) {
        accessControl.requirePermissionFor(
            tx,
            user,
            clock,
            Action.Application.REJECT_DECISION,
            applicationId
        )

        val application = getApplication(tx, applicationId)
        verifyStatus(application, setOf(WAITING_CONFIRMATION, ACTIVE, REJECTED))

        val decisions = tx.getDecisionsByApplication(applicationId, AccessControlFilter.PermitAll)
        val decision =
            decisions.find { it.id == decisionId }
                ?: throw NotFound("Decision $decisionId not found on application $applicationId")

        if (decision.status != DecisionStatus.PENDING) {
            throw BadRequest("Decision is not pending")
        }

        tx.markDecisionRejected(user, clock, decisionId)

        val alsoReject =
            if (
                decision.type in listOf(DecisionType.PRESCHOOL, DecisionType.PREPARATORY_EDUCATION)
            ) {
                decisions.find {
                    (it.type === DecisionType.PRESCHOOL_DAYCARE ||
                        it.type == DecisionType.PRESCHOOL_CLUB) &&
                        it.status == DecisionStatus.PENDING
                }
            } else {
                null
            }
        alsoReject?.let { tx.markDecisionRejected(user, clock, it.id) }

        placementPlanService.softDeleteUnusedPlacementPlanByApplication(tx, applicationId)

        if (application.status == WAITING_CONFIRMATION) {
            tx.updateApplicationStatus(application.id, REJECTED)
        }
        Audit.DecisionReject.log(targetId = decisionId)
    }

    // CONTENT UPDATE

    fun updateOwnApplicationContentsCitizen(
        tx: Database.Transaction,
        user: AuthenticatedUser.Citizen,
        applicationId: ApplicationId,
        update: CitizenApplicationUpdate,
        currentDate: LocalDate,
        asDraft: Boolean = false
    ): ApplicationDetails {
        val original =
            tx.fetchApplicationDetails(applicationId)?.takeIf { it.guardianId == user.id }
                ?: throw NotFound("Application $applicationId of guardian ${user.id} not found")

        val updatedForm = original.form.update(update.form)

        if (!updatedForm.preferences.urgent) {
            val deleted =
                tx.deleteAttachmentsByApplicationAndType(
                    applicationId,
                    AttachmentType.URGENCY,
                    user.evakaUserId
                )
            deleted.forEach { documentClient.delete(filesBucket, "$it") }
        }

        if (updatedForm.preferences.serviceNeed?.shiftCare != true) {
            val deleted =
                tx.deleteAttachmentsByApplicationAndType(
                    applicationId,
                    AttachmentType.EXTENDED_CARE,
                    user.evakaUserId
                )
            deleted.forEach { documentClient.delete(filesBucket, "$it") }
        }

        if (asDraft) {
            if (original.status !== CREATED)
                throw BadRequest("Cannot save as draft, application already sent")
        } else {
            validateApplication(tx, original.type, updatedForm, currentDate, strict = true)

            if (listOf(SENT).contains(original.status)) {
                original.form.preferences.preferredStartDate?.let { previousStartDate ->
                    updatedForm.preferences.preferredStartDate?.let { newStartDate ->
                        if (previousStartDate.isAfter(newStartDate)) {
                            throw BadRequest(
                                "Moving start date $previousStartDate earlier to $newStartDate is not allowed"
                            )
                        }
                    }
                }
                tx.syncApplicationOtherGuardians(applicationId)
            }
        }

        tx.updateApplicationAllowOtherGuardianAccess(applicationId, update.allowOtherGuardianAccess)
        tx.updateApplicationContents(currentDate, original, updatedForm)
        return getApplication(tx, applicationId)
    }

    fun updateApplicationContentsServiceWorker(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        applicationId: ApplicationId,
        update: ApplicationUpdate,
        userId: EvakaUserId,
        currentDate: LocalDate
    ) {
        val original =
            tx.fetchApplicationDetails(applicationId)
                ?: throw NotFound("Application $applicationId was not found")

        val updatedForm = original.form.update(update.form)
        validateApplication(tx, original.type, updatedForm, currentDate, strict = false)

        if (!updatedForm.preferences.urgent) {
            val deleted =
                tx.deleteAttachmentsByApplicationAndType(
                    applicationId,
                    AttachmentType.URGENCY,
                    userId
                )
            deleted.forEach { documentClient.delete(filesBucket, "$it") }
        }

        if (updatedForm.preferences.serviceNeed?.shiftCare != true) {
            val deleted =
                tx.deleteAttachmentsByApplicationAndType(
                    applicationId,
                    AttachmentType.EXTENDED_CARE,
                    userId
                )
            deleted.forEach { documentClient.delete(filesBucket, "$it") }
        }

        tx.updateApplicationContents(
            currentDate,
            original,
            updatedForm,
            manuallySetDueDate = update.dueDate
        )
    }

    private fun Database.Read.sentWithinPreschoolApplicationPeriod(sentDate: LocalDate): Boolean {
        return createQuery("SELECT 1 FROM preschool_term WHERE application_period @> :date")
            .bind("date", sentDate)
            .mapTo<Boolean>()
            .toList()
            .firstOrNull()
            ?: false
    }

    private fun Database.Transaction.updateApplicationContents(
        today: LocalDate,
        original: ApplicationDetails,
        updatedForm: ApplicationForm,
        manuallySetDueDate: LocalDate? = null
    ) {
        if (!listOf(CREATED, SENT).contains(original.status)) {
            throw BadRequest("Cannot update application with status ${original.status}")
        }

        updateForm(
            original.id,
            updatedForm,
            original.type,
            original.childRestricted,
            original.guardianRestricted
        )
        setCheckedByAdminToDefault(original.id, updatedForm)
        when (manuallySetDueDate) {
            null -> calculateAndUpdateDueDate(today, original, updatedForm.preferences.urgent)
            else -> updateManuallySetDueDate(original.id, manuallySetDueDate)
        }
    }

    private fun Database.Transaction.updateManuallySetDueDate(
        applicationId: ApplicationId,
        manuallySetDueDate: LocalDate
    ) {
        createUpdate(
                "UPDATE application SET duedate = :dueDate, duedate_set_manually_at = :dueDateSetManuallyAt WHERE id = :id"
            )
            .bind("id", applicationId)
            .bind("dueDate", manuallySetDueDate)
            .bind("dueDateSetManuallyAt", HelsinkiDateTime.now())
            .execute()
    }

    private fun Database.Transaction.calculateAndUpdateDueDate(
        today: LocalDate,
        original: ApplicationDetails,
        urgent: Boolean
    ) {
        if (original.sentDate == null || original.dueDateSetManuallyAt != null) return

        // If an application is flagged as urgent afterwards, the new due date is calculated from
        // current date
        val sentDate = if (urgent && !original.form.preferences.urgent) today else original.sentDate
        val newDueDate =
            calculateDueDate(
                original.type,
                sentDate,
                urgent,
                original.transferApplication,
                original.attachments
            )

        if (newDueDate == original.dueDate) return

        createUpdate("UPDATE application SET duedate = :dueDate WHERE id = :id")
            .bind("id", original.id)
            .bind("dueDate", newDueDate)
            .execute()
    }

    fun reCalculateDueDate(
        tx: Database.Transaction,
        today: LocalDate,
        applicationId: ApplicationId
    ) {
        val application =
            tx.fetchApplicationDetails(applicationId)
                ?: throw NotFound("Application $applicationId was not found")
        tx.calculateAndUpdateDueDate(today, application, application.form.preferences.urgent)
    }

    // HELPERS

    private fun getApplication(
        tx: Database.Read,
        applicationId: ApplicationId
    ): ApplicationDetails {
        return tx.fetchApplicationDetails(applicationId)
            ?: throw NotFound("Application $applicationId not found")
    }

    private fun verifyStatus(application: ApplicationDetails, status: ApplicationStatus) {
        if (application.status != status) {
            throw BadRequest("Expected status $status but was ${application.status}")
        }
    }

    private fun verifyStatus(application: ApplicationDetails, statuses: Set<ApplicationStatus>) {
        if (!statuses.contains(application.status)) {
            throw BadRequest(
                "Expected status to be one of [${statuses.joinToString(separator = ", ")}] but was ${application.status}"
            )
        }
    }

    private fun validateApplication(
        tx: Database.Read,
        type: ApplicationType,
        application: ApplicationForm,
        currentDate: LocalDate,
        strict: Boolean
    ) {
        val preferredStartDate = application.preferences.preferredStartDate
        if (type == ApplicationType.PRESCHOOL && preferredStartDate != null) {
            val canApplyForPreferredDate =
                tx.getActivePreschoolTermAt(preferredStartDate)?.isApplicationAccepted(currentDate)
                    ?: false
            if (!canApplyForPreferredDate) {
                throw BadRequest("Cannot apply to preschool on $preferredStartDate at the moment")
            }
        }

        if (type == ApplicationType.CLUB && preferredStartDate != null) {
            val canApplyForPreferredDate =
                tx.getClubTerms().any { it.term.includes(preferredStartDate) }
            if (!canApplyForPreferredDate) {
                throw BadRequest("Cannot apply to club on $preferredStartDate")
            }
        }

        val unitIds = application.preferences.preferredUnits.map { it.id }

        if (unitIds.isEmpty()) {
            throw BadRequest("Must have at least one preferred unit")
        } else {
            val daycares = tx.getUnitApplyPeriods(unitIds.toSet())
            if (daycares.size < unitIds.toSet().size) {
                throw BadRequest("Some unit was not found")
            }
            if (strict) {
                if (preferredStartDate != null) {
                    for (daycare in daycares) {
                        if (
                            type == ApplicationType.DAYCARE &&
                                (daycare.daycareApplyPeriod == null ||
                                    !daycare.daycareApplyPeriod.includes(preferredStartDate))
                        ) {
                            throw BadRequest(
                                "Cannot apply for daycare in ${daycare.id} (preferred start date $preferredStartDate, apply period ${daycare.daycareApplyPeriod})"
                            )
                        }
                        if (
                            type == ApplicationType.PRESCHOOL &&
                                (daycare.preschoolApplyPeriod == null ||
                                    !daycare.preschoolApplyPeriod.includes(preferredStartDate))
                        ) {
                            throw BadRequest(
                                "Cannot apply for preschool in ${daycare.id} (preferred start date $preferredStartDate, apply period ${daycare.daycareApplyPeriod})"
                            )
                        }
                        if (
                            type == ApplicationType.CLUB &&
                                (daycare.clubApplyPeriod == null ||
                                    !daycare.clubApplyPeriod.includes(preferredStartDate))
                        ) {
                            throw BadRequest(
                                "Cannot apply for club in ${daycare.id} (preferred start date $preferredStartDate, apply period ${daycare.daycareApplyPeriod})"
                            )
                        }
                    }
                }
            }
        }
    }

    private fun calculateDueDate(
        applicationType: ApplicationType,
        sentDate: LocalDate,
        isUrgent: Boolean,
        isTransferApplication: Boolean,
        attachments: List<ApplicationAttachment>
    ): LocalDate? {
        return if (isTransferApplication) {
            null
        } else if (applicationType == ApplicationType.PRESCHOOL) {
            sentDate // todo: is this correct? seems weird
        } else {
            if (isUrgent) {
                // due date should not be set at all if attachments are missing
                if (attachments.isEmpty()) return null
                // due date is two weeks from application.sentDate or the first attachment,
                // whichever is later
                val minAttachmentDate =
                    attachments.minByOrNull { it.receivedAt }?.let { it.receivedAt.toLocalDate() }
                listOfNotNull(minAttachmentDate, sentDate).maxOrNull()?.plusWeeks(2)
            } else {
                sentDate.plusMonths(4)
            }
        }
    }

    private fun finalizeDecisions(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        clock: EvakaClock,
        application: ApplicationDetails
    ): List<DecisionId> {
        val sendBySfi = canSendDecisionsBySfi(tx, user, application)
        val decisionDrafts = tx.fetchDecisionDrafts(application.id)
        if (decisionDrafts.any { it.planned }) {
            val decisionIds =
                decisionService.finalizeDecisions(tx, user, clock, application.id, sendBySfi)
            tx.updateApplicationStatus(
                application.id,
                if (sendBySfi) WAITING_CONFIRMATION else WAITING_MAILING
            )
            return decisionIds
        } else {
            return emptyList()
        }
    }

    private fun canSendDecisionsBySfi(
        tx: Database.Transaction,
        user: AuthenticatedUser,
        application: ApplicationDetails
    ): Boolean {
        val hasSsn =
            (tx.getPersonById(application.guardianId)!!.identity is ExternalIdentifier.SSN &&
                tx.getPersonById(application.childId)!!.identity is ExternalIdentifier.SSN)
        val guardianIsVtjGuardian =
            personService
                .getGuardians(tx, user, application.childId)
                .filter { it.dateOfDeath == null }
                .any { it.id == application.guardianId }

        return hasSsn && guardianIsVtjGuardian
    }

    private fun livesInSameAddress(residenceCode1: String?, residenceCode2: String?): Boolean =
        !residenceCode1.isNullOrBlank() &&
            !residenceCode2.isNullOrBlank() &&
            residenceCode1 == residenceCode2
}
