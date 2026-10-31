// The Double Diamond of chapter 3, filled with the artefacts this project really produced
// (docs/approach.md, chapter 3; docs/context/briefing.md, sections 3-4). Every artefact says
// where it lives and which decisions are linked to it. Numbers the repository can give are
// computed, not typed: the annotated sentences come from chapter 1, the gold set from the stored
// evaluation run.
import gate from "../../../../../eval/results/2026-10-30_extract-v2_laptop.json";
import type { Phase } from "../../chapters";
import { NOTES } from "../Task";

export interface Artefact {
  title: string;
  detail: string;
  source: string;                                // where it lives
  decisions: number[];                           // decisions linked to it (docs/context/decisions.md)
  list?: { label: string; items: string[] };     // longer lists stay folded
}

export interface DiamondPhase {
  phase: Exclude<Phase, "All">;
  gist: string;          // three words inside the diamond
  question: string;      // what the phase has to answer
  artefacts: Artefact[];
}

// briefing.md, section 3
const STAKEHOLDERS = ["Legal", "management", "engineering", "security and data protection", "compliance", "finance"];

// approach.md, chapter 2 – Riverty's own sentence: agents fail on the size of the environment
const ROOT_CAUSES = [
  "thousands of contracts fit no context window",
  "mixed formats: PDF, scans, JPEG",
  "no metadata",
  "uncontrolled open access",
  "answers without evidence force lawyers to check everything again",
];

// approach.md, chapter 10 – asked at the end of the talk
const QUESTIONS_FOR_RIVERTY = [
  "How many contracts are there, and what share are scans or handwritten?",
  "Which languages?",
  "Which models and regions are approved?",
  "Where do the guidelines live, and who owns them?",
  "What does the storage API accept?",
  "Which error is worse for Legal – a missed contract or a false alarm?",
  "Is there a contract management system already?",
  "How many users and power users?",
  "What is the budget?",
];

// briefing.md, sections 3 and 6 – the use cases and how far the MVP canvas took each one
const USE_CASES: { id: string; name: string; scope: "MVP" | "example" | "later" }[] = [
  { id: "UC1", name: "contract register", scope: "MVP" },
  { id: "UC2", name: "clause search incl. negative search", scope: "MVP" },
  { id: "UC3", name: "company names", scope: "MVP" },
  { id: "UC4", name: "guideline check", scope: "example" },
  { id: "UC5", name: "pairwise comparison", scope: "later" },
  { id: "UC6", name: "company interests", scope: "later" },
  { id: "UC7", name: "handwritten contracts", scope: "example" },
  { id: "UC8", name: "compliant copy", scope: "example" },
  { id: "UC9", name: "review and approval", scope: "MVP" },
];
const ucs = (scope: string) => USE_CASES.filter((u) => u.scope === scope).map((u) => u.id).join(", ");

// approach.md, chapter 6 – the traps designed into the gold set
const TRAPS = [
  "paraphrased caps", "distractor clauses", "a page break", "an injection", "a copy", "scans", "German text",
  "an amendment", "foreign law",
];

// the stored evaluation run (eval/results): how many documents, which gold questions
const GOLD_QUESTIONS = gate.questions.map((q) => q.id);
const GOLD_RANGE = `${GOLD_QUESTIONS[0]}–${GOLD_QUESTIONS[GOLD_QUESTIONS.length - 1]}`;

