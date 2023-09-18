// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

package fi.espoo.evaka.shared.security.actionrule

import fi.espoo.evaka.application.ApplicationType
import fi.espoo.evaka.daycare.domain.ProviderType
import fi.espoo.evaka.document.childdocument.DocumentStatus
import fi.espoo.evaka.shared.ApplicationId
import fi.espoo.evaka.shared.AssistanceActionId
import fi.espoo.evaka.shared.AssistanceFactorId
import fi.espoo.evaka.shared.AssistanceNeedDecisionId
import fi.espoo.evaka.shared.AssistanceNeedId
import fi.espoo.evaka.shared.AssistanceNeedPreschoolDecisionId
import fi.espoo.evaka.shared.AssistanceNeedVoucherCoefficientId
import fi.espoo.evaka.shared.AttachmentId
import fi.espoo.evaka.shared.BackupCareId
import fi.espoo.evaka.shared.BackupPickupId
import fi.espoo.evaka.shared.CalendarEventId
import fi.espoo.evaka.shared.ChildDailyNoteId
import fi.espoo.evaka.shared.ChildDiscussionId
import fi.espoo.evaka.shared.ChildDocumentId
import fi.espoo.evaka.shared.ChildId
import fi.espoo.evaka.shared.ChildImageId
import fi.espoo.evaka.shared.ChildStickyNoteId
import fi.espoo.evaka.shared.DailyServiceTimesId
import fi.espoo.evaka.shared.DaycareAssistanceId
import fi.espoo.evaka.shared.DaycareId
import fi.espoo.evaka.shared.DecisionId
import fi.espoo.evaka.shared.GroupId
import fi.espoo.evaka.shared.GroupNoteId
import fi.espoo.evaka.shared.GroupPlacementId
import fi.espoo.evaka.shared.Id
import fi.espoo.evaka.shared.MessageAccountId
import fi.espoo.evaka.shared.MobileDeviceId
import fi.espoo.evaka.shared.OtherAssistanceMeasureId
import fi.espoo.evaka.shared.PairingId
import fi.espoo.evaka.shared.ParentshipId
import fi.espoo.evaka.shared.PartnershipId
import fi.espoo.evaka.shared.PedagogicalDocumentId
import fi.espoo.evaka.shared.PersonId
import fi.espoo.evaka.shared.PlacementId
import fi.espoo.evaka.shared.PreschoolAssistanceId
import fi.espoo.evaka.shared.ServiceNeedId
import fi.espoo.evaka.shared.VasuDocumentId
import fi.espoo.evaka.shared.auth.AuthenticatedUser
import fi.espoo.evaka.shared.auth.UserRole
import fi.espoo.evaka.shared.db.QuerySql
import fi.espoo.evaka.shared.domain.HelsinkiDateTime
import fi.espoo.evaka.shared.security.AccessControlDecision
import fi.espoo.evaka.shared.security.PilotFeature
import fi.espoo.evaka.shared.utils.emptyEnumSet
import fi.espoo.evaka.shared.utils.toEnumSet
import java.util.EnumSet

private typealias GetUnitRoles =
    QuerySql.Builder<IdRoleFeatures>.(
        user: AuthenticatedUser.Employee, now: HelsinkiDateTime
    ) -> QuerySql<IdRoleFeatures>

