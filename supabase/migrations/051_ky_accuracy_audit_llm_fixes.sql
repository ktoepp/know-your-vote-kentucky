-- 051_ky_accuracy_audit_llm_fixes.sql
--
-- One-shot data fixes for the LLM-review findings in accuracy-audit run
-- ee50b461 (seed 1072134505). Each block is idempotent — safe to re-run.
--
-- Companion code changes (this same PR):
--   * ky-topic-classifier.ts — new 'Constitutional Amendments' topic (detected
--     by title shape, so the ratification-clause "ballot"/"voters" hits stop
--     mistagging const-amendment bills as Voting Rights); expanded ceremonial
--     detection so memorial-designation resolutions ("designating … Memorial
--     Overpasses …") tag as Honors & Memorials.
--   * ky-topic-legiscan-mapping.ts — bridge LegiScan "Constitution, Ky." to
--     the new topic.
--   * ky-topic-pages.ts, tooltipContent.ts — topic-page intro + glossary
--     entry for Constitutional Amendments; rewrote Kentucky Senate (class
--     system) and Labor (dropped "collective bargaining", misleading in a KY
--     right-to-work context) glossary entries.
--   * ky-content-generation.ts — tightened "Who it may affect" grounding in
--     the ai_summary prompt.
--
-- Retag every constitutional-amendment bill in one pass so the new topic is
-- consistent across the corpus; the ratification-clause "Voting Rights" false
-- positives are stripped at the same time from bills whose title has no
-- voting/election language of its own.

-- ============================================================
-- Topic retagging: constitutional amendments
-- ============================================================
WITH const_amend AS (
  SELECT id, title, topics
  FROM ky_bills
  WHERE title ~* 'proposing an amendment to (section|sections).*?constitution of kentucky'
)
UPDATE ky_bills b
SET topics = (
  SELECT ARRAY(
    SELECT DISTINCT t
    FROM unnest(
      CASE
        WHEN c.title ~* '\y(voter|voters|voting|election|elections|ballot|redistricting|reapportionment|absentee)\y'
          THEN b.topics
        ELSE array_remove(b.topics, 'Voting Rights')
      END
      || ARRAY['Constitutional Amendments']
    ) AS t
  )
)
FROM const_amend c
WHERE b.id = c.id
  AND (
    NOT ('Constitutional Amendments' = ANY(b.topics))
    OR (
      'Voting Rights' = ANY(b.topics)
      AND c.title !~* '\y(voter|voters|voting|election|elections|ballot|redistricting|reapportionment|absentee)\y'
    )
  );

-- ============================================================
-- Topic retagging: memorial-designation resolutions
-- ============================================================
UPDATE ky_bills
SET topics = ARRAY['Honors & Memorials']
WHERE title ~* '^(a\s+(joint\s+|concurrent\s+)?resolution\s+)?designating\y.*?\ymemorial\y'
  AND (
    NOT ('Honors & Memorials' = ANY(topics))
    OR cardinality(topics) > 1
  );

-- ============================================================
-- ai_summary rewrites for the 3 flagged bills
-- ============================================================
UPDATE ky_bills
SET ai_summary =
  'This bill would make it a crime in Kentucky to release balloons into the air. It creates a new offense under KRS Chapter 512, meaning violations could carry legal penalties.

Who it may affect: anyone who organizes or participates in balloon releases, such as at events, ceremonies, or celebrations.'
WHERE bill_number = 'HB53' AND session = '2025 Regular Session';

UPDATE ky_bills
SET ai_summary =
  'This resolution would direct Kentucky''s Cabinet for Health and Family Services to allow outside companies that process food assistance benefits to share data directly with the federal agency that oversees those benefits, the U.S. Department of Agriculture. It aims to improve coordination between the state''s benefit processing system and the federal government.

Who it may affect: the state agencies and third-party companies that manage SNAP benefits in Kentucky.'
WHERE bill_number = 'HJR68' AND session = '2026 Regular Session';

UPDATE ky_bills
SET ai_summary =
  'This resolution would officially recognize October 10, 2025, as Higher Education Mental Health Day in Kentucky, drawing attention to mental health as it relates to colleges and universities. It is a symbolic declaration and does not create new laws, programs, or funding.

Who it may affect: college and university students in Kentucky.'
WHERE bill_number = 'HR27' AND session = '2025 Regular Session';
