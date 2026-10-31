// Chapter 9 - The Legal Workbench, live: the doorway from the story into the tool.
import { History20Regular, Play20Regular, Table20Regular } from "@fluentui/react-icons";
import type { ReactNode } from "react";
import type { ChapterProps } from "./index";

const TOOL_STOPS: { area: string; icon: ReactNode; title: string; text: string }[] = [
  {
    area: "workbench",
    icon: <Play20Regular />,
    title: "Ask a question",
    text: "From a question to a plan, results with evidence on the page, review and an approved archive copy.",
  },
  {
    area: "register",
    icon: <Table20Regular />,
    title: "Contract register",
    text: "Every contract against Legal's playbook – the compiled register at a glance, reviewed per finding.",
  },
  {
    area: "audit",
    icon: <History20Regular />,
    title: "Audit log",
    text: "Every run, review and archive copy: who did what, when and why.",
  },
];

export function Live(_: ChapterProps) {
  return (
    <div className="launch-grid">
      {TOOL_STOPS.map((s) => (
        <a key={s.area} className="launch-card" href={`#/tool/${s.area}`}>
          <span className="launch-icon" aria-hidden>{s.icon}</span>
          <h3>{s.title}</h3>
          <p>{s.text}</p>
        </a>
      ))}
    </div>
  );
}
