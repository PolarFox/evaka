// SPDX-FileCopyrightText: 2017-2023 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

package fi.espoo.evaka.varda

import fi.espoo.evaka.shared.ChildId
import fi.espoo.evaka.shared.async.AsyncJob
import fi.espoo.evaka.shared.async.AsyncJobRunner
import fi.espoo.evaka.shared.auth.AuthenticatedUser
import fi.espoo.evaka.shared.db.Database
import fi.espoo.evaka.shared.domain.EvakaClock
import fi.espoo.evaka.shared.security.AccessControl
import fi.espoo.evaka.shared.security.Action
import fi.espoo.evaka.varda.old.VardaResetService
import fi.espoo.evaka.varda.old.VardaUpdateService
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/varda")
class VardaController(
    private val vardaService: VardaUpdateService,
    private val vardaResetService: VardaResetService,
    private val asyncJobRunner: AsyncJobRunner<AsyncJob>,
    private val accessControl: AccessControl
) {
    @PostMapping("/start-update")
    fun runFullVardaUpdate(db: Database, user: AuthenticatedUser, clock: EvakaClock) {
        db.connect { dbc ->
            dbc.read {
                accessControl.requirePermissionFor(it, user, clock, Action.Global.VARDA_OPERATIONS)
            }
            vardaService.startVardaUpdate(dbc, clock)
        }
    }

    @PostMapping("/start-reset")
    fun runFullVardaReset(db: Database, user: AuthenticatedUser, clock: EvakaClock) {
        db.connect { dbc ->
            dbc.read {
                accessControl.requirePermissionFor(it, user, clock, Action.Global.VARDA_OPERATIONS)
            }
            vardaResetService.planVardaReset(dbc, clock, true)
        }
    }

    @PostMapping("/child/reset/{childId}")
    fun markChildForVardaReset(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable childId: ChildId
    ) {
        db.connect { dbc ->
            dbc.transaction {
                accessControl.requirePermissionFor(it, user, clock, Action.Global.VARDA_OPERATIONS)
                it.resetChildResetTimestamp(childId)
                asyncJobRunner.plan(
                    it,
                    listOf(AsyncJob.ResetVardaChildOld(childId)),
                    retryCount = 1,
                    runAt = clock.now()
                )
            }
        }
    }
}