data class HasUnitRole(
    val oneOf: EnumSet<UserRole>,
    val unitFeatures: EnumSet<PilotFeature>,
    val unitProviderTypes: EnumSet<ProviderType>?
) : DatabaseActionRule.Params {
    init {
        oneOf.forEach { check(it.isUnitScopedRole()) { "Expected a unit-scoped role, got $it" } }
    }
    constructor(vararg oneOf: UserRole) : this(oneOf.toEnumSet(), emptyEnumSet(), null)

    fun withUnitFeatures(vararg allOf: PilotFeature) = copy(unitFeatures = allOf.toEnumSet())
    fun withUnitProviderTypes(vararg allOf: ProviderType) =
        copy(unitProviderTypes = allOf.toEnumSet())

    override fun isPermittedForSomeTarget(ctx: DatabaseActionRule.QueryContext): Boolean =
        when (ctx.user) {
            is AuthenticatedUser.Employee ->
                ctx.tx
                    .createQuery<Boolean> {
                        sql(
                            """
SELECT EXISTS (
    SELECT 1
    FROM daycare
    JOIN daycare_acl acl ON daycare.id = acl.daycare_id
    WHERE acl.employee_id = ${bind(ctx.user.id)}
    AND role = ANY(${bind(oneOf.toSet())})
    AND daycare.enabled_pilot_features @> ${bind(unitFeatures.toSet())}
    ${if (unitProviderTypes != null) "AND daycare.provider_type = ANY(${bind(unitProviderTypes.toSet())})" else ""}
)
                """
                                .trimIndent()
                        )
                    }
                    .mapTo<Boolean>()
                    .single()
            else -> false
        }

    private fun <T : Id<*>> rule(
        getUnitRoles: GetUnitRoles
    ): DatabaseActionRule.Scoped<T, HasUnitRole> =
        DatabaseActionRule.Scoped.Simple(this, Query(getUnitRoles))

    private class Query<T : Id<*>>(private val getUnitRoles: GetUnitRoles) :
        DatabaseActionRule.Scoped.Query<T, HasUnitRole> {
        override fun cacheKey(user: AuthenticatedUser, now: HelsinkiDateTime): Any =
            when (user) {
                is AuthenticatedUser.Employee -> QuerySql.of { getUnitRoles(user, now) }
                else -> Pair(user, now)
            }
        override fun executeWithTargets(
            ctx: DatabaseActionRule.QueryContext,
            targets: Set<T>
        ): Map<T, DatabaseActionRule.Deferred<HasUnitRole>> =
            when (ctx.user) {
                is AuthenticatedUser.Employee ->
                    ctx.tx
                        .createQuery<T> {
                            sql(
                                """
                    SELECT id, role, unit_features, unit_provider_type
                    FROM (${subquery { getUnitRoles(ctx.user, ctx.now) } }) fragment
                    WHERE id = ANY(${bind(targets.map { it.raw })})
                    """
                                    .trimIndent()
                            )
                        }
                        .mapTo<IdRoleFeatures>()
                        .fold(
                            targets.associateTo(linkedMapOf()) {
                                (it to mutableSetOf<RoleAndFeatures>())
                            }
                        ) { acc, (target, result) ->
                            acc[target]?.plusAssign(result)
                            acc
                        }
                        .mapValues { (_, queryResult) -> Deferred(queryResult) }
                else -> emptyMap()
            }

        override fun queryWithParams(
            ctx: DatabaseActionRule.QueryContext,
            params: HasUnitRole
        ): QuerySql<T>? =
            when (ctx.user) {
                is AuthenticatedUser.Employee ->
                    QuerySql.of {
                        sql(
                            """
                    SELECT id
                    FROM (${subquery { getUnitRoles(ctx.user, ctx.now) } }) fragment
                    WHERE role = ANY(${bind(params.oneOf.toSet())})
                    AND unit_features @> ${bind(params.unitFeatures.toSet())}
                    ${if (params.unitProviderTypes != null) "AND unit_provider_type = ANY(${bind(params.unitProviderTypes.toSet())})" else ""}
                        """
                                .trimIndent()
                        )
                    }
                else -> null
            }
    }

    private data class Deferred(private val queryResult: Set<RoleAndFeatures>) :
        DatabaseActionRule.Deferred<HasUnitRole> {
        override fun evaluate(params: HasUnitRole): AccessControlDecision =
            if (
                queryResult.any {
                    params.oneOf.contains(it.role) &&
                        it.unitFeatures.containsAll(params.unitFeatures) &&
                        (params.unitProviderTypes == null ||
                            params.unitProviderTypes.contains(it.unitProviderType))
                }
            ) {
                AccessControlDecision.Permitted(params)
            } else {
                AccessControlDecision.None
            }
    }

    fun inAnyUnit() =
        DatabaseActionRule.Unscoped(
            this,
            object : DatabaseActionRule.Unscoped.Query<HasUnitRole> {
                override fun cacheKey(user: AuthenticatedUser, now: HelsinkiDateTime): Any =
                    Pair(user, now)
                override fun execute(
                    ctx: DatabaseActionRule.QueryContext
                ): DatabaseActionRule.Deferred<HasUnitRole>? =
                    when (ctx.user) {
                        is AuthenticatedUser.Employee ->
                            Deferred(
                                ctx.tx
                                    .createQuery<RoleAndFeatures> {
                                        sql(
                                            """
SELECT role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM daycare_acl acl
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(ctx.user.id)}
                                """
                                                .trimIndent()
                                        )
                                    }
                                    .mapTo<RoleAndFeatures>()
                                    .toSet()
                            )
                        else -> null
                    }
            }
        )

    fun inPlacementPlanUnitOfApplication(onlyAllowDeletedForTypes: Set<ApplicationType>? = null) =
        rule<ApplicationId> { user, _ ->
            sql(
                """
SELECT av.id, role, daycare.enabled_pilot_features AS unit_features, daycare.provider_type AS unit_provider_type
FROM application_view av
JOIN placement_plan pp ON pp.application_id = av.id
JOIN daycare_acl acl ON acl.daycare_id = pp.unit_id
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)} AND av.status = ANY ('{WAITING_CONFIRMATION,WAITING_MAILING,WAITING_UNIT_CONFIRMATION,ACTIVE}'::application_status_type[])
${if (onlyAllowDeletedForTypes != null) "AND (av.type = ANY(${bind(onlyAllowDeletedForTypes)}) OR NOT pp.deleted)" else ""}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfAssistanceAction() =
        rule<AssistanceActionId> { user, now ->
            sql(
                """
SELECT aa.id, role, daycare.enabled_pilot_features AS unit_features, daycare.provider_type AS unit_provider_type
FROM assistance_action aa
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfAssistanceFactor() =
        rule<AssistanceFactorId> { user, now ->
            sql(
                """
SELECT af.id, role, daycare.enabled_pilot_features AS unit_features, daycare.provider_type AS unit_provider_type
FROM assistance_factor af
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfAssistanceNeed() =
        rule<AssistanceNeedId> { user, now ->
            sql(
                """
SELECT an.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM assistance_need an
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfAssistanceNeedDecision() =
        rule<AssistanceNeedDecisionId> { user, now ->
            sql(
                """
SELECT ad.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM assistance_need_decision ad
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfAcceptedAssistanceNeedDecision() =
        rule<AssistanceNeedDecisionId> { user, now ->
            sql(
                """
SELECT ad.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM assistance_need_decision ad
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)} AND ad.status = 'ACCEPTED'
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfAcceptedAssistanceNeedPreschoolDecision() =
        rule<AssistanceNeedPreschoolDecisionId> { user, now ->
            sql(
                """
SELECT apd.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM assistance_need_preschool_decision apd
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)} AND apd.status = 'ACCEPTED'
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfDaycareAssistance() =
        rule<DaycareAssistanceId> { user, now ->
            sql(
                """
SELECT da.id, role, daycare.enabled_pilot_features AS unit_features, daycare.provider_type AS unit_provider_type
FROM daycare_assistance da
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfOtherAssistanceMeasure() =
        rule<OtherAssistanceMeasureId> { user, now ->
            sql(
                """
SELECT oam.id, role, daycare.enabled_pilot_features AS unit_features, daycare.provider_type AS unit_provider_type
FROM other_assistance_measure oam
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfPreschoolAssistance() =
        rule<PreschoolAssistanceId> { user, now ->
            sql(
                """
SELECT pa.id, role, daycare.enabled_pilot_features AS unit_features, daycare.provider_type AS unit_provider_type
FROM preschool_assistance pa
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inSelectedUnitOfAssistanceNeedDecision() =
        rule<AssistanceNeedDecisionId> { user, now ->
            sql(
                """
SELECT ad.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM assistance_need_decision ad
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id =  ad.selected_unit
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    // For Tampere
    fun andIsDecisionMakerForAssistanceNeedDecision() =
        rule<AssistanceNeedDecisionId> { user, now ->
            sql(
                """
SELECT ad.id, acl.role, daycare.enabled_pilot_features AS unit_features, daycare.provider_type AS unit_provider_type
FROM assistance_need_decision ad
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE ad.decision_maker_employee_id = ${bind(user.id)}
  AND ad.sent_for_decision IS NOT NULL
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfAssistanceNeedPreschoolDecision() =
        rule<AssistanceNeedPreschoolDecisionId> { user, now ->
            sql(
                """
SELECT ad.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM assistance_need_preschool_decision ad
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inSelectedUnitOfAssistanceNeedPreschoolDecision() =
        rule<AssistanceNeedPreschoolDecisionId> { user, now ->
            sql(
                """
SELECT ad.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM assistance_need_preschool_decision ad
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id =  ad.selected_unit
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    // For Tampere
    fun andIsDecisionMakerForAssistanceNeedPreschoolDecision() =
        rule<AssistanceNeedPreschoolDecisionId> { user, now ->
            sql(
                """
SELECT ad.id, acl.role, daycare.enabled_pilot_features AS unit_features, daycare.provider_type AS unit_provider_type
FROM assistance_need_preschool_decision ad
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE ad.decision_maker_employee_id = ${bind(user.id)}
  AND ad.sent_for_decision IS NOT NULL
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfAssistanceNeedVoucherCoefficientWithServiceVoucherPlacement() =
        rule<AssistanceNeedVoucherCoefficientId> { user, now ->
            sql(
                """
SELECT avc.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM assistance_need_voucher_coefficient avc
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)} AND EXISTS(
    SELECT 1 FROM placement p
    JOIN daycare pd ON pd.id = p.unit_id
    WHERE p.child_id = acl.child_id
      AND pd.provider_type = 'PRIVATE_SERVICE_VOUCHER'
)
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfBackupCare() =
        rule<BackupCareId> { user, now ->
            sql(
                """
SELECT bc.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM backup_care bc
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfBackupPickup() =
        rule<BackupPickupId> { user, now ->
            sql(
                """
SELECT bp.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM backup_pickup bp
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChild() =
        rule<ChildId> { user, now ->
            sql(
                """
SELECT child_id AS id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM employee_child_daycare_acl(${bind(now.toLocalDate())}) acl
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfChildDailyNote() =
        rule<ChildDailyNoteId> { user, now ->
            sql(
                """
SELECT cdn.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM child_daily_note cdn
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfChildStickyNote() =
        rule<ChildStickyNoteId> { user, now ->
            sql(
                """
SELECT csn.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM child_sticky_note csn
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfChildImage() =
        rule<ChildImageId> { user, now ->
            sql(
                """
SELECT img.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM child_images img
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfDecision() =
        rule<DecisionId> { user, _ ->
            sql(
                """
SELECT decision.id, role, daycare.enabled_pilot_features AS unit_features, daycare.provider_type AS unit_provider_type
FROM decision
JOIN daycare_acl acl ON decision.unit_id = acl.daycare_id
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfParentship() =
        rule<ParentshipId> { user, _ ->
            sql(
                """
SELECT fridge_child.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM fridge_child
JOIN person_acl_view acl ON fridge_child.head_of_child = acl.person_id OR fridge_child.child_id = acl.person_id
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfPartnership() =
        rule<PartnershipId> { user, _ ->
            sql(
                """
SELECT fridge_partner.partnership_id AS id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM fridge_partner
JOIN person_acl_view acl ON fridge_partner.person_id = acl.person_id
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfPedagogicalDocument() =
        rule<PedagogicalDocumentId> { user, now ->
            sql(
                """
SELECT pd.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM pedagogical_document pd
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfPedagogicalDocumentOfAttachment() =
        rule<AttachmentId> { user, now ->
            sql(
                """
SELECT attachment.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM attachment
JOIN pedagogical_document pd ON attachment.pedagogical_document_id = pd.id
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfPerson() =
        rule<PersonId> { user, _ ->
            sql(
                """
SELECT person_id AS id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM person_acl_view acl
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfPlacement() =
        rule<PlacementId> { user, _ ->
            sql(
                """
SELECT placement.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM placement
JOIN daycare_acl acl ON placement.unit_id = acl.daycare_id
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfFuturePlacement() =
        rule<PlacementId> { user, now ->
            sql(
                """
SELECT placement.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM placement
JOIN daycare_acl acl ON placement.unit_id = acl.daycare_id
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)} AND placement.start_date > ${bind(now)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfServiceNeed() =
        rule<ServiceNeedId> { user, _ ->
            sql(
                """
SELECT service_need.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM service_need
JOIN placement ON placement.id = service_need.placement_id
JOIN daycare_acl acl ON placement.unit_id = acl.daycare_id
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfChildDiscussion() =
        rule<ChildDiscussionId> { user, now ->
            sql(
                """
SELECT child_discussion.id AS id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM child_discussion
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfChildDocument(
        editable: Boolean = false,
        deletable: Boolean = false,
        publishable: Boolean = false
    ) =
        rule<ChildDocumentId> { user, now ->
            sql(
                """
SELECT child_document.id AS id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM child_document
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
${if(editable) "AND status = ANY(${bind(DocumentStatus.values().filter { it.editable })}::child_document_status[])" else ""}
${if(deletable) "AND status = 'DRAFT' AND published_at IS NULL" else ""}
${if(publishable) "AND status <> 'COMPLETED'" else ""}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfVasuDocument() =
        rule<VasuDocumentId> { user, now ->
            sql(
                """
SELECT curriculum_document.id AS id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM curriculum_document
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfDailyServiceTime() =
        rule<DailyServiceTimesId> { user, now ->
            sql(
                """
SELECT dst.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM daily_service_time dst
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildOfFutureDailyServiceTime() =
        rule<DailyServiceTimesId> { user, now ->
            sql(
                """
SELECT dst.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM daily_service_time dst
JOIN employee_child_daycare_acl(${bind(now.toLocalDate())}) acl USING (child_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
  AND lower(dst.validity_period) > ${bind(now.toLocalDate())}
            """
                    .trimIndent()
            )
        }

    fun inPreferredUnitOfApplication() =
        rule<ApplicationId> { user, _ ->
            sql(
                """
SELECT av.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM application_view av
JOIN daycare_acl acl ON acl.daycare_id = ANY (av.preferredunits)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inUnitOfGroup() =
        rule<GroupId> { user, _ ->
            sql(
                """
SELECT g.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM daycare_group g
JOIN daycare_acl acl USING (daycare_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inUnitOfGroupNote() =
        rule<GroupNoteId> { user, _ ->
            sql(
                """
SELECT gn.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM group_note gn
JOIN daycare_group g ON gn.group_id = g.id
JOIN daycare_acl acl USING (daycare_id)
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inUnitOfGroupPlacement() =
        rule<GroupPlacementId> { user, _ ->
            sql(
                """
SELECT daycare_group_placement.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM placement
JOIN daycare_acl acl ON placement.unit_id = acl.daycare_id
JOIN daycare_group_placement on placement.id = daycare_group_placement.daycare_placement_id
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inUnitOfMobileDevice() =
        rule<MobileDeviceId> { user, _ ->
            sql(
                """
SELECT d.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM daycare_acl acl
JOIN mobile_device d ON acl.daycare_id = d.unit_id
JOIN daycare ON acl.daycare_id = daycare.id
WHERE acl.employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inUnitOfPairing() =
        rule<PairingId> { user, _ ->
            sql(
                """
SELECT p.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM daycare_acl acl
JOIN pairing p ON acl.daycare_id = p.unit_id
JOIN daycare ON acl.daycare_id = daycare.id
WHERE acl.employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inUnit() =
        rule<DaycareId> { user, _ ->
            sql(
                """
SELECT daycare_id AS id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM daycare_acl acl
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun inUnitOfApplicationAttachment() =
        rule<AttachmentId> { user, _ ->
            sql(
                """
SELECT attachment.id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM attachment
JOIN placement_plan ON attachment.application_id = placement_plan.application_id
JOIN daycare ON placement_plan.unit_id = daycare.id AND daycare.round_the_clock
JOIN daycare_acl ON daycare.id = daycare_acl.daycare_id
WHERE employee_id = ${bind(user.id)}
AND attachment.type = 'EXTENDED_CARE'
            """
                    .trimIndent()
            )
        }

    fun inPlacementUnitOfChildWithServiceVoucherPlacement() =
        rule<ChildId> { user, now ->
            sql(
                """
SELECT child_id AS id, role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM employee_child_daycare_acl(${bind(now.toLocalDate())}) acl
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)} AND EXISTS(
    SELECT 1 FROM placement p
    JOIN daycare pd ON pd.id = p.unit_id
    WHERE p.child_id = acl.child_id
      AND pd.provider_type = 'PRIVATE_SERVICE_VOUCHER'
)
            """
                    .trimIndent()
            )
        }

    fun inUnitOfCalendarEvent() =
        rule<CalendarEventId> { user, _ ->
            sql(
                """
SELECT cea.calendar_event_id id, acl.role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM calendar_event_attendee cea
JOIN daycare_acl acl ON acl.daycare_id = cea.unit_id
JOIN daycare ON acl.daycare_id = daycare.id
WHERE employee_id = ${bind(user.id)}
            """
                    .trimIndent()
            )
        }

    fun hasDaycareMessageAccount() =
        rule<MessageAccountId> { user, _ ->
            sql(
                """
SELECT acc.id, acl.role, enabled_pilot_features AS unit_features, provider_type AS unit_provider_type
FROM message_account acc
JOIN daycare_group dg ON acc.daycare_group_id = dg.id
JOIN daycare_acl acl ON acl.daycare_id = dg.daycare_id
JOIN daycare ON acl.daycare_id = daycare.id
WHERE acl.employee_id = ${bind(user.id)} AND acc.active = TRUE
                """
                    .trimIndent()
            )
        }
}
