// The test set as data for the card "test-set": every document, trap and number is read from the
// files that define the set and from the stored evaluation run - nothing is typed by hand, so the
// card cannot drift away from the data (same rule as paper-trail.ts in the story).
import groundTruth from "../../../../data/ground_truth.csv?raw";
import cuadLabels from "../../../../data/cuad_subset/labels.csv?raw";
import dataReadme from "../../../../data/README.md?raw";
import failuresMd from "../../../../docs/failure-cases.md?raw";
import goldQueries from "../../../../data/gold_queries.json";
import stats from "../../../../eval/results/2026-10-31_extract-v2_stats.json";

/** Minimal CSV reader: quoted fields with commas and doubled quotes (labels.csv), CRLF tolerated. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') { field += '"'; i++; }
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

// ---------------------------------------------------------------- the documents we wrote
export interface Doc {
  id: string;
  type: string;       // merchant_agreement | amendment | data_processing_agreement
  language: string;   // EN | DE
  format: string;     // pdf_text | pdf_image_only | jpeg
  cap: string;        // liability cap: standard | paraphrased | absent | "" (not applicable)
  law: string;        // governing law: DE | NL | EN | ""
  special: string;    // special_case column
}

export const DOCS: Doc[] = parseCsv(groundTruth).map((r) => ({
  id: r.doc_id, type: r.doc_type, language: r.language, format: r.format,
  cap: r.liability_cap, law: r.governing_law, special: r.special_case,
}));
export const MERCHANT = DOCS.filter((d) => d.type === "merchant_agreement" || d.type === "amendment");
export const DPA = DOCS.filter((d) => d.type === "data_processing_agreement");
export const AMENDMENTS = DOCS.filter((d) => d.type === "amendment").length;
export const QUESTIONS_N = goldQueries.length;
/** The originals of the planted copies (M01 for M15): outlined, but not a trap themselves. */
export const COPY_TARGETS = new Set(
  DOCS.filter((d) => d.special.startsWith("duplicate_of_")).map((d) => d.special.slice("duplicate_of_".length)),
);

// ---------------------------------------------------------------- the traps, one question each
// The three questions a trap asks of the pipeline: colour on the card means the question.
export const ASKS = [
  { n: 1, name: "Read", ask: "Can it read the page?" },
  { n: 2, name: "Understand", ask: "Does it get the meaning?" },
  { n: 3, name: "Organise", ask: "Is the portfolio in order?" },
] as const;

export interface Trap {
  code: string;                 // the tag on the tile and in the legend
  q: 1 | 2 | 3;                 // which question it asks
  say: string;                  // legend text, from the "Designed traps" table in data/README.md
  test: (d: Doc) => boolean;    // the ground-truth columns that define it
  tag?: (d: Doc) => string;     // a more specific tag than the code, when the row knows more
}

export const TRAPS: Trap[] = [
  { code: "scan", q: 1, say: "scanned pages, no text layer", test: (d) => d.format === "pdf_image_only" || d.format === "jpeg" },
  { code: "German", q: 1, say: "German text", test: (d) => d.language === "DE" },
  { code: "page break", q: 1, say: "a cap split across two pages", test: (d) => d.special === "page_break" },
  { code: "reworded", q: 2, say: "a cap in other words", test: (d) => d.cap === "paraphrased" },
  { code: "decoy", q: 2, say: "look-alike clauses, but no cap", test: (d) => d.cap === "absent" },
  { code: "injection", q: 2, say: "a hidden instruction for the AI", test: (d) => d.special === "prompt_injection" },
  { code: "amendment", q: 3, say: "an old name, already fixed by an amendment", test: (d) => d.special.startsWith("amendment"),
    tag: (d) => (d.type === "amendment" ? "amendment" : "old name") },
  { code: "copy", q: 3, say: "the same contract under another file name", test: (d) => d.special.startsWith("duplicate_of_"),
    tag: (d) => `= ${d.special.slice("duplicate_of_".length)}` },
  { code: "law", q: 3, say: "not under German law", test: (d) => d.law !== "" && d.law !== "DE", tag: (d) => `${d.law} law` },
];

export const trapsOf = (d: Doc) => TRAPS.filter((t) => t.test(d));

// ---------------------------------------------------------------- the real contracts: CUAD
export interface CuadDoc { id: string; cap: boolean }   // cap: the experts' label "Cap On Liability"
export const CUAD: CuadDoc[] = parseCsv(cuadLabels).map((r) => ({ id: r.doc_id, cap: r.cap_on_liability === "True" }));
export const CUAD_CAP = CUAD.filter((c) => c.cap);
export const CUAD_NO_CAP = CUAD.filter((c) => !c.cap);

const cuad = stats.cuad;
export const CUAD_N = cuad.n;
export const CUAD_AGREE = cuad.tp + cuad.tn;
export const CUAD_NO_CAP_AGREED = cuad.tn;
export const CUAD_DIFFER = new Set(cuad.disagreements.map((d) => d.doc_id));

// the source line, from the "Sources and licences" section of data/README.md
const total = /(\d+) public contracts from SEC EDGAR/.exec(dataReadme)?.[1];
export const CUAD_NAME = "CUAD – Contract Understanding Atticus Dataset";
export const CUAD_SOURCE = `The Atticus Project · CC BY 4.0 · real contracts from SEC EDGAR${total ? ` · we use ${CUAD_N} of ${total}` : ""}`;

// Errors of the pipeline that the real contracts revealed and that are fixed: rows of the overview
// table in docs/failure-cases.md (| # | Case | Layer | Caught by | Status |) whose case names a C-id,
// whose layer is a pipeline step and whose status starts with "fixed". A bug of the Workbench that
// hid a C-contract (F24, layer "frontend") is not an error the evaluation on real contracts showed.
const PIPELINE_LAYERS = new Set(["ingest", "extraction", "checks", "families"]);
export const FOUND_BY_CUAD: string[] = failuresMd.split("\n").flatMap((line) => {
  const cells = line.split("|").map((c) => c.trim());
  if (!/^F\d+$/.test(cells[1] ?? "")) return [];
  const ids = /\((C\d\d[^)]*)\)/.exec(cells[2] ?? "")?.[1];
  const layers = (cells[3] ?? "").split("/").map((l) => l.trim());
  const pipeline = layers.length > 0 && layers.every((l) => PIPELINE_LAYERS.has(l));
  return ids && pipeline && (cells[5] ?? "").startsWith("fixed") ? [ids] : [];
});

// ---------------------------------------------------------------- guards (development only)
if (import.meta.env.DEV) {
  const problems = [
    DOCS.length !== stats.metadata.n && `ground_truth.csv has ${DOCS.length} rows, the evaluation saw ${stats.metadata.n}`,
    CUAD.length !== CUAD_N && `labels.csv has ${CUAD.length} rows, the evaluation saw ${CUAD_N}`,
    DOCS.length + CUAD.length !== stats.config.documents && `${DOCS.length} + ${CUAD.length} documents is not the register's ${stats.config.documents}`,
    cuad.unclear !== 0 && `${cuad.unclear} CUAD findings are unclear - the ticks on the card would overstate`,
  ].filter(Boolean);
  for (const p of problems) console.error(`card "test-set": ${p}`);
}
