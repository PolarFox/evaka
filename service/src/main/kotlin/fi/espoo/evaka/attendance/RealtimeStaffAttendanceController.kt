// SPDX-FileCopyrightText: 2017-2022 City of Espoo
//
// SPDX-License-Identifier: LGPL-2.1-or-later

package fi.espoo.evaka.attendance

import fi.espoo.evaka.Audit
import fi.espoo.evaka.shared.DaycareId
import fi.espoo.evaka.shared.EmployeeId
import fi.espoo.evaka.shared.GroupId
import fi.espoo.evaka.shared.StaffAttendanceExternalId
import fi.espoo.evaka.shared.StaffAttendanceId
import fi.espoo.evaka.shared.auth.AuthenticatedUser
import fi.espoo.evaka.shared.db.Database
import fi.espoo.evaka.shared.db.mapPSQLException
import fi.espoo.evaka.shared.domain.BadRequest
import fi.espoo.evaka.shared.domain.EvakaClock
import fi.espoo.evaka.shared.domain.FiniteDateRange
import fi.espoo.evaka.shared.domain.HelsinkiDateTime
import fi.espoo.evaka.shared.domain.HelsinkiDateTimeRange
import fi.espoo.evaka.shared.security.AccessControl
import fi.espoo.evaka.shared.security.Action
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalTime
import org.jdbi.v3.core.JdbiException
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/staff-attendances/realtime")
class RealtimeStaffAttendanceController(private val accessControl: AccessControl) {
    @GetMapping
    fun getAttendances(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @RequestParam unitId: DaycareId,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) start: LocalDate,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) end: LocalDate
    ): StaffAttendanceResponse {
        return db.connect { dbc ->
                dbc.read { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.Unit.READ_STAFF_ATTENDANCES,
                        unitId
                    )
                    val range = FiniteDateRange(start, end)
                    val attendancesByEmployee =
                        tx.getStaffAttendancesForDateRange(unitId, range).groupBy { raw ->
                            raw.employeeId
                        }
                    val attendanceEmployeeToGroups =
                        tx.getGroupsForEmployees(unitId, attendancesByEmployee.keys)
                    val staffForAttendanceCalendar =
                        tx.getCurrentStaffForAttendanceCalendar(unitId, range.start, range.end)
                    val noAttendanceEmployeeToGroups =
                        tx.getGroupsForEmployees(
                            unitId,
                            staffForAttendanceCalendar.map { emp -> emp.id }.toSet()
                        )
                    val plannedAttendances =
                        tx.getPlannedStaffAttendanceForDays(
                            attendancesByEmployee.keys + staffForAttendanceCalendar.map { it.id },
                            range
                        )
                    val attendancesNotInGroups =
                        tx.getStaffAttendancesWithoutGroup(
                                range,
                                attendancesByEmployee.keys +
                                    staffForAttendanceCalendar.map { it.id }
                            )
                            .groupBy { it.employeeId }
                    val staffWithAttendance =
                        attendancesByEmployee.entries.map { (employeeId, data) ->
                            EmployeeAttendance(
                                employeeId = employeeId,
                                groups = attendanceEmployeeToGroups[employeeId] ?: listOf(),
                                firstName = data[0].firstName,
                                lastName = data[0].lastName,
                                currentOccupancyCoefficient = data[0].currentOccupancyCoefficient
                                        ?: BigDecimal.ZERO,
                                attendances =
                                    (data + (attendancesNotInGroups[employeeId] ?: emptyList()))
                                        .map { att ->
                                            Attendance(
                                                att.id,
                                                att.groupId,
                                                att.arrived,
                                                att.departed,
                                                att.occupancyCoefficient,
                                                att.type
                                            )
                                        },
                                plannedAttendances = plannedAttendances[employeeId] ?: emptyList()
                            )
                        }
                    val staffWithoutAttendance =
                        staffForAttendanceCalendar
                            .filter { emp -> !attendancesByEmployee.keys.contains(emp.id) }
                            .map { emp ->
                                EmployeeAttendance(
                                    employeeId = emp.id,
                                    groups = noAttendanceEmployeeToGroups[emp.id] ?: listOf(),
                                    firstName = emp.firstName,
                                    lastName = emp.lastName,
                                    currentOccupancyCoefficient = emp.currentOccupancyCoefficient
                                            ?: BigDecimal.ZERO,
                                    attendances =
                                        (attendancesNotInGroups[emp.id] ?: emptyList()).map { att ->
                                            Attendance(
                                                att.id,
                                                att.groupId,
                                                att.arrived,
                                                att.departed,
                                                att.occupancyCoefficient,
                                                att.type
                                            )
                                        },
                                    plannedAttendances = plannedAttendances[emp.id] ?: emptyList()
                                )
                            }
                    StaffAttendanceResponse(
                        staff = staffWithAttendance + staffWithoutAttendance,
                        extraAttendances = tx.getExternalStaffAttendancesByDateRange(unitId, range)
                    )
                }
            }
            .also {
                Audit.StaffAttendanceRead.log(
                    targetId = unitId,
                    meta =
                        mapOf(
                            "staffCount" to it.staff.size,
                            "externalStaffCount" to it.extraAttendances.size
                        )
                )
            }
    }

    data class UpsertStaffAttendance(
        val attendanceId: StaffAttendanceId?,
        val employeeId: EmployeeId,
        val groupId: GroupId?,
        val arrived: HelsinkiDateTime,
        val departed: HelsinkiDateTime?,
        val type: StaffAttendanceType
    )

    data class UpsertExternalAttendance(
        val attendanceId: StaffAttendanceExternalId?,
        val name: String?,
        val groupId: GroupId,
        val arrived: HelsinkiDateTime,
        val departed: HelsinkiDateTime?
    )

    data class UpsertStaffAndExternalAttendanceRequest(
        val staffAttendances: List<UpsertStaffAttendance>,
        val externalAttendances: List<UpsertExternalAttendance>
    ) {
        fun isArrivedBeforeDeparted() =
            staffAttendances.all { it.departed == null || it.arrived < it.departed } &&
                externalAttendances.all { it.departed == null || it.arrived < it.departed }

        fun hasGroupIdIfPresentInGroup() =
            staffAttendances.all { it.groupId != null || !it.type.presentInGroup() }

        fun anyAttendanceAfter(timestamp: HelsinkiDateTime): Boolean =
            staffAttendances.any { it.arrived > timestamp } &&
                externalAttendances.any { it.arrived > timestamp }
    }

    @PostMapping("/{unitId}/upsert")
    fun upsertStaffAttendances(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable unitId: DaycareId,
        @RequestBody body: UpsertStaffAndExternalAttendanceRequest
    ) {
        if (!body.isArrivedBeforeDeparted()) {
            throw BadRequest("Arrival time must be before departure time for all entries")
        }

        if (!body.hasGroupIdIfPresentInGroup()) {
            throw BadRequest("Attendance must have a groupId if present in group")
        }

        if (body.anyAttendanceAfter(HelsinkiDateTime.atStartOfDay(clock.today().plusDays(1)))) {
            throw BadRequest("Attendances cannot be in the future")
        }

        val objectId =
            db.connect { dbc ->
                dbc.transaction { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.Unit.UPDATE_STAFF_ATTENDANCES,
                        unitId
                    )
                    try {
                        val occupancyCoefficients =
                            body.staffAttendances.associate { attendance ->
                                Pair(
                                    attendance.employeeId,
                                    attendance.groupId?.let {
                                        tx.getOccupancyCoefficientForEmployee(
                                            attendance.employeeId,
                                            attendance.groupId
                                        )
                                    }
                                        ?: BigDecimal.ZERO
                                )
                            }
                        val staffAttendanceIds =
                            body.staffAttendances.map {
                                tx.upsertStaffAttendance(
                                    it.attendanceId,
                                    it.employeeId,
                                    it.groupId,
                                    it.arrived,
                                    it.departed,
                                    occupancyCoefficients[it.employeeId],
                                    it.type
                                )
                            }

                        val externalStaffAttendanceIds =
                            body.externalAttendances.map {
                                tx.upsertExternalStaffAttendance(
                                    it.attendanceId,
                                    it.name,
                                    it.groupId,
                                    it.arrived,
                                    it.departed,
                                    occupancyCoefficientSeven
                                )
                            }
                        staffAttendanceIds + externalStaffAttendanceIds
                    } catch (e: JdbiException) {
                        throw mapPSQLException(e)
                    }
                }
            }
        Audit.StaffAttendanceUpdate.log(targetId = unitId, objectId = objectId)
    }

    data class StaffAttendanceUpsert(
        val id: StaffAttendanceId?,
        val groupId: GroupId?,
        val arrived: HelsinkiDateTime,
        val departed: HelsinkiDateTime?,
        val type: StaffAttendanceType
    )

    data class StaffAttendanceBody(
        val unitId: DaycareId,
        val employeeId: EmployeeId,
        val date: LocalDate,
        val entries: List<StaffAttendanceUpsert>
    ) {
        fun anyAttendanceAfter(timestamp: HelsinkiDateTime): Boolean =
            entries.any { it.arrived > timestamp }
    }

    @PostMapping("/upsert")
    fun upsertDailyStaffAttendances(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @RequestBody body: StaffAttendanceBody
    ) {
        if (body.anyAttendanceAfter(HelsinkiDateTime.atStartOfDay(clock.today().plusDays(1)))) {
            throw BadRequest("Attendances cannot be in the future")
        }
        if (body.date.isAfter(clock.today())) {
            throw BadRequest("Date cannot be in the future")
        }

        val staffAttendanceIds =
            db.connect { dbc ->
                dbc.transaction { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.Unit.UPDATE_STAFF_ATTENDANCES,
                        body.unitId
                    )
                    val occupancyCoefficients =
                        body.entries
                            .map { it.groupId }
                            .distinct()
                            .associateWith { groupId ->
                                groupId?.let {
                                    tx.getOccupancyCoefficientForEmployee(body.employeeId, groupId)
                                }
                                    ?: BigDecimal.ZERO
                            }
                    val wholeDay =
                        HelsinkiDateTimeRange(
                            HelsinkiDateTime.of(body.date, LocalTime.of(0, 0)),
                            HelsinkiDateTime.of(body.date.plusDays(1), LocalTime.of(0, 0))
                        )
                    tx.deleteStaffAttendancesInRangeExcept(
                        body.unitId,
                        body.employeeId,
                        wholeDay,
                        body.entries.mapNotNull { it.id }
                    )
                    // First do the upserts (entries with ids), then the new entries (entries
                    // without ids
                    (body.entries.filter { it.id != null } + body.entries.filter { it.id == null })
                        .map {
                            tx.upsertStaffAttendance(
                                it.id,
                                body.employeeId,
                                it.groupId,
                                it.arrived,
                                it.departed,
                                occupancyCoefficients[it.groupId],
                                it.type
                            )
                        }
                }
            }
        Audit.StaffAttendanceUpdate.log(
            targetId = body.unitId,
            objectId = staffAttendanceIds,
            meta = mapOf("date" to body.date)
        )
    }

    data class ExternalAttendanceUpsert(
        val id: StaffAttendanceExternalId?,
        val groupId: GroupId,
        val arrived: HelsinkiDateTime,
        val departed: HelsinkiDateTime?
    )

    data class ExternalAttendanceBody(
        val unitId: DaycareId,
        val name: String,
        val date: LocalDate,
        val entries: List<ExternalAttendanceUpsert>
    ) {
        fun anyAttendanceAfter(timestamp: HelsinkiDateTime): Boolean =
            entries.any { it.arrived > timestamp }
    }

    @PostMapping("/upsert-external")
    fun upsertDailyExternalAttendances(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @RequestBody body: ExternalAttendanceBody
    ) {
        if (body.anyAttendanceAfter(HelsinkiDateTime.atStartOfDay(clock.today().plusDays(1)))) {
            throw BadRequest("Attendances cannot be in the future")
        }
        if (body.date.isAfter(clock.today())) {
            throw BadRequest("Date cannot be in the future")
        }

        val externalAttendanceIds =
            db.connect { dbc ->
                dbc.transaction { tx ->
                    accessControl.requirePermissionFor(
                        tx,
                        user,
                        clock,
                        Action.Unit.UPDATE_STAFF_ATTENDANCES,
                        body.unitId
                    )
                    val wholeDay =
                        HelsinkiDateTimeRange(
                            HelsinkiDateTime.of(body.date, LocalTime.of(0, 0)),
                            HelsinkiDateTime.of(body.date.plusDays(1), LocalTime.of(0, 0))
                        )
                    tx.deleteExternalAttendancesInRangeExcept(
                        body.name,
                        wholeDay,
                        body.entries.mapNotNull { it.id }
                    )
                    body.entries.map {
                        tx.upsertExternalStaffAttendance(
                            it.id,
                            body.name,
                            it.groupId,
                            it.arrived,
                            it.departed,
                            occupancyCoefficientSeven
                        )
                    }
                }
            }
        Audit.StaffAttendanceExternalUpdate.log(
            targetId = body.unitId,
            objectId = externalAttendanceIds,
            meta = mapOf("date" to body.date)
        )
    }

    @DeleteMapping("/{unitId}/{attendanceId}")
    fun deleteStaffAttendances(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable unitId: DaycareId,
        @PathVariable attendanceId: StaffAttendanceId
    ) {
        db.connect { dbc ->
            dbc.transaction { tx ->
                accessControl.requirePermissionFor(
                    tx,
                    user,
                    clock,
                    Action.Unit.DELETE_STAFF_ATTENDANCES,
                    unitId
                )
                tx.deleteStaffAttendance(attendanceId)
            }
        }
        Audit.StaffAttendanceDelete.log(targetId = attendanceId)
    }

    @DeleteMapping("/{unitId}/external/{attendanceId}")
    fun deleteExternalStaffAttendances(
        db: Database,
        user: AuthenticatedUser,
        clock: EvakaClock,
        @PathVariable unitId: DaycareId,
        @PathVariable attendanceId: StaffAttendanceExternalId
    ) {
        db.connect { dbc ->
            dbc.transaction { tx ->
                accessControl.requirePermissionFor(
                    tx,
                    user,
                    clock,
                    Action.Unit.DELETE_STAFF_ATTENDANCES,
                    unitId
                )
                tx.deleteExternalStaffAttendance(attendanceId)
            }
        }
        Audit.StaffAttendanceExternalDelete.log(targetId = attendanceId)
    }
}
