// Chapter 7 - From laptop to Azure. One architecture map in the pipeline's left-to-right order,
// in three views: the Azure target, the prototype that runs today, and the boundaries of the
// target. The boxes swap their labels; the arrows never move - that is the adapter claim. The
// map is a small SVG of its own rather than Flow, because its boxes are clickable, carry three
// lines of text and sit inside zones. What it shows is data in ./architecture/map.ts.
import { ToggleButton } from "@fluentui/react-components";
import { Dismiss16Regular } from "@fluentui/react-icons";
import { useEffect, useState, type KeyboardEvent } from "react";
import { api } from "../../api";
import { Figure, Step, type FigureMeta } from "../Figure";
import {
  BOUNDARY_RULES, BOXES, EDGES, KIND_TEXT, ZONES, type Box, type Card, type Edge, type Mode, type Row, type Zone,
} from "./architecture/map";
import type { ChapterProps } from "./index";
import "./architecture.css";

export const FIGURES: FigureMeta[] = [
  { id: "architecture-map", title: "One map: the Azure target and the prototype",
    shows: "The solution as containers in the pipeline's left-to-right order. The toggle swaps every box between its Azure service and the local stand-in that runs today; the arrows stay where they are. Solid = runs today, dashed = target only. Each box opens a service card: Azure service, stand-in, adapter file in the repository, decision, what changes for production.",
    why: "It answers 'how would you implement it' and shows that the prototype is not throwaway: every stand-in sits behind the interface its Azure service will use (decisions 7, 11, 12, 35, 36).",
    looks: "One map with two labellings instead of two diagrams: when the boxes change and the arrows do not, the adapter claim is visible instead of asserted. The role line in each box stays, only the technology changes. Dashed versus solid keeps the unbuilt from looking built (decision 55).",
    refs: "decisions 2, 7, 10, 11, 12, 26, 28, 34, 35, 36, 54, 55, 56, 63" },
  { id: "architecture-boundaries", title: "Boundaries: which way data may flow",
    shows: "The same map with the zones of the target – Riverty's Microsoft 365 tenant, an EU subscription, the model endpoint in the EU data zone and the contract storage. Arrows are one-way and labelled read, write or after approval; exactly one arrow goes into the storage and none comes out.",
    why: "Security, data protection and compliance at a company with a banking licence ask about boundaries first. The direction of the arrows is the security property (decisions 2, 11, 41); the EU data zone is decided (26).",
    looks: "Zones drawn over the map the audience already knows, not a second network diagram. Only arrows that cross a boundary or touch stored data carry a label. The storage arrow is the only red one, and labelled, because it is the only action with an effect outside the system.",
    refs: "decisions 2, 11, 26, 34, 41, 57, 71" },
];

// ---- geometry of the map, in SVG units (the SVG scales to the width of the page)
const COL_W = 190;          // one grid column
const BOX_W = 150;
const BOX_H = 62;
// centre line of each row; the gap between rows a and b1 leaves room for the labels of the
// arrows that cross from the Microsoft 365 tenant into the subscription
const ROW_Y: Record<Row, number> = { a: 62, b1: 192, b2: 280, c: 392 };
const ZONE_HEAD = 22;       // room above a zone's first row for its label
const ZONE_PAD = 9;         // room below a zone's last row
const W = 5 * COL_W;
const H = 440;

const colX = (col: number) => col * COL_W + COL_W / 2;

const MODE_LABEL: Record<Mode, string> = {
  target: "Target (Azure)",
  prototype: "Prototype (today)",
  boundaries: "Boundaries",
};

function boxById(id: string): Box {
  const box = BOXES.find((b) => b.id === id);
  if (!box) throw new Error(`map.ts: no box "${id}"`);
  return box;
}

/** What a box says in a view: the stand-in in the prototype, the Azure service otherwise. */
const labelsOf = (box: Box, mode: Mode) => (mode === "prototype" ? box.prototype : box.target);

// ---- live facts from the running prototype

interface Facts {
  promptVersion: string;
  documents: number;
  models: string[];
  costUsd: number;      // all model calls that built the register
}

