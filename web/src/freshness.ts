// Is an open answer still up to date (spec 5.4, D13)? An answer is a snapshot: it never changes
// underneath the lawyer. Instead the work bar says when the register has changed since. It compares
// membership: the same question is previewed on today's register (POST /runs/preview - no rows, nothing
// stored) and its contracts are compared with the ones the answer covered. "Ask again" = a new run.
// Limitation: a contract that was in the answer and was read again since (a new prompt version, a
// re-extraction) is not detected - membership does not change. Upgrade path: GET /runs/{id}/freshness.
import { api, type Coverage, type MatrixRow, type Plan, type Run } from "./api";
import { planFor, readRecorded } from "./filters";
import type { Live } from "./live";

export interface Freshness {
  current: boolean | null;   // null: an older answer without checked_ids - it cannot tell
  added: string[];           // in scope now, not in the answer: arrived after it
  read: string[];            // "not read yet" in the answer, read since
  removed: string[];         // in the answer, no longer in scope: removed from the register
  reading: string[];         // in scope now, and the model is still reading them
}

const UP_TO_DATE: Freshness = { current: true, added: [], read: [], removed: [], reading: [] };
const CANNOT_TELL: Freshness = { current: null, added: [], read: [], removed: [], reading: [] };

/** The same question again, for today's register. A filtered plan applies its recorded filters again,
 *  so a new contract they would include is in it. An older hand-picked selection keeps its contracts
 *  that are still in the register. null: nothing of the selection is left. */
export function samePlan(run: Run, rows: MatrixRow[]): Plan | null {
  const scope = run.plan.scope;
  if (!scope) return run.plan;                          // the type alone: the server's own rule
  const recorded = readRecorded(scope.filters);
  const plan = recorded
    ? planFor(run.plan, recorded[0], recorded[1], rows)
    : { ...run.plan, scope: { ...scope, doc_ids: scope.doc_ids.filter((id) => rows.some((r) => r.doc_id === id)) } };
  return plan.scope && plan.scope.doc_ids.length === 0 ? null : plan;
}

type Covered = Pick<Coverage, "checked_ids" | "excluded">;
// every contract an answer accounted for: checked, or excluded with a reason
const ids = (c: Covered) => new Set([...(c.checked_ids ?? []), ...c.excluded.map((e) => e.doc_id)]);
// "not extracted (status X)": listed, not checked, because the model has not read it (yet)
const notRead = (c: Covered) => c.excluded.filter((e) => e.reason.startsWith("not extracted")).map((e) => e.doc_id);

/** What changed in the register since this answer, by membership. The answer itself stays a snapshot. */
export async function freshness(run: Run, live: Live): Promise<Freshness> {
  if (run.register_version != null && run.register_version === live.version) return UP_TO_DATE;
  if (!run.coverage.checked_ids || !live.matrix) return CANNOT_TELL;   // an older answer, or the register not loaded
  const plan = samePlan(run, live.matrix.rows);
  const now: Covered = plan ? (await api.previewRun(plan)).coverage : { checked_ids: [], excluded: [] };
  const then = ids(run.coverage), later = ids(now);
  const failed = new Set(live.failed.map((r) => r.doc_id));     // not read, but nobody is reading them any more
  const added = [...later].filter((id) => !then.has(id)).sort();
  const removed = [...then].filter((id) => !later.has(id)).sort();
  const read = notRead(run.coverage).filter((id) => now.checked_ids?.includes(id));
  const reading = notRead(now).filter((id) => !failed.has(id));
  return { current: !added.length && !removed.length && !read.length, added, removed, read, reading };
}
