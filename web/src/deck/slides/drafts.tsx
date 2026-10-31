// Acts 3-6 in the new structure (decision 76), planned but not rebuilt yet: each screen names its
// statement and the visual it will get, so the whole arc can be reviewed in the overview (O).
import type { Slide } from "../types";

function Planned({ visual }: { visual: string }) {
  return <div className="planned"><span className="label">Visual, being built</span>{visual}</div>;
}

const draft = (id: string, act: number, title: string, seconds: number, visual: string, notes: string): Slide => ({
  id, act, kind: "content", title, steps: 0, seconds, notes, draft: true, Body: () => <Planned visual={visual} />,
});
const opener = (id: string, act: number, title: string, notes: string): Slide => ({
  id, act, kind: "opener", title, steps: 0, seconds: 4, notes,
});

export const LATER: Slide[] = [
  opener("act-3", 3, "Our solution: read once, then look up", "How we deliver the three guarantees."),
  draft("compile", 3, "Read every contract once – then every question is a lookup.", 35,
    "A stack of contracts turns into one table; questions become lookups in that table.",
    "Compile, don't search: the expensive reading happens once per contract, the questions are cheap."),
  draft("register", 3, "The register: every contract against Legal's playbook.", 35,
    "The live register: rows are contracts, columns are the playbook clauses, cells say found / not found / unclear.",
    "Columns come from Legal's playbook as data; a cell opens the evidence on the page."),
  draft("follow-m18", 3, "Follow one contract: M18, a scanned agreement.", 50,
    "The pipeline builds step by step with M18's real numbers: read (OCR 93 %) → 12 sections → the model reads → checks → register ($0.0012).",
    "One contract through the whole pipeline, with the numbers the register recorded."),
  draft("workflow", 3, "AI only where meaning is needed – fixed steps everywhere else.", 35,
    "The same pipeline coloured by who acts: code, model, person. Most boxes are code.",
    "A workflow, not a free agent: the steps are fixed in code, so 'every contract was read' is a fact, not a claim."),
  draft("methods", 3, "Four agentic methods, each with a job.", 40,
    "Four cards: plan first · maker and checker · a tool behind a gate · a person decides.",
    "The agentic patterns we do use, each answering one failure mode."),
  draft("checks", 3, "Checks before and after every model call.", 35,
    "The guardrail sandwich: the model's claim, then each check, then what the register keeps.",
    "Model status vs register status; a quote that is not in the contract is overruled."),
  draft("injection", 3, "A hidden instruction in M14 – caught.", 30,
    "The hidden note in M14, highlighted on the page, and the four-eyes flag it triggers.",
    "Prompt injection: text addressed to software is detected and sent to two people."),
  draft("human", 3, "A lawyer decides: evidence, four eyes, approval.", 40,
    "Triage → evidence on the page → decision → archive copy only after approval.",
    "Observations, not legal judgments; nothing with external effect without approval."),
  opener("act-4", 4, "Proof", "Does it work – and how do we know?"),
  draft("test-set", 4, "A test set built to break the system.", 30,
    "47 documents, each trap marked: scan, photo, amendment, duplicate, injection, other language.",
    "Synthetic and public contracts with known answers."),
  draft("results", 4, "8 of 8 questions complete – and how sure we can be.", 40,
    "Recall per question and the honest lower bound: at least 0.89 with 95 % confidence.",
    "Perfect on a small set is weak evidence; the held-out set comes next."),
  draft("what-if", 4, "Switch a safeguard off – live.", 45,
    "The what-if switches: turn off the checker and watch contracts slip through.",
    "Each layer earns its place with a number."),
  draft("cost", 4, "$0.12 to read all 47 once. $0 per question.", 25,
    "Two numbers, big.",
    "Every model call is logged with its cost."),
  opener("act-5", 5, "Running it at Riverty", "From the laptop to Azure, and to the people who use it."),
  draft("azure", 5, "On Azure: the same shape, real services.", 35,
    "Target architecture next to the prototype: SharePoint, Content Understanding, Azure OpenAI, AI Search, Container Apps, Entra ID.",
    "The prototype is the target in miniature: same interfaces, local stand-ins."),
  draft("release", 5, "A model change is a release, not a setting.", 30,
    "The release gate: eval must stay at recall 1.0 before a model or prompt changes.",
    "Monitoring: cost, latency, override rate."),
  draft("adoption", 5, "Adoption: one team, one question, measured.", 35,
    "Pilot steps: one question with Legal, minutes saved measured, then the next question.",
    "Trust is earned with evidence on the page, not with a demo."),
  opener("act-6", 6, "Live, and what I learned", "Let me show you."),
  draft("live", 6, "The Legal Workbench, live.", 210,
    "The doorway into the tool: ask, plan, run, evidence, four eyes, archive.",
    "Demo path without a model call; snapshot fallback."),
  draft("close", 6, "100 % traceable instead of 100 % accurate.", 20,
    "One sentence, and the three guarantees again.",
    "What I learned, and what I would ask you."),
];
