// Boxes and arrows from data: process lanes, pipelines, architecture maps. One small SVG
// component instead of a diagram library, so every figure is plain data that can be read and
// explained. Nodes sit on a grid (column, row); the colour says who acts - a person, plain code,
// a model, stored data or an outside system - because "deterministic first, model only for
// meaning" (decision 9) should be visible at a glance.
import { useId } from "react";

export type NodeKind = "person" | "code" | "model" | "data" | "external" | "gate";

export interface FlowNode {
  id: string;
  label: string;
  sub?: string;          // second line in smaller type
  col: number;           // 0-based grid column
  row: number;           // 0-based grid row (= lane when lanes are given)
  kind?: NodeKind;
  dashed?: boolean;      // planned / target only
  muted?: boolean;       // faded, e.g. what disappears in the to-be process
  highlight?: boolean;
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

export const KIND_LABEL: Record<NodeKind, string> = {
  person: "person decides",
  code: "deterministic code",
  model: "model call",
  data: "stored data",
  external: "outside system",
  gate: "gate / approval",
};

const CELL_W = 176;
const CELL_H = 92;
const NODE_W = 148;
const NODE_H = 56;
const LANE_LABEL_W = 116;

interface Props {
  nodes: FlowNode[];
  edges: FlowEdge[];
  lanes?: string[];            // swimlane titles, one per row
  ariaLabel: string;
  legend?: boolean;
}

export function Flow({ nodes, edges, lanes, ariaLabel, legend = true }: Props) {
  const arrow = `flow-arrow-${useId().replace(/:/g, "")}`;   // own marker per diagram on the page
  const cols = Math.max(...nodes.map((n) => n.col)) + 1;
  const rows = Math.max(lanes?.length ?? 0, ...nodes.map((n) => n.row + 1));
  const left = lanes ? LANE_LABEL_W : 0;
  const width = left + cols * CELL_W;
  const height = rows * CELL_H;
  const at = new Map(nodes.map((n) => [n.id, n]));
  const center = (n: FlowNode) => ({ x: left + n.col * CELL_W + CELL_W / 2, y: n.row * CELL_H + CELL_H / 2 });
  const kinds = [...new Set(nodes.map((n) => n.kind ?? "code"))];

  return (
    <div className="flow">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        <defs>
          <marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className="flow-arrowhead" />
          </marker>
        </defs>
        {lanes?.map((lane, i) => (
          <g key={lane}>
            <rect x={0} y={i * CELL_H} width={width} height={CELL_H} className={i % 2 ? "flow-lane alt" : "flow-lane"} />
            <text x={12} y={i * CELL_H + CELL_H / 2} className="flow-lane-label" dominantBaseline="middle">{lane}</text>
          </g>
        ))}
        {edges.map((e) => {
          const a = at.get(e.from);
          const b = at.get(e.to);
          if (!a || !b) return null;
          const p = center(a);
          const q = center(b);
          // leave the source on the side that faces the target, enter the target the same way
          const horizontal = a.row === b.row || Math.abs(q.x - p.x) > 1;
          const start = horizontal ? { x: p.x + Math.sign(q.x - p.x || 1) * NODE_W / 2, y: p.y }
                                   : { x: p.x, y: p.y + Math.sign(q.y - p.y) * NODE_H / 2 };
          const end = horizontal ? { x: q.x - Math.sign(q.x - p.x || 1) * NODE_W / 2, y: q.y }
                                 : { x: q.x, y: q.y - Math.sign(q.y - p.y) * NODE_H / 2 };
          const mid = horizontal ? (start.x + end.x) / 2 : (start.y + end.y) / 2;
          const d = horizontal
            ? `M${start.x} ${start.y} C${mid} ${start.y}, ${mid} ${end.y}, ${end.x} ${end.y}`
            : `M${start.x} ${start.y} C${start.x} ${mid}, ${end.x} ${mid}, ${end.x} ${end.y}`;
          return (
            <g key={`${e.from}-${e.to}`}>
              <path d={d} className={e.dashed ? "flow-edge dashed" : "flow-edge"} markerEnd={`url(#${arrow})`} />
              {e.label && (
                <text x={(start.x + end.x) / 2} y={(start.y + end.y) / 2 - 6} className="flow-edge-label" textAnchor="middle">
                  {e.label}
                </text>
              )}
            </g>
          );
        })}
        {nodes.map((n) => {
          const c = center(n);
          const cls = ["flow-node", `k-${n.kind ?? "code"}`, n.dashed && "dashed", n.muted && "muted", n.highlight && "hl"]
            .filter(Boolean).join(" ");
          return (
            <g key={n.id} className={cls}>
              <rect x={c.x - NODE_W / 2} y={c.y - NODE_H / 2} width={NODE_W} height={NODE_H} rx={10} />
              <text x={c.x} y={n.sub ? c.y - 7 : c.y} textAnchor="middle" dominantBaseline="middle" className="flow-label">{n.label}</text>
              {n.sub && <text x={c.x} y={c.y + 12} textAnchor="middle" dominantBaseline="middle" className="flow-sub">{n.sub}</text>}
            </g>
          );
        })}
      </svg>
      {legend && (
        <ul className="flow-legend">
          {kinds.map((k) => (
            <li key={k}><span className={`flow-swatch k-${k}`} aria-hidden /> {KIND_LABEL[k]}</li>
          ))}
          {nodes.some((n) => n.dashed) && <li><span className="flow-swatch dashed" aria-hidden /> target only</li>}
        </ul>
      )}
    </div>
  );
}
