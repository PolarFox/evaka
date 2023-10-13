DROP FUNCTION IF EXISTS koski_active_study_right(today date);
DROP FUNCTION IF EXISTS koski_voided_study_right(today date);
DROP FUNCTION IF EXISTS koski_placement(today date);
DROP VIEW IF EXISTS koski_unit;
DROP VIEW IF EXISTS koski_child;

CREATE VIEW koski_unit (id, unit_language, provider_type, approver_name, oph_unit_oid, oph_organizer_oid) AS
SELECT
    id, language AS unit_language, provider_type, unit_manager_name AS approver_name,
    nullif(oph_unit_oid, '') AS oph_unit_oid,
    nullif(oph_organizer_oid, '') AS oph_organizer_oid
FROM daycare
WHERE upload_to_koski IS TRUE
AND nullif(oph_unit_oid, '') IS NOT NULL
AND nullif(oph_organizer_oid, '') IS NOT NULL;

CREATE VIEW koski_child (id, ssn, oph_person_oid, first_name, last_name) AS
SELECT
    id,
    nullif(social_security_number, '') AS ssn,
    nullif(oph_person_oid, '') AS oph_person_oid,
    first_name,
    last_name
FROM person
WHERE nullif(social_security_number, '') IS NOT NULL
OR nullif(oph_person_oid, '') IS NOT NULL;

CREATE FUNCTION koski_placement(today date) RETURNS
TABLE (
    child_id uuid, unit_id uuid, type koski_study_right_type,
    placements datemultirange, all_placements_in_past bool, last_of_child bool
)
LANGUAGE SQL STABLE PARALLEL SAFE
BEGIN ATOMIC
    SELECT
        child_id, unit_id, type,
        range_agg(daterange(start_date, end_date, '[]')) AS placements,
        (max(end_date) < today) AS all_placements_in_past,
        bool_or(last_of_child) AS last_of_child
    FROM (
        SELECT
            child_id, unit_id, start_date, end_date,
            end_date = max(end_date) OVER child AS last_of_child,
            placement.type::koski_study_right_type AS type
        FROM placement
        WHERE start_date <= today
        AND placement.type IN ('PRESCHOOL', 'PRESCHOOL_DAYCARE', 'PRESCHOOL_CLUB', 'PREPARATORY', 'PREPARATORY_DAYCARE')
        WINDOW child AS (PARTITION BY child_id)
    ) p
    WHERE NOT EXISTS (SELECT FROM person duplicate WHERE duplicate.duplicate_of = p.child_id)
    GROUP BY child_id, unit_id, type;
END;

CREATE FUNCTION koski_active_study_right(today date) RETURNS
TABLE (
    child_id uuid, unit_id uuid, type koski_study_right_type,
    input_data koski_input_data
)
LANGUAGE SQL STABLE PARALLEL SAFE
BEGIN ATOMIC
    SELECT
        p.child_id,
        p.unit_id,
        p.type,
        (
            d.oph_unit_oid,
            d.oph_organizer_oid,
            placements,
            all_placements_in_past,
            last_of_child,
            preparatory_absences,
            special_support_with_decision_level_1,
            special_support_with_decision_level_2,
            transport_benefit
        ) AS input_data
    FROM koski_placement(today) p
    JOIN koski_unit d ON p.unit_id = d.id
    LEFT JOIN LATERAL (
        SELECT jsonb_object_agg(absence_type, dates) AS preparatory_absences
        FROM (
            SELECT a.absence_type, array_agg(a.date ORDER BY a.date) AS dates
            FROM absence a
            WHERE a.child_id = p.child_id
            AND a.category = 'NONBILLABLE'
            AND between_start_and_end(range_merge(placements), a.date)
            AND a.date > '2020-08-01'
            GROUP BY a.absence_type
        ) grouped
    ) pa ON p.type = 'PREPARATORY'
    LEFT JOIN LATERAL (
        SELECT range_agg(valid_during) AS transport_benefit
        FROM other_assistance_measure oam
        WHERE oam.child_id = p.child_id
        AND oam.valid_during && range_merge(placements)
        AND type = 'TRANSPORT_BENEFIT'
    ) oam ON p.type = 'PRESCHOOL'
    LEFT JOIN LATERAL (
        SELECT
            range_agg(valid_during) FILTER (
                WHERE level = 'SPECIAL_SUPPORT_WITH_DECISION_LEVEL_1'
            ) AS special_support_with_decision_level_1,
            range_agg(valid_during) FILTER (
                WHERE level = 'SPECIAL_SUPPORT_WITH_DECISION_LEVEL_2'
            ) AS special_support_with_decision_level_2
        FROM preschool_assistance pa
        WHERE pa.child_id = p.child_id
        AND pa.valid_during && range_merge(placements)
    ) pras ON p.type = 'PRESCHOOL'
    WHERE EXISTS (SELECT FROM koski_child WHERE koski_child.id = p.child_id);
END;

CREATE FUNCTION koski_voided_study_right(today date) RETURNS
TABLE (
    child_id uuid, unit_id uuid, type koski_study_right_type,
    oph_unit_oid text, oph_organizer_oid text,
    void_date date
)
LANGUAGE SQL STABLE PARALLEL SAFE
BEGIN ATOMIC
    SELECT
        ksr.child_id,
        ksr.unit_id,
        ksr.type,
        d.oph_unit_oid,
        d.oph_organizer_oid,
        ksr.void_date
    FROM koski_study_right ksr
    JOIN koski_unit d ON ksr.unit_id = d.id
    JOIN person pr ON ksr.child_id = pr.id
    WHERE EXISTS (SELECT FROM koski_child WHERE koski_child.id = ksr.child_id)
    AND NOT EXISTS (
        SELECT 1
        FROM koski_placement(today) kp
        WHERE (kp.child_id, kp.unit_id, kp.type) = (ksr.child_id, ksr.unit_id, ksr.type)
    )
    AND ksr.study_right_oid IS NOT NULL;
END;
