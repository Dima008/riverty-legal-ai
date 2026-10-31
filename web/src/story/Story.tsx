// The presentation: one chapter at a time, a chapter rail grouped by act and coloured by
// Double Diamond phase, steps revealed with → like builds on a slide, keyboard navigation
// (← → and PageUp / PageDown, which presenter clickers send). The step is part of the address
// (#/story/task/1), so a reload during the talk lands on the same step.
import { Button } from "@fluentui/react-components";
import { ArrowLeft20Regular, ArrowRight20Regular, Keyboard20Regular, Play20Regular } from "@fluentui/react-icons";
import { useEffect, useRef } from "react";
import { navigate } from "../routing";
import { ACTS, CHAPTERS, TOTAL_MINUTES, type Chapter } from "./chapters";
import { BODIES } from "./chapters/index";
import "./story.css";

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

export function Story({ chapterId, step }: { chapterId: string; step: number }) {
  const index = Math.max(0, CHAPTERS.findIndex((c) => c.id === chapterId));
  const chapter = CHAPTERS[index];
  const prev: Chapter | undefined = CHAPTERS[index - 1];
  const next: Chapter | undefined = CHAPTERS[index + 1];
  const last = chapter.steps.length - 1;
  const current = step < 0 ? last : Math.min(step, last);      // -1 means "its last step"
  const page = useRef<HTMLElement>(null);
  const minutesBefore = CHAPTERS.slice(0, index).reduce((sum, c) => sum + c.minutes, 0);
  const Body = BODIES[chapter.id];

  // → reveals the next step, then opens the next chapter; ← goes back to the last step before
  const forward = () => current < last ? navigate(`/story/${chapter.id}/${current + 1}`)
    : next && navigate(`/story/${next.id}`);
  const back = () => current > 0 ? navigate(`/story/${chapter.id}/${current - 1}`)
    : prev && navigate(`/story/${prev.id}/last`);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || keysBelongToControl(e.target)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") forward();
      else if (e.key === "ArrowLeft" || e.key === "PageUp") back();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // A new chapter starts at the top, and screen readers announce it.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    page.current?.focus({ preventScroll: true });
  }, [index]);

  // A step revealed with → may sit below the fold: bring it into view.
  useEffect(() => {
    if (current === 0) return;
    page.current?.querySelectorAll(".story-body .reveal")[current]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [index, current]);

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
                      className={[`ph-${c.phase.toLowerCase()}`, i === index ? "on" : i < index ? "done" : ""].join(" ")}
                      aria-current={i === index ? "step" : undefined}
                      title={`Double Diamond: ${c.phase === "All" ? "all four phases" : c.phase}`}
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
          <Keyboard20Regular /> ← → step by step · PageUp / PageDown
        </div>
      </nav>

      <article className="story-page" ref={page} tabIndex={-1} aria-labelledby="chapter-title">
        <div className="story-head">
          <div className="eyebrow">
            {chapter.act} · Chapter {index + 1}
          </div>
          {chapter.steps.length > 1 && (
            <ol className="step-dots" aria-label="Steps of this chapter">
              {chapter.steps.map((name, i) => (
                <li key={name}>
                  <a href={`#/story/${chapter.id}/${i}`} className={i === current ? "on" : i < current ? "done" : undefined}
                     aria-current={i === current ? "step" : undefined} title={name}>
                    {name}
                  </a>
                </li>
              ))}
            </ol>
          )}
        </div>
        <h1 id="chapter-title" className="story-title">{chapter.title}</h1>
        <p className="story-lead">{chapter.lead}</p>
        <div className="story-body">
          {Body ? <Body step={current} />
            : <div className="story-draft">The content of this chapter is being built – the text is in docs/approach.md.</div>}
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
            <Button appearance="primary" icon={<ArrowRight20Regular />} iconPosition="after" onClick={() => navigate(`/story/${next.id}`)}>
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