/** GET /health and GET /summary. Missing API or register: no facts, and the page says so. */
function useFacts(): { facts: Facts | null; offline: boolean } {
  const [facts, setFacts] = useState<Facts | null>(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    // api.ts has no client for /summary, so it is fetched directly
    const summary = fetch("/api/summary").then((r) => {
      if (!r.ok) throw new Error(`GET /summary: ${r.status}`);
      return r.json() as Promise<{ documents: number; models: string[]; cost: { cost_usd: number } }>;
    });
    Promise.all([api.health(), summary])
      .then(([health, s]) => {
        if (!health.register) throw new Error("no register");
        setFacts({ promptVersion: health.prompt_version, documents: s.documents, models: s.models, costUsd: s.cost.cost_usd });
      })
      .catch(() => setOffline(true));
  }, []);
  return { facts, offline };
}

// ---- the map

/** The map in one view. Exported so a print view can show all three views. */
export function ArchitectureMap({ mode, selected = null, onSelect }: {
  mode: Mode;
  selected?: string | null;
  onSelect?: (id: string) => void;
}) {
  const boundaries = mode === "boundaries";
  const label = `${MODE_LABEL[mode]} view of the architecture map: `
    + BOXES.map((b) => `${b.role} – ${labelsOf(b, mode)[0]}`).join(", ") + ".";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`ar-map m-${mode}`} role="group" aria-label={label}>
      <defs>
        <marker id="ar-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" className="flow-arrowhead" />
        </marker>
        {/* the marker scales with the line, so the thicker gate line gets a smaller factor */}
        <marker id="ar-arrow-gate" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" className="ar-arrowhead-gate" />
        </marker>
      </defs>
      {boundaries ? ZONES.map((z) => <ZoneView key={z.id} zone={z} />) : <PhaseCaptions />}
      {EDGES.map((e) => <Arrow key={`${e.from}-${e.to}`} edge={e} boundaries={boundaries} />)}
      {BOXES.map((b) => (
        <BoxView key={b.id} box={b} mode={mode} selected={selected === b.id} onSelect={onSelect} />
      ))}
    </svg>
  );
}

/** Target and prototype views: the two phases of the pipeline map in chapter 5, same order. */
function PhaseCaptions() {
  return (
    <g className="ar-phase" aria-hidden>
      <text x={colX(1)} y={24} textAnchor="middle">COMPILE ONCE</text>
      <text x={(colX(3) + colX(4)) / 2} y={24} textAnchor="middle">ASK MANY TIMES</text>
    </g>
  );
}

/** Boundary view: a zone is a rectangle around whole columns and rows of the grid. */
function ZoneView({ zone }: { zone: Zone }) {
  const x = zone.cols[0] * COL_W + 6;
  const width = (zone.cols[1] - zone.cols[0] + 1) * COL_W - 12;
  const y = ROW_Y[zone.rows[0]] - BOX_H / 2 - ZONE_HEAD;
  const bottom = ROW_Y[zone.rows[zone.rows.length - 1]] + BOX_H / 2 + ZONE_PAD;
  return (
    <g className={`ar-zone z-${zone.id}`}>
      <rect x={x} y={y} width={width} height={bottom - y} rx={12} />
      <text x={(zone.labelCol ?? zone.cols[0]) * COL_W + 16} y={y + 15}>{zone.label.toUpperCase()}</text>
    </g>
  );
}

/** A straight arrow from box edge to box edge. Every arrow points right or down (map.ts). */
function Arrow({ edge, boundaries }: { edge: Edge; boundaries: boolean }) {
  const a = boxById(edge.from);
  const b = boxById(edge.to);
  const vertical = a.col === b.col;
  const x1 = vertical ? colX(a.col) : colX(a.col) + BOX_W / 2;
  const y1 = vertical ? ROW_Y[a.row] + BOX_H / 2 : ROW_Y[a.row];
  const x2 = vertical ? colX(b.col) : colX(b.col) - BOX_W / 2;
  const y2 = vertical ? ROW_Y[b.row] - BOX_H / 2 : ROW_Y[b.row];
  const gate = boundaries && edge.gate;
  const lines = boundaries ? edge.label ?? [] : [];
  // a vertical arrow carries its label beside it, a horizontal one above it
  const left = edge.side === "left";
  const lx = vertical ? x1 + (left ? -8 : 8) : (x1 + x2) / 2;
  const ly = vertical ? (y1 + y2) / 2 - (lines.length - 1) * 6 : y1 - 7;   // lines are 12 apart
  return (
    <g className={gate ? "ar-edge gate" : "ar-edge"}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} className="flow-edge"
            markerEnd={gate ? "url(#ar-arrow-gate)" : "url(#ar-arrow)"} />
      {lines.length > 0 && (
        <text x={lx} y={ly} textAnchor={vertical ? (left ? "end" : "start") : "middle"} className="ar-edge-label">
          {lines.map((line, i) => <tspan key={line} x={lx} dy={i === 0 ? 0 : 12}>{line}</tspan>)}
        </text>
      )}
    </g>
  );
}

