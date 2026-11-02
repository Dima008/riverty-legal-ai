// Parts 4 and 5 (decision 90). Infrastructure: the Azure target next to the prototype (bought
// building blocks, built what is Riverty's); how a contract saved in SharePoint reaches the
// register is a deep dive since decision 96 (SHAREPOINT, below). Adoption: one team and one question
// (docs/context/briefing.md, section 8). The release gate is said on 'azure' ("any model must first
// pass the test questions"); the card 'cost' with the gate is a deep dive (decision 96). Facts about Microsoft
// services are the ones verified against Microsoft Learn (decisions 79 and 80); numbers of our own
// come from deck-data.json, a stored evaluation file or the briefing (?raw).
import briefing from "../../../../docs/context/briefing.md?raw";
import findingsPy from "../../../../api/findings.py?raw";
import qualityPy from "../../../../api/quality.py?raw";
import i18n from "../../i18n.tsx?raw";
import llmPy from "../../../../pipeline/llm.py?raw";
import runPy from "../../../../pipeline/run.py?raw";
import stats from "../../../../eval/results/2026-10-31_extract-v2_stats.json";
import { Build } from "../Build";
import type { Slide } from "../types";
import "./acts.css";
import deck from "./deck-data.json";

const MODEL = stats.config.extraction[0].model;             // the model that read the register used in the talk
const QUESTIONS = stats.questions.length;                   // the test questions a new model must pass (the release gate of 'cost')
// Gemini or any other model: all model access sits in one adapter file (pipeline/llm.py, guarded below)
const ADAPTER = "Swapping Azure OpenAI for another provider only touches this file.";
// 'azure' note 0: "Only the model calls go to Azure" - the only Python file that imports openai is
// pipeline/llm.py; "no Dockerfile or Terraform yet" - no Dockerfile, *.tf or infra/ in the repository
// (panel design 1.4; the IaC glob covers the root and the two likely build folders, not the whole tree)
const PY = import.meta.glob(["../../../../pipeline/*.py", "../../../../api/*.py"],
  { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const CALLS_MODEL = Object.entries(PY).filter(([, src]) => /^\s*(from|import) openai\b/m.test(src)).map(([f]) => f);
const IAC = Object.keys(import.meta.glob(["../../../../Dockerfile", "../../../../*.tf", "../../../../infra/**",
  "../../../../api/Dockerfile", "../../../../web/Dockerfile"]));

// target vs prototype, per role (web/src/story/chapters/architecture/map.ts, decisions 35, 79, 80)
const ROLES = [
  // Microsoft Graph is introduced in the deep dive 'sharepoint' (order pass #32, decision 96)
  { role: "Contracts", proto: "data/inbox folder", target: "SharePoint library" },
  { role: "Read scans", proto: "Tesseract", target: "Content Understanding" },
  // the prototype already calls Azure OpenAI (Global Standard, decision 34) with test data only:
  // synthetic contracts and public CUAD contracts (decisions 29, 30) - never "synthetic data only"
  { role: "Read and check", proto: `${MODEL} on Azure OpenAI (Global Standard, test data only)`, target: "Azure OpenAI in Foundry, EU data zone" },
  { role: "Register", proto: "SQLite", target: "PostgreSQL" },
  { role: "Search", proto: "SQLite keywords + embeddings", target: "Azure AI Search" },
  { role: "Hidden instructions", proto: "a pattern check", target: "+ Prompt Shields" },
  { role: "Who may decide", proto: "two simulated reviewers", target: "Entra ID roles" },
  { role: "Runs", proto: "on the laptop", target: "Container Apps" },
];

function Azure() {
  return (
    <div className="x-az">
      <div className="x-az-list">
        <div className="x-az-head"><span>Job</span><span>Prototype today</span><span>On Azure · target</span></div>
        {ROLES.map((r) => (
          <div key={r.role} className="x-az-row"><span className="role">{r.role}</span><span className="proto">{r.proto}</span><span className="target">{r.target}</span></div>
        ))}
      </div>
      <div className="x-buy">
        <Build at={1} className="x-buy-box">
          <h3>Buy</h3>
          <p>The building blocks: reading scans, search, models, identity – Azure services.</p>
        </Build>
        <Build at={1} className="x-buy-box built">
          <h3>Build</h3>
          <p>What is Riverty's: the playbook, the evidence trail, the storage boundary.</p>
        </Build>
        <Build at={2} className="x-key">
          The value is not a framework. It is the architecture: <em>a small, structured world for the AI</em> – every
          finding with evidence.
        </Build>
        <Build at={2} className="x-az-plan">
          Orchestration: Microsoft Agent Framework, LangGraph as fallback – replaceable · the Azure column is the target, not built yet
        </Build>
      </div>
    </div>
  );
}

// Verified facts (scratchpad ms_design.json "sharepoint", decision 79): a subscription on a library
// only says "something changed" (changeType "updated", no file); the delta query says what; lifetime
// 42,300 minutes; Microsoft: notifications usually under a minute, at most six hours, and lost ones
// cannot be recovered - hence the scheduled delta run (the design also counts files; the card leaves
// that out, it is never explained). Read rights and renewal
// are in the deep dive 'graph-details'. Not built (CLAUDE.md, known gaps): the card is tagged as the
// target design and says "would"; the prototype's way in is the folder of follow-m18 and live-add.
// The seconds for M18 are its two model calls only
// (deck.m18.model: reading + checking) - download, OCR and indexing are not measured per document,
// so card and note say "the model calls", never the whole pipeline.
const M18_SECONDS = Math.round(deck.m18.model.seconds);
const WATCH_S = Number(/"--interval", type=int, default=(\d+)/.exec(runPy)?.[1]);   // the prototype's inbox watcher

function SharePoint() {
  return (
    <div>
      <div className="x-sp-tag"><span className="x-tag planned">target design</span> not built yet · prototype today: a folder, checked every {WATCH_S} s</div>
      <div className="x-sp">
        <div className="x-st code"><span className="x-st-kind">person</span><span className="x-st-name">Saved</span><span className="x-st-fact">a lawyer saves a contract in the SharePoint library</span></div>
        <span className="x-sp-arrow">→</span>
        <Build at={1} className="x-st code"><span className="x-st-kind">Microsoft Graph</span><span className="x-st-name">“Something changed”</span><span className="x-st-fact">a subscription wakes us up – it never says which file</span></Build>
        <span className="x-sp-arrow">→</span>
        <Build at={1} className="x-st code"><span className="x-st-kind">our service</span><span className="x-st-name">“What changed?”</span><span className="x-st-fact">the delta query lists new, changed and deleted files</span></Build>
        <span className="x-sp-arrow">→</span>
        <Build at={2} className="x-st store"><span className="x-st-kind">pipeline</span><span className="x-st-name">In the register</span><span className="x-st-fact">download, then the fixed steps – for {deck.m18.doc_id}, the model calls took about {M18_SECONDS} s</span></Build>
      </div>
      <Build at={3} className="x-sp-net two">
        <div className="x-fact">Usually <b>under a minute</b>, at most <b>six hours</b> – Microsoft's numbers for the message.</div>
        <div className="x-fact">Messages can get lost: a <b>scheduled delta run</b> would catch every file.</div>
      </Build>
    </div>
  );
}

// Adoption (docs/context/briefing.md, section 8): co-design with a few power users and a baseline,
// a pilot next to today's process, training in reading evidence (automation bias, AI Act Art. 4),
// rollout team by team; Legal owns the rules, corrections flow back into the test set after
// review. Build 2, "Value, measured": time per question against today's baseline, and how often
// lawyers overrule - GET /api/monitoring counts that already (api/quality.py, no screen yet). Never
// an "open findings" count from monitoring: it depends on the runs of the day. Reviews are stored
// per finding and reused (decision 73); the tool speaks German and English (decision 74).
const POWER_USERS = /co-design with (\d+)–(\d+) power users/.exec(briefing);
const [FEW_LO, FEW_HI] = [POWER_USERS?.[1] ?? "?", POWER_USERS?.[2] ?? "?"];

function Adoption() {
  return (
    <div className="x-ra">
      <div>
        <h3>Start small</h3>
        <ol className="x-ol">
          <li>Measure today, with {FEW_LO}–{FEW_HI} lawyers</li>
          <li>One question next to the old way, for a few weeks</li>
          <li>Training: read the evidence on the page – don't trust blindly</li>
          <li>Then the next question, the next team</li>
        </ol>
      </div>
      <Build at={1}>
        <h3>Legal owns it</h3>
        <ol className="x-ol">
          <li>The playbook is Legal's – their guidelines, as data</li>
          <li>Corrections go into the test set, after review</li>
        </ol>
      </Build>
      <Build at={2}>
        <h3>Value, measured</h3>
        <ol className="x-ol">
          <li>Time per question – against today</li>
          <li><span>How often lawyers overrule <span className="x-ra-tag">counted already</span></span></li>
          <li>A review is stored and reused</li>
          <li>German or English</li>
        </ol>
      </Build>
    </div>
  );
}

// ---------------------------------------------------------------- guards (development only)
if (import.meta.env.DEV) {
  const problems = [
    !POWER_USERS && "card 'run-it': the briefing no longer says 'co-design with N–M power users' (section 8)",
    !qualityPy.includes('"override_rate"') && "card 'run-it': 'how often lawyers overrule - counted already' - GET /api/monitoring (api/quality.py) has no override rate",
    !findingsPy.includes("reuses it") && "card 'run-it': 'a review is stored and reused' - api/findings.py no longer says so (decision 73)",
    !/export type Lang = "en" \| "de"/.test(i18n) && "card 'run-it': 'German or English' - web/src/i18n.tsx has no German any more (decision 74)",
    !llmPy.includes(ADAPTER) && "card 'azure': the note says any model sits behind one adapter file - pipeline/llm.py no longer says so",
    !(CALLS_MODEL.length === 1 && CALLS_MODEL[0].endsWith("pipeline/llm.py"))
      && `card 'azure': the note says only the model calls go to Azure, through one file - ${CALLS_MODEL.join(", ") || "no file"} import openai`,
    IAC.length > 0 && `card 'azure': the note says Container Apps and Terraform are planned, not built - found ${IAC.join(", ")}`,
    QUESTIONS !== 8 && `card 'azure': the release gate names the test questions - the stored evaluation has ${QUESTIONS}`,
    !(M18_SECONDS > 0) && "card 'sharepoint': M18's model seconds are missing in deck-data.json",
    !(WATCH_S > 0) && "card 'sharepoint': the watcher's interval is no longer in pipeline/run.py",
    !(deck.m18.model.calls > 1) && "card 'sharepoint': the note speaks of M18's model calls (reading and checking) - deck-data.json has fewer",
    MODEL !== (deck.m18.stations.find((s) => s.station === "extract")?.facts as Record<string, unknown> | undefined)?.model
      && "card 'azure': the model of the stored evaluation is not the one that read M18 in the register",
  ].filter(Boolean);
  for (const p of problems) console.error(`parts 4 and 5: ${p}`);
}

/** Part 4: infrastructure. */
export const INFRASTRUCTURE: Slide[] = [
  {
    id: "part-4", act: 4, kind: "opener", title: "Infrastructure", steps: 0, seconds: 5,
    quote: ["A basic explanation of the infrastructure you would leverage"],
    notes: ["Where would it run at Riverty?"],
    words: [{ word: "infrastructure", say: "IN-fruh-struk-cher" }],
  },
  {
    id: "azure", act: 4, kind: "content", title: "On Azure: buy the building blocks, build what is Riverty's.", steps: 2, seconds: 77, Body: Azure,
    notes: [
      // the task: "two guiding principles" (best of breed, then compared with Microsoft) and its stack list -
      // what is planned is said as planned: no Dockerfile, no Terraform file in the repository. Today
      // (panel design, fact-checked): the laptop; only the model calls (reader, checker, embeddings, all
      // through pipeline/llm.py) go to Azure OpenAI, with test data only - synthetic or public (CUAD).
      "Today it runs on my laptop. Only the model calls go to Azure, with test data only. " +
        "You choose in two steps: best of breed, then compare with Microsoft. I measured Prompt Shields and a bigger model. " +
        "On Azure, each part would get its service. Content Understanding for scans. Azure OpenAI in the EU data zone. Entra ID for approvals. " +
        "Container Apps, set up with Terraform. All this is planned: no Dockerfile or Terraform yet.",
      "We buy the building blocks. We build what is Riverty's: playbook, evidence, storage boundary.",
      `Gemini? The model sits behind one small adapter file. Any model must first pass the ${QUESTIONS} test questions. ` +
        "LangChain or LangGraph? Not needed today: code fixes the order. Target: Microsoft Agent Framework, LangGraph as fallback. " +
        "The value is the architecture: a small, structured world for the AI.",
    ],
    words: [{ word: "Azure", say: "AZH-er" }, { word: "Entra", say: "EN-truh" }, { word: "Terraform", say: "TER-uh-form" }, { word: "Gemini", say: "JEM-ih-nye" },
      { word: "adapter", say: "uh-DAP-ter" }, { word: "LangGraph", say: "LANG-graf" }, { word: "architecture", say: "AR-kih-tek-cher" }],
  },
];

/** A deep dive since decision 96 (the main track at most 22:00 without cuts), listed in deep.tsx before
 *  'graph-details'. On the main track SharePoint is the source on 'tomorrow', 'follow-m18', the first
 *  row of 'azure' and 'live-add' ("our stand-in for SharePoint"). */
export const SHAREPOINT: Slide = {
  id: "sharepoint", act: 7, kind: "content", title: "Saved in SharePoint – how does it reach the register?", steps: 3, seconds: 44, deep: true, Body: SharePoint,
  notes: [
    // the target, not built (tag on screen): what is not built says would; the pipeline and its seconds are built and measured
    "Target design: a lawyer saves a contract in SharePoint.",
    "Microsoft Graph is Microsoft's interface to SharePoint. We would subscribe to the library. Then Graph would say only: something changed. The delta query would then ask: what changed?",
    `Then the pipeline reads it – the fixed steps you saw with ${deck.m18.doc_id}. Its model calls took about ${M18_SECONDS} seconds.`,
    "Messages usually come within a minute, at most six hours. Lost ones? A scheduled run would check again.",
  ],
  words: [{ word: "subscribe", say: "sub-SKRIBE" }, { word: "Graph", say: "GRAF" }, { word: "scheduled", say: "SHED-yoold" }],
};

/** Part 5: adoption. */
export const ADOPTION: Slide[] = [
  {
    id: "part-5", act: 5, kind: "opener", title: "Adoption", steps: 0, seconds: 5,
    quote: ["A concept for helping our colleagues adopt the solution and ensure they get the most value out of it"],
    notes: ["How do lawyers get the most value?"],
    words: [{ word: "adoption", say: "uh-DOP-shun" }],
  },
  {
    id: "run-it", act: 5, kind: "content", title: "Adoption: one team, one question – measured against today.", steps: 2, seconds: 62, Body: Adoption,
    notes: [
      // the task: "Our legal colleagues currently leverage a variety of tools"
      "Legal already has a variety of tools. This one must earn its place. " +
        `Adoption starts with a pilot: one team, one question. First we measure today, with ${FEW_LO} or ${FEW_HI} lawyers. ` +
        "Then the question runs next to the old way, for a few weeks. Training: read the evidence on the page, don't trust it blindly. Then the next question, the next team.",
      // "their guidelines, as data" is explained on 'checks' and stays on screen here
      "Legal owns it: the playbook is theirs. Corrections go into the test set.",
      // the task: "create more with the same number of engineers" - said for Legal (picked up from the deep dive 'cost', decision 96)
      "Value, measured: your definition of productivity. The same lawyers answer more questions. " +
        "We compare time per question with today. The prototype already counts how often lawyers overrule it. " +
        "Reviews are reused. And lawyers work in German or English.",
    ],
    words: [{ word: "variety", say: "vuh-RY-ih-tee" }, { word: "adoption", say: "uh-DOP-shun" }, { word: "blindly", say: "BLYND-lee" },
      { word: "productivity", say: "proh-duk-TIV-ih-tee" }, { word: "overrule", say: "oh-ver-ROOL" }],
  },
];
