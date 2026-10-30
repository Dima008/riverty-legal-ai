// The presentation: one chapter at a time, a chapter rail grouped by act, next / back buttons and
// keyboard navigation (← → and PageUp / PageDown, which presenter clickers send).
// Chapter bodies follow once the storyline is approved; the Legal Workbench is the last stop.
import { Button } from "@fluentui/react-components";
import {
  ArrowLeft20Regular,
  ArrowRight20Regular,
  History20Regular,
  Keyboard20Regular,
  Play20Regular,
  Table20Regular,
} from "@fluentui/react-icons";
import { useEffect, useRef, type ReactNode } from "react";
import { navigate } from "../routing";
import { CHAPTERS, TOTAL_MINUTES, type Chapter } from "./chapters";
import { WhatIf } from "./WhatIf";

const ACTS: Chapter["act"][] = ["Why", "How", "Proof", "Live"];

/** 1.25 minutes -> "1:15" (speaking time as on a stopwatch). */
const mmss = (minutes: number) =>
  `${Math.floor(minutes)}:${String(Math.round((minutes % 1) * 60)).padStart(2, "0")}`;

/** Arrow keys only turn the page when nobody is typing or using a control that needs them. */
function keysBelongToControl(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return true;
  return el.closest("[role=tablist], [role=listbox], [role=combobox], [role=slider], [role=menu]") !== null;
}

export function Story({ chapterId }: { chapterId: string }) {
  const index = Math.max(0, CHAPTERS.findIndex((c) => c.id === chapterId));
  const chapter = CHAPTERS[index];
  const prev: Chapter | undefined = CHAPTERS[index - 1];
  const next: Chapter | undefined = CHAPTERS[index + 1];
  const page = useRef<HTMLElement>(null);
  const minutesBefore = CHAPTERS.slice(0, index).reduce((sum, c) => sum + c.minutes, 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || keysBelongToControl(e.target)) return;
      const target =
        e.key === "ArrowRight" || e.key === "PageDown" ? next
        : e.key === "ArrowLeft" || e.key === "PageUp" ? prev
        : undefined;
      if (!target) return;
      e.preventDefault();
      navigate(`/story/${target.id}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  // A new chapter starts at the top, and screen readers announce it.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    page.current?.focus({ preventScroll: true });
  }, [index]);

  return (
    <div className="story">
      <nav className="story-rail" aria-label="Chapters">
        <div className="rail-progress" aria-hidden>
          <div style={{ width: `${((index + 1) / CHAPTERS.length) * 100}%` }} />
        </div>
        <div className="rail-meta">
          Chapter {index + 1} of {CHAPTERS.length} · {mmss(minutesBefore)} of {mmss(TOTAL_MINUTES)} min
        </div>
        {ACTS.map((act) => (
          <div key={act} className="rail-act">
            <div className="rail-act-title">{act}</div>
            <ol>
              {CHAPTERS.map((c, i) =>
                c.act !== act ? null : (
                  <li key={c.id}>
                    <a
                      href={`#/story/${c.id}`}
                      className={i === index ? "on" : i < index ? "done" : undefined}
                      aria-current={i === index ? "step" : undefined}
                    >
                      <span className="rail-num">{i + 1}</span>
                      <span>{c.title}</span>
                      <span className="rail-min">{mmss(c.minutes)}</span>
                    </a>
                  </li>
                ),
              )}
            </ol>
          </div>
        ))}
        <div className="rail-keys">
          <Keyboard20Regular /> ← → or PageUp / PageDown
        </div>
      </nav>

      <article className="story-page" ref={page} tabIndex={-1} aria-labelledby="chapter-title">
        <div className="eyebrow">
          {chapter.act} · Chapter {index + 1}
        </div>
        <h1 id="chapter-title" className="story-title">{chapter.title}</h1>
        <p className="story-lead">{chapter.lead}</p>
        <div className="story-body">
          <ChapterBody chapter={chapter} />
        </div>
        <footer className="story-nav">
          {prev ? (
            <Button appearance="subtle" icon={<ArrowLeft20Regular />} onClick={() => navigate(`/story/${prev.id}`)}>
              {prev.title}
            </Button>
          ) : (
            <span />
          )}
          {next ? (
            <Button
              appearance="primary"
              icon={<ArrowRight20Regular />}
              iconPosition="after"
              onClick={() => navigate(`/story/${next.id}`)}
            >
              {next.title}
            </Button>
          ) : (
            <Button appearance="primary" icon={<Play20Regular />} onClick={() => navigate("/tool/workbench")}>
              Open the Legal Workbench
            </Button>
          )}
        </footer>
      </article>
    </div>
  );
}

function ChapterBody({ chapter }: { chapter: Chapter }) {
  if (chapter.id === "live") return <ToolLaunch />;
  if (chapter.id === "proof") return <WhatIf />;
  return <div className="story-draft">The content of this chapter follows once the storyline is approved.</div>;
}

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
    text: "Every contract against Legal's playbook – the compiled register at a glance.",
  },
  {
    area: "audit",
    icon: <History20Regular />,
    title: "Audit log",
    text: "Every run, review and archive copy: who did what, when and why.",
  },
];

function ToolLaunch() {
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