/** One box: role (stays), name and detail (swap with the view). A box with a card is a button. */
function BoxView({ box, mode, selected, onSelect }: {
  box: Box;
  mode: Mode;
  selected: boolean;
  onSelect?: (id: string) => void;
}) {
  const [name, detail] = labelsOf(box, mode);
  // solid = runs today, dashed = target only; the people are there in every view
  const planned = mode !== "prototype" && box.kind !== "person";
  const open = box.card && onSelect ? () => onSelect(box.id) : undefined;
  const onKey = (e: KeyboardEvent<SVGGElement>) => {
    if (open && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      open();
    }
  };
  const x = colX(box.col);
  const y = ROW_Y[box.row];
  const cls = ["flow-node", `k-${box.kind}`, "ar-box", planned && "dashed", open && "clickable", selected && "on"]
    .filter(Boolean).join(" ");
  return (
    <g className={cls} onClick={open} onKeyDown={open ? onKey : undefined}
       role={open ? "button" : "img"} tabIndex={open ? 0 : undefined} aria-pressed={open ? selected : undefined}
       aria-label={`${box.role}: ${name}, ${detail} – ${planned ? "target only" : "runs today"}`}>
      <rect x={x - BOX_W / 2} y={y - BOX_H / 2} width={BOX_W} height={BOX_H} rx={10} />
      {/* new key per view: the text fades in again, so the audience sees what swapped */}
      <g key={mode} className="ar-box-text" aria-hidden>
        <text x={x} y={y - 14} textAnchor="middle" className="ar-role">{box.role.toUpperCase()}</text>
        <text x={x} y={y + 4} textAnchor="middle" className="ar-name">{name}</text>
        <text x={x} y={y + 20} textAnchor="middle" className="ar-detail">{detail}</text>
      </g>
    </g>
  );
}

// ---- around the map

function Legend({ boundaries }: { boundaries: boolean }) {
  const kinds = [...new Set(BOXES.map((b) => b.kind))];
  return (
    <ul className="flow-legend ar-legend">
      {kinds.map((k) => <li key={k}><span className={`flow-swatch k-${k}`} aria-hidden /> {KIND_TEXT[k]}</li>)}
      <li><span className="flow-swatch" aria-hidden /> solid: runs today</li>
      <li><span className="flow-swatch dashed" aria-hidden /> dashed: target only</li>
      {boundaries && <li><span className="ar-swatch-gate" aria-hidden /> red arrow: the only effect outside the system</li>}
    </ul>
  );
}

/** One line next to the toggle: what the current view means; in the prototype view, live. */
function ModeNote({ mode, facts, offline }: { mode: Mode; facts: Facts | null; offline: boolean }) {
  if (mode === "target") return <span className="ar-note">Planned on Azure – none of it is deployed yet, so every service is dashed.</span>;
  if (mode === "boundaries") return <span className="ar-note">The target's boundaries: arrows show which way data may flow.</span>;
  if (offline) return <span className="ar-live off"><span className="ar-dot" aria-hidden /> No live register – the labels come from the repository</span>;
  if (!facts) return <span className="ar-live"><span className="ar-dot" aria-hidden /> Checking the running prototype …</span>;
  return (
    <span className="ar-live">
      <span className="ar-dot" aria-hidden /> Running now: register {facts.promptVersion} · {facts.documents} documents · {facts.models.join(", ")}
    </span>
  );
}