export const PHASES: DiamondPhase[] = [
  {
    phase: "Discover", gist: "understand the task", question: "What is really asked?",
    artefacts: [
      { title: "The task, classified sentence by sentence",
        detail: `${NOTES.length} sentences: explicit asks, constraints, hints – each with its requirement.`,
        source: "docs/context/case-study.md · chapter 1", decisions: [1, 2] },
      { title: `${STAKEHOLDERS.length} stakeholder groups`,
        detail: `${STAKEHOLDERS.join(", ")}.`,
        source: "docs/context/briefing.md §3", decisions: [] },
      { title: "Root causes",
        detail: "Agents fail on the size of the environment, not on the model.",
        list: { label: "root causes", items: ROOT_CAUSES },
        source: "docs/approach.md, chapter 2", decisions: [4] },
      { title: "Open questions for Riverty",
        detail: "Asked at the end of this talk.",
        list: { label: "questions", items: QUESTIONS_FOR_RIVERTY },
        source: "docs/approach.md, chapter 10", decisions: [] },
    ],
  },
  {
    phase: "Define", gist: "frame the problem", question: "Which problem do we solve – and when is it solved?",
    artefacts: [
      { title: "Problem statement",
        detail: "Proving that a clause is missing needs every contract; top-k retrieval cannot prove absence.",
        source: "docs/approach.md, chapter 2", decisions: [5, 17] },
      { title: "Quality goal: 100 % traceable instead of 100 % accurate",
        detail: "Found, missing, unclear – missing and unclear shown together. Observations, not legal judgments.",
        source: "docs/approach.md, chapter 2", decisions: [3, 21] },
      { title: `Use cases ${USE_CASES[0].id}–${USE_CASES[USE_CASES.length - 1].id}, narrowed to an MVP`,
        detail: `MVP: ${ucs("MVP")} · as examples: ${ucs("example")} · later: ${ucs("later")}.`,
        list: { label: "use cases", items: USE_CASES.map((u) => `${u.id} ${u.name} – ${u.scope}`) },
        source: "docs/context/briefing.md §3, §6", decisions: [16] },
      { title: "A gold set with designed traps",
        detail: `${gate.config.documents} documents, ${GOLD_QUESTIONS.length} gold questions (${GOLD_RANGE}) with known answers.`,
        list: { label: "designed traps", items: TRAPS },
        source: "data/ground_truth.csv · data/gold_queries.json", decisions: [20, 29, 30] },
    ],
  },
  {
    phase: "Develop", gist: "build and measure", question: "Does it work – and how do we know?",
    artefacts: [
      { title: "The pipeline",
        detail: "OCR → clause sections → one extraction call per whole contract → families → index → register.",
        source: "pipeline/ · docs/pipeline.md", decisions: [9, 10, 37] },
      { title: "Checks born from measured failures",
        detail: "Quote in the source, clause vocabulary, independent checker, absence signals, OCR quality, injection guard.",
        source: "pipeline/extract.py · docs/failure-cases.md", decisions: [6, 38, 39, 41] },
      { title: "Evaluation with ablation",
        detail: `${GOLD_RANGE}: the model alone against the model with checks; safeguards switched off by replay.`,
        source: "eval/check_register.py · eval/what_if.py", decisions: [46, 67] },
      { title: "Repeated runs and a model comparison",
        detail: "One run is not a measurement: fresh registers, gpt-4.1-mini against gpt-4.1.",
        source: "eval/repeat.py · eval/results/", decisions: [42, 64, 65] },
    ],
  },
  {
    phase: "Deliver", gist: "hand it over", question: "Can Legal use it safely?",
    artefacts: [
      { title: "Legal Workbench",
        detail: "Question → plan → coverage → triage → four eyes → archive copy after approval → audit log.",
        source: "api/ · web/src/workbench/", decisions: [13, 53, 57, 71, 73] },
      { title: "Monitoring",
        detail: "Cost, latency, review load, override rate. A model change is a release, not a setting.",
        source: "api/quality.py (GET /monitoring)", decisions: [63, 69] },
      { title: "Adoption concept",
        detail: "Five phases with exit gates, from co-design with power users to rollout with champions.",
        source: "docs/approach.md, chapter 8", decisions: [] },
      { title: "This website",
        detail: "The talk and the tool in one site; every figure justified.",
        source: "web/src/story/", decisions: [15, 66, 68] },
    ],
  },
];
