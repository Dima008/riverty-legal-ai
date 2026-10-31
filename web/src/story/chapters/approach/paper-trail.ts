// The paper trail of chapter 3, read from the repository when the site is built. The decision
// log, the failure catalogue, the development log, the tests and the pre-commit hook are imported
// as plain text (Vite "?raw") and counted here. No count is typed by hand, so the slide cannot
// drift from the files: a new decision or failure case changes the number on the next build.
import decisionsMd from "../../../../../docs/context/decisions.md?raw";
import devLogMd from "../../../../../docs/dev-log.md?raw";
import failuresMd from "../../../../../docs/failure-cases.md?raw";
import preCommit from "../../../../../.githooks/pre-commit?raw";

// ---------------------------------------------------------------- decisions (German original)

export interface Decision {
  n: number;
  title: string;        // German, verbatim
  area: string;         // German, e.g. "Architektur"
  status: string;       // German, e.g. "Entschieden (von Dima bestätigt am 30.10.)"
  prominence: string;   // German: "Hauptpunkt" | "Kurz erwähnen" | "Nur auf Nachfrage"
  reason: string;       // "Begründung: ..."
  rejected: string;     // "Verworfen: ..."
  extra: string[];      // any further line, e.g. "Umgesetzt 31.10.: ..."
}

/** One block per heading "### <n>. <title>", then "area · status · prominence", then the fields. */
function parseDecisions(md: string): Decision[] {
  return md.split(/\r?\n(?=### \d+\. )/).slice(1).map((block) => {
    const [heading, meta = "", ...rest] = block.split(/\r?\n/).filter((line) => line.trim());
    const [, n = "0", title = ""] = heading.match(/^### (\d+)\. (.+)$/) ?? [];
    const [area = "", status = "", prominence = ""] = meta.replace(/\*\*/g, "").split(" · ");
    const field = (prefix: string) => rest.find((l) => l.startsWith(prefix))?.slice(prefix.length) ?? "";
    return {
      n: Number(n), title, area, status, prominence,
      reason: field("Begründung: "),
      rejected: field("Verworfen: "),
      extra: rest.filter((l) => !l.startsWith("Begründung: ") && !l.startsWith("Verworfen: ")),
    };
  });
}

export const DECISIONS = parseDecisions(decisionsMd);
export const isMainPoint = (d: Decision) => d.prominence === "Hauptpunkt";
export const isProposal = (d: Decision) => d.status.startsWith("Vorschlag");

// English names for the German labels of the log (a translation of the labels, not of the text)
export const AREA_EN: Record<string, string> = {
  Analyse: "Analysis", Architektur: "Architecture", Daten: "Data", Governance: "Governance",
  Prozess: "Process", Präsentation: "Presentation", Vorgehen: "Approach",
};
export const PROMINENCE_EN: Record<string, string> = {
  Hauptpunkt: "main point", "Kurz erwähnen": "mentioned briefly", "Nur auf Nachfrage": "on request only",
};
export function statusEn(status: string): string {
  if (status.startsWith("Vorschlag")) return "proposal";
  const confirmed = status.match(/bestätigt am ([\d.]+)/);
  if (confirmed) return `decided, confirmed by Dima on ${confirmed[1]}`;
  return status === "Entschieden" ? "decided" : status;
}

// ---------------------------------------------------------------- failure cases

export interface FailureCase {
  id: string;           // "F10"
  title: string;
  layer: string;
  caughtBy: string;
  status: string;
}

/** The overview table of docs/failure-cases.md: every row that starts with "| F<n> |". */
function parseFailures(md: string): FailureCase[] {
  return md.split(/\r?\n/).filter((line) => /^\| F\d+ \|/.test(line)).map((line) => {
    const [id = "", title = "", layer = "", caughtBy = "", status = ""] = line.split("|").slice(1, -1).map((c) => c.trim());
    return { id, title, layer, caughtBy, status };
  });
}

export const FAILURES = parseFailures(failuresMd);

// ---------------------------------------------------------------- development log

export interface DevStep {
  date: string;         // "2026-10-31"
  title: string;
  metric: string;       // the "Metric before → after" point, whitespace collapsed
}

/** One block per dated heading "## <yyyy-mm-dd> · <title>", newest first. */
function parseDevLog(md: string): DevStep[] {
  return md.split(/\r?\n(?=## \d{4}-\d{2}-\d{2} )/).slice(1).map((block) => {
    const [, date = "", title = ""] = block.match(/^## (\d{4}-\d{2}-\d{2}) · (.+)/) ?? [];
    const metric = block.match(/\*\*Metric before → after:\*\*([\s\S]*?)(?=\r?\n- \*\*|\r?\n---|$)/)?.[1] ?? "";
    return { date, title, metric: metric.replace(/\s+/g, " ").trim() };
  });
}

export const DEV_STEPS = parseDevLog(devLogMd);

// ---------------------------------------------------------------- tests and the hook

// every tests/test_*.py as text; a test is a function whose name starts with test_
const testFiles = import.meta.glob("../../../../../tests/test_*.py", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
export const TEST_FUNCTIONS = Object.values(testFiles).reduce((sum, src) => sum + (src.match(/^\s*def test_/gm)?.length ?? 0), 0);

/** The numbered rules in the hook's header comment ("#   1. no secrets ..."), verbatim. */
export const HOOK_RULES = preCommit.split(/\r?\n/).filter((l) => /^#\s+\d\. /.test(l)).map((l) => l.replace(/^#\s+\d\. /, ""));
