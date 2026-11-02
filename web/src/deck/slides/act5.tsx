// Parts 5 and 6 (decisions 90, 99: after the live demo). Infrastructure: the Azure target next to the prototype (bought
// building blocks, built what is Riverty's); how a contract saved in SharePoint reaches the
// register is a deep dive since decision 96 (SHAREPOINT, below). Adoption: co-design, controlled pilot,
// then rollout team by team (docs/context/briefing.md, section 8). The release gate is said on 'azure' ("any model must first
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
// pipeline/llm.py; "Container Apps with Terraform - all planned, not built yet" - no Dockerfile, *.tf or infra/ in the repository
// (panel design 1.4; the IaC glob covers the root and the two likely build folders, not the whole tree)
const PY = import.meta.glob(["../../../../pipeline/*.py", "../../../../api/*.py"],
  { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const CALLS_MODEL = Object.entries(PY).filter(([, src]) => /^\s*(from|import) openai\b/m.test(src)).map(([f]) => f);
const IAC = Object.keys(import.meta.glob(["../../../../Dockerfile", "../../../../*.tf", "../../../../infra/**",
  "../../../../api/Dockerfile", "../../../../web/Dockerfile"]));

// target vs prototype, per role (web/src/story/chapters/architecture/map.ts, decisions 35, 79, 80)
const ROLES = [
  { role: "Read scans", proto: "Tesseract", target: "Content Understanding" },
  // the prototype already calls Azure OpenAI (Global Standard, decision 34) with test data only
  { role: "Read and check", proto: `${MODEL} on Azure OpenAI`, target: "Azure OpenAI in Foundry, EU data zone" },
  { role: "Register", proto: "SQLite", target: "PostgreSQL" },
  { role: "Search", proto: "SQLite keywords + embeddings", target: "Azure AI Search" },
  { role: "Hidden instructions", proto: "a pattern check", target: "+ Prompt Shields" },
  { role: "Who may decide", proto: "two simulated reviewers", target: "Entra ID roles" },
  { role: "Runs", proto: "on the laptop", target: "Container Apps · Terraform" },
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
          <p>Scans, search, models, identity – Azure services.</p>
        </Build>
        <Build at={1} className="x-buy-box built">
          <h3>Build</h3>
          <p>The playbook, the evidence, the storage boundary.</p>
        </Build>
        <Build at={2} className="x-az-plan">
          Azure column: the target, not built yet · Microsoft Agent Framework, LangGraph as fallback
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
        <h3>Co-design</h3>
        <ol className="x-ol">
          <li>{FEW_LO}–{FEW_HI} Legal power users</li>
          <li>Choose one high-value question</li>
          <li>Measure today's time and quality</li>
        </ol>
      </div>
      <Build at={1}>
        <h3>Pilot safely</h3>
        <ol className="x-ol">
          <li>Run next to today's process</li>
          <li>Train with real review scenarios</li>
          <li>Weekly feedback with champions</li>
        </ol>
      </Build>
      <Build at={2}>
        <h3>Scale and improve</h3>
        <ol className="x-ol">
          <li>Roll out team by team</li>
          <li>Legal owns the playbook</li>
          <li>Measure use, time and corrections</li>
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

/** Part 5: infrastructure - after the demo (decision 99). */
export const INFRASTRUCTURE: Slide[] = [
  {
    id: "part-5", act: 5, kind: "opener", title: "Infrastructure · where it runs", steps: 0, seconds: 5,
    quote: ["A basic explanation of the infrastructure you would leverage"],
    notes: [
      "Next, let me explain where this would run at Riverty.",
    ],
    words: [{ word: "infrastructure", say: "IN-fruh-struk-cher" }],
  },
  {
    id: "azure", act: 5, kind: "content", title: "On Azure: buy the building blocks, build what is Riverty's.", steps: 2, seconds: 54, Body: Azure,
    notes: [
      // "best of breed, then Microsoft" (the case study): measured for two parts only - Prompt Shields against
      // our pattern check, gpt-4.1 against the small model; no end-to-end product was compared, so the note
      // does not claim more
      "Today, the prototype runs on my laptop; only the model calls go to Azure, with test data. " +
        "Following your principle – best of breed, then Microsoft – I measured Prompt Shields against our own check for hidden instructions, and the larger model you just saw. " +
        "On Azure, each job in this table would get a managed service – planned, not built.",
      "The rule behind it: we buy the building blocks and build only what is specific to Riverty – the playbook, the evidence and the boundary around contract storage.",
      // the release gate itself (the test questions) is said on 'cost' - here only that the model can change
      // LangGraph as the fallback is on the card (build 2); another model (Gemini) sits behind pipeline/llm.py
      // and must pass the same test questions - answered if asked (guarded above)
      "The planned agent would use the Microsoft Agent Framework, with LangGraph as a fallback.",
    ],
    words: [{ word: "Azure", say: "AZH-er" }, { word: "Entra", say: "EN-truh" }, { word: "Terraform", say: "TER-uh-form" }, { word: "Gemini", say: "JEM-ih-nye" },
      { word: "adapter", say: "uh-DAP-ter" }, { word: "LangGraph", say: "LANG-graf" }, { word: "architecture", say: "AR-kih-tek-cher" }],
  },
];

/** A deep dive since decision 96 (the main track at most 22:00 without cuts), listed in deep.tsx before
 *  'graph-details'. On the main track SharePoint is the source on 'levers', 'architecture', the first
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

/** Part 6: adoption, then the close ('close', act6.tsx) - the last part since decision 99; its opener
 *  also carries the outline's last bullet, which the close answers ("What did I learn?"). */
export const ADOPTION: Slide[] = [
  {
    id: "part-6", act: 6, kind: "opener", title: "Adoption · how Legal gets the value", steps: 0, seconds: 12,
    quote: [
      "A concept for helping our colleagues adopt the solution and ensure they get the most value out of it",
      "Anything else you feel is relevant to understanding your approach to solving the challenge",
    ],
    notes: [
      "Building the tool is not enough. To create value, Legal has to trust it, know how to use it, and shape how it develops.",
    ],
    words: [{ word: "adoption", say: "uh-DOP-shun" }],
  },
  {
    id: "run-it", act: 6, kind: "content", title: "Adoption: co-design, pilot, scale.", steps: 2, seconds: 68, Body: Adoption,
    notes: [
      // the task: "Our legal colleagues currently leverage a variety of tools"
      `Adoption starts before rollout. I would co-design the pilot with ${FEW_LO} or ${FEW_HI} lawyers who do this work today. ` +
        "Together, we choose one high-value question, define a useful answer, and measure today's time and quality. " +
        "This makes it Legal's workflow, not another tool imposed on the team.",
      "For a few weeks, the new process runs alongside the current one. Training uses real scenarios: choose the scope, read the evidence, handle an uncertain result, and make the final decision. " +
        "The first users become champions; weekly feedback turns problems into improvements.",
      // the task: "create more with the same number of engineers"
      "We scale team by team only when the pilot improves quality or time. Legal owns the playbook and approves corrections; Engineering runs the service. " +
        "Corrections become regression tests. We track time per question, active use, review load and user feedback, so adoption and value improve together.",
    ],
    words: [{ word: "co-design", say: "koh-dee-ZINE" }, { word: "adoption", say: "uh-DOP-shun" }, { word: "baseline", say: "BASE-line" },
      { word: "regression", say: "ree-GRESH-un" }, { word: "champions", say: "CHAM-pee-unz" }],
  },
];