function ServiceCard({ box, card, onClose }: { box: Box; card: Card; onClose: () => void }) {
  return (
    <section className="ar-card" aria-label={`Service card: ${box.role}`}>
      <header>
        <span className="ar-card-role">{box.role}</span>
        <button type="button" className="ar-card-close" aria-label="Close the service card" onClick={onClose}>
          <Dismiss16Regular />
        </button>
      </header>
      <dl>
        <dt>Azure target</dt><dd>{card.target}</dd>
        <dt>Prototype today</dt><dd>{card.prototype}</dd>
        <dt>Adapter in the repo</dt><dd>{card.files.map((f) => <code key={f}>{f}</code>)}</dd>
        <dt>For production</dt><dd>{card.production}</dd>
        <dt>Decisions</dt><dd>{card.decisions}</dd>
      </dl>
    </section>
  );
}

/** The cost line: per contract measured from the register, per question by design. */
function CostLine({ facts }: { facts: Facts | null }) {
  if (!facts) {
    return <p className="ar-note">Cost per contract comes live from GET /summary – not reachable right now. A question costs $0: it is a register query, no model call.</p>;
  }
  const perContract = facts.costUsd / facts.documents;
  return (
    <div className="ar-cost">
      <div>
        <b>${perContract.toFixed(4)}</b>
        <span>per contract, once – ${facts.costUsd.toFixed(4)} for the {facts.documents} documents of this register, measured</span>
      </div>
      <div>
        <b>$0</b>
        <span>per question – a question is a register query, no model call</span>
      </div>
      <div>
        {/* 1,100 contracts: Riverty's addendum (100+ vendors, 1,000+ merchants), as in chapter 1 */}
        <b>≈ ${Math.round(perContract * 1100)}</b>
        <span>for 1,100 contracts; again only after a prompt, playbook or model change</span>
      </div>
    </div>
  );
}

// ---- the chapter

export function Architecture({ step }: ChapterProps) {
  // every step opens the map in its own view; the toggle can still switch freely
  const [mode, setMode] = useState<Mode>(step >= 1 ? "boundaries" : "target");
  const [selected, setSelected] = useState<string | null>(null);
  const { facts, offline } = useFacts();
  useEffect(() => setMode(step >= 1 ? "boundaries" : "target"), [step]);

  const modes: Mode[] = step >= 1 ? ["target", "prototype", "boundaries"] : ["target", "prototype"];
  const box = selected ? boxById(selected) : null;
  // the storage sentence is counted from the same arrows the map draws
  const into = EDGES.filter((e) => e.to === "storage").length;
  const out = EDGES.filter((e) => e.from === "storage").length;

  return (
    <div className="ch-architecture">
      <Step at={0} step={step}>
        <Figure meta={mode === "boundaries" ? FIGURES[1] : FIGURES[0]}>
          <div className="ar-toolbar">
            <div className="ar-modes" role="group" aria-label="View of the map">
              {modes.map((m) => (
                <ToggleButton key={m} size="small" checked={mode === m} appearance={mode === m ? "primary" : "subtle"}
                              onClick={() => setMode(m)}>
                  {MODE_LABEL[m]}
                </ToggleButton>
              ))}
            </div>
            <ModeNote mode={mode} facts={facts} offline={offline} />
          </div>
          <div className="ar-scroll">
            <ArchitectureMap mode={mode} selected={selected} onSelect={(id) => setSelected(id === selected ? null : id)} />
          </div>
          <Legend boundaries={mode === "boundaries"} />
          {!box && <p className="ar-hint">Select a box for its service card: Azure service, stand-in, adapter file, decision.</p>}
          {/* rules and card share the width only when both are there */}
          <div className={box ? "ar-below with-card" : "ar-below"}>
            {mode === "boundaries" && (
              <ul className="ar-rules">
                <li>
                  <b>{into === 1 ? "Exactly one arrow" : `${into} arrows`} into the contract storage, {out === 0 ? "none" : out} out of it</b>
                  {" "}– write only, after approval, once per SHA-256. <span className="ar-ref">decisions 2, 57</span>
                </li>
                {BOUNDARY_RULES.map((r) => (
                  <li key={r.refs}>{r.text} <span className="ar-ref">decision {r.refs}</span></li>
                ))}
              </ul>
            )}
            <div aria-live="polite">
              {box?.card && <ServiceCard box={box} card={box.card} onClose={() => setSelected(null)} />}
            </div>
          </div>
        </Figure>
      </Step>

      <Step at={1} step={step}>
        <CostLine facts={facts} />
        <p className="anchor-line">Buy the Azure building blocks; build where Riverty's rules, the evidence and the storage boundary matter.</p>
      </Step>
    </div>
  );
}
