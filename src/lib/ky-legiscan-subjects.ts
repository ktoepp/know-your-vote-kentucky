/**
 * Persist and search LegiScan bill subjects ({ subject_id, subject_name }) as returned by getBill.
 */

export interface LegiscanBillSubject {
  subject_id: number;
  subject_name: string;
}

function normaliseLegiscanSubjectsInput(subjectsUnknown: unknown): unknown[] {
  if (Array.isArray(subjectsUnknown)) return subjectsUnknown;
  if (!subjectsUnknown || typeof subjectsUnknown !== 'object') return [];
  return Object.entries(subjectsUnknown as Record<string, unknown>).flatMap(([k, v]) => {
    if (v != null && typeof v === 'object' && 'subject_name' in v) return [v];
    return [{ subject_id: Number(k), subject_name: String(v ?? '') }];
  });
}

/**
 * Normalise Raw LegiScan `subjects` (array or keyed object) into DB JSONB rows + a deterministic search blob.
 */
export function legiscanSubjectColumnsFromRawPayload(subjectsUnknown: unknown): {
  legiscan_subjects: LegiscanBillSubject[];
  legiscan_subjects_search: string | null;
} {
  const arr = normaliseLegiscanSubjectsInput(subjectsUnknown);
  if (!arr.length) {
    return { legiscan_subjects: [], legiscan_subjects_search: null };
  }

  const subjects: LegiscanBillSubject[] = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const name = String(o.subject_name ?? '').trim();
    if (!name) continue;
    const sidRaw = Number(o.subject_id);
    const subject_id = Number.isFinite(sidRaw) ? sidRaw : 0;
    subjects.push({ subject_id, subject_name: name });
  }

  if (subjects.length === 0) {
    return { legiscan_subjects: [], legiscan_subjects_search: null };
  }

  const uniqueLower = [...new Set(subjects.map((s) => s.subject_name.toLowerCase()))].sort((a, b) =>
    a.localeCompare(b),
  );
  return {
    legiscan_subjects: subjects,
    legiscan_subjects_search: uniqueLower.join('\n'),
  };
}

export function legiscanSubjectColumnsFromDetail(detail: { subjects?: unknown } | null): {
  legiscan_subjects: LegiscanBillSubject[];
  legiscan_subjects_search: string | null;
} {
  return legiscanSubjectColumnsFromRawPayload(detail?.subjects ?? null);
}
