// Act 5 - running it at Riverty: the Azure target next to the prototype (bought building blocks,
// built what is Riverty's), how a contract saved in SharePoint reaches the register, and how it is
// run: a release gate for every change, then adoption with one team and one question. Facts about
// Microsoft services are the ones verified against Microsoft Learn (decisions 79 and 80).
import { Build } from "../Build";
import type { Slide } from "../types";
import "./acts.css";

// target vs prototype, per role (web/src/story/chapters/architecture/map.ts, decisions 35, 79, 80)
const ROLES = [
  { role: "Contracts", proto: "data/inbox folder", target: "SharePoint, via Microsoft Graph" },
  { role: "Read scans", proto: "Tesseract", target: "Content Understanding" },
  { role: "Read and check", proto: "gpt-4.1-mini", target: "Azure OpenAI in Foundry, EU data zone" },
  { role: "Register", proto: "SQLite", target: "PostgreSQL" },
  { role: "Search", proto: "SQLite keywords + vectors", target: "Azure AI Search" },
  { role: "Hidden instructions", proto: "6 patterns", target: "+ Prompt Shields" },
  { role: "Who may decide", proto: "two simulated reviewers", target: "Entra ID roles" },
  { role: "Runs", proto: "on the laptop", target: "Container Apps" },
];

function Azure() {
  return (
    <div className="x-az">
      <div className="x-az-list">
        <div className="x-az-head"><span>Job</span><span>Prototype today</span><span>On Azure</span></div>
        {ROLES.map((r) => (
          <div key={r.role} className="x-az-row"><span className="role">{r.role}</span><span className="proto">{r.proto}</span><span className="target">{r.target}</span></div>
        ))}
      </div>
      <div className="x-buy">
        <Build at={1} className="x-buy-box">
          <h3>Bought</h3>
          <p>The building blocks: reading scans, search, models, identity – Azure services.</p>
        </Build>
        <Build at={1} className="x-buy-box built">
          <h3>Built</h3>
          <p>What is Riverty's: the playbook, the evidence trail, the storage boundary.</p>
        </Build>
        <Build at={2} className="x-key">
          The innovation is not the framework. It is the architecture: <em>a small, structured world for the AI</em>,
          every finding with evidence – the framework stays replaceable.
        </Build>
        <Build at={2} className="x-step-proof">
          Planned, not built: tools as MCP servers, an agent framework, a CI pipeline, tracing.
        </Build>
      </div>
    </div>
  );
}

// Verified facts (scratchpad ms_design.json "sharepoint", decision 79): a subscription on a library
// only says "something changed" (changeType "updated", no file); the delta query says what; lifetime
// 42,300 minutes; Microsoft: notifications usually under a minute, at most six hours, and lost ones
// cannot be recovered - hence the scheduled delta run and the count check.
function SharePoint() {
  return (
    <div>
      <div className="x-sp">
        <div className="x-st code"><span className="x-st-kind">person</span><span className="x-st-name">Saved</span><span className="x-st-fact">a lawyer saves a contract in the SharePoint library</span></div>
        <span className="x-sp-arrow">→</span>
        <Build at={1} className="x-st code"><span className="x-st-kind">Microsoft Graph</span><span className="x-st-name">“Something changed”</span><span className="x-st-fact">a subscription wakes us up – it never says which file</span></Build>
        <span className="x-sp-arrow">→</span>
        <Build at={1} className="x-st code"><span className="x-st-kind">our service</span><span className="x-st-name">“What changed?”</span><span className="x-st-fact">the delta query lists new, changed and deleted files</span></Build>
        <span className="x-sp-arrow">→</span>
        <Build at={2} className="x-st store"><span className="x-st-kind">pipeline</span><span className="x-st-name">In the register</span><span className="x-st-fact">download, hash, read and check – about 7 s for M18</span></Build>
      </div>
      <Build at={3} className="x-sp-net">
        <div className="x-fact">Usually <b>under a minute</b>, at most <b>six hours</b> – Microsoft's numbers for the message.</div>
        <div className="x-fact">Messages can get lost: a <b>scheduled delta run</b> and a count check catch every file.</div>
        <div className="x-fact">Read rights on <b>one library</b> only · the subscription is renewed before 30 days.</div>
      </Build>
    </div>
  );
}

function RunIt() {
  return (
    <div className="x-ra">
      <div>
        <h3>Every change is a release</h3>
        <ol className="x-ol">
          <li>A new model, prompt or playbook version</li>
          <li>The 8 test questions must stay at 100 % found</li>
          <li>Only then it goes live – watched: cost, speed, how often lawyers overrule a finding</li>
        </ol>
      </div>
      <Build at={1}>
        <h3>Adoption: one team, one question</h3>
        <ol className="x-ol">
          <li>Measure today: minutes per contract, with Legal</li>
          <li>One question, next to the old way, for a few weeks</li>
          <li>Count review load and overrides</li>
          <li>Then the next question</li>
        </ol>
      </Build>
    </div>
  );
}

export const ACT5: Slide[] = [
  {
    id: "act-5", act: 5, kind: "opener", title: "Running it at Riverty", steps: 0, seconds: 4,
    notes: ["How would this run at Riverty?"],
  },
  {
    id: "azure", act: 5, kind: "content", title: "On Azure: buy the building blocks, build what is Riverty's.", steps: 2, seconds: 40, Body: Azure,
    notes: [
      "The prototype runs on my laptop. Every part has its Azure service: SharePoint, Content Understanding, Azure OpenAI, AI Search, Entra ID.",
      "We buy the building blocks. We build only what is Riverty's: the playbook, the evidence, the storage boundary.",
      "The innovation is not the framework. It is a small, structured world for the AI, with evidence for every finding. Some parts are still only planned, and I say so.",
    ],
    words: [{ word: "Azure", say: "AZH-er" }, { word: "Entra", say: "EN-truh" }, { word: "framework", say: "FRAYM-wurk" }],
  },
  {
    id: "sharepoint", act: 5, kind: "content", title: "Saved in SharePoint – how does it reach the register?", steps: 3, seconds: 40, Body: SharePoint,
    notes: [
      "A lawyer saves a contract in SharePoint.",
      "Microsoft Graph sends us a short message: something changed. It never says which file. So we ask: what changed? That is the delta query.",
      "Then the pipeline reads it. For M18 that took about seven seconds.",
      "Messages usually arrive within a minute, at most six hours. They can get lost, so a scheduled run checks everything again.",
    ],
    words: [{ word: "Graph", say: "GRAF" }, { word: "delta", say: "DEL-tuh" }, { word: "scheduled", say: "SHED-yoold" }],
  },
  {
    id: "run-it", act: 5, kind: "content", title: "A release gate for every change, then one team and one question.", steps: 1, seconds: 35, Body: RunIt,
    notes: [
      "A new model or prompt is a release, not a setting. It goes live only if all eight test questions still find everything. Then we watch cost, speed and how often lawyers overrule.",
      "Adoption starts small. We measure the minutes per contract today, run one question next to the old way, count the reviews. Then the next question.",
    ],
    words: [{ word: "release", say: "rih-LEESS" }, { word: "overrule", say: "oh-ver-ROOL" }, { word: "adoption", say: "uh-DOP-shun" }],
  },
];
