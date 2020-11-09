// SPDX-FileCopyrightText: 2017-2020 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

package fi.espoo.evaka.daycare.service

import fi.espoo.evaka.daycare.createDaycareGroup
import fi.espoo.evaka.daycare.deleteDaycareGroup
import fi.espoo.evaka.daycare.getDaycareGroups
import fi.espoo.evaka.daycare.getGroupStats
import fi.espoo.evaka.daycare.getUnitStats
import fi.espoo.evaka.daycare.initCaretakers
import fi.espoo.evaka.daycare.isValidDaycareId
import fi.espoo.evaka.placement.getDaycareGroupPlacements
import fi.espoo.evaka.shared.domain.Conflict
import fi.espoo.evaka.shared.domain.NotFound
import org.jdbi.v3.core.Handle
import org.jdbi.v3.core.statement.UnableToExecuteStatementException
import org.postgresql.util.PSQLException
import org.postgresql.util.PSQLState
import org.springframework.stereotype.Service
import java.time.LocalDate
import java.util.UUID

@Service
class DaycareService {
    fun getDaycareCapacityStats(
        h: Handle,
        daycareId: UUID,
        startDate: LocalDate,
        endDate: LocalDate
    ): DaycareCapacityStats {
        val unitStats = h.getUnitStats(daycareId, startDate, endDate)
        return DaycareCapacityStats(
            unitTotalCaretakers = unitStats,
            groupCaretakers = h.getGroupStats(daycareId, startDate, endDate)
        )
    }

    fun createGroup(
        h: Handle,
        daycareId: UUID,
        name: String,
        startDate: LocalDate,
        initialCaretakers: Double
    ): DaycareGroup = h.createDaycareGroup(daycareId, name, startDate).also {
        h.initCaretakers(it.id, it.startDate, initialCaretakers)
    }

    fun deleteGroup(h: Handle, daycareId: UUID, groupId: UUID) = try {
        val isEmpty = h.getDaycareGroupPlacements(
            daycareId = daycareId,
            groupId = groupId,
            startDate = null,
            endDate = null
        ).isEmpty()

        if (!isEmpty) throw Conflict("Cannot delete group which has children placed in it")

        h.deleteDaycareGroup(groupId)
    } catch (e: UnableToExecuteStatementException) {
        throw (e.cause as? PSQLException)?.takeIf { it.serverErrorMessage?.sqlState == PSQLState.FOREIGN_KEY_VIOLATION.state }
            ?.let { Conflict("Cannot delete group which is still referred to from other data") }
            ?: e
    }

    fun getDaycareGroups(h: Handle, daycareId: UUID, startDate: LocalDate?, endDate: LocalDate?): List<DaycareGroup> {
        if (!h.isValidDaycareId(daycareId)) throw NotFound("No daycare found with id $daycareId")

        return h.getDaycareGroups(daycareId, startDate, endDate)
    }
}

data class DaycareManager(
    val name: String,
    val email: String,
    val phone: String
)

data class DaycareGroup(
    val id: UUID,
    val daycareId: UUID,
    val name: String,
    val startDate: LocalDate,
    val endDate: LocalDate?,
    val deletable: Boolean
)

data class DaycareCapacityStats(
    val unitTotalCaretakers: Stats,
    val groupCaretakers: Map<UUID, Stats>
)

data class Stats(
    val minimum: Double,
    val maximum: Double
)
