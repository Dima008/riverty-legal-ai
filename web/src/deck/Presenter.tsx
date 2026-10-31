// The presenter view (P in the talk), made for reading aloud: the speaker notes are the largest
// thing on the screen, one paragraph per build, the current one bright and kept in view; beside
// them the current card, the next one, pronunciation help and the clock against the plan. It
// drives the audience window and follows it (BroadcastChannel).
import { useEffect, useRef, useState } from "react";
import { useDeckKeys, useDeckNav, useDeckSync } from "./nav";
import { SlideView } from "./SlideView";
import { mmss, SLIDES, TOTAL_SECONDS } from "./slides";
import "./deck.css";

const SIZES = { min: 18, max: 40, start: 26, step: 2 };

/** The chosen note size survives a reload; storage may be blocked, then it is just not kept. */
function savedSize(): number {
  try {
    const n = Number(localStorage.getItem("notes-size"));
    return n >= SIZES.min && n <= SIZES.max ? n : SIZES.start;
  } catch {
    return SIZES.start;
  }
}

export function Presenter({ slideId, step }: { slideId: string; step: number }) {
  const { index, slide, current, forward, back } = useDeckNav("presenter", slideId, step);
  useDeckSync("presenter", slide.id, current);
  const [started, setStarted] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [size, setSize] = useState(savedSize);
  const notes = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  // keep the paragraph for the current build in view
  useEffect(() => {
    notes.current?.querySelector(".now")?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [slide.id, current]);

  const resize = (delta: number) => setSize((s) => {
    const next = Math.min(SIZES.max, Math.max(SIZES.min, s + delta));
    try {
      localStorage.setItem("notes-size", String(next));
    } catch {
      // not kept - the view works without it
    }
    return next;
  });
  useDeckKeys({ ArrowRight: forward, PageDown: forward, " ": forward, ArrowLeft: back, PageUp: back,
                r: () => setStarted(Date.now()), "+": () => resize(SIZES.step), "-": () => resize(-SIZES.step) });

  const next = current < slide.steps ? { slide, step: current + 1 }
    : SLIDES[index + 1] ? { slide: SLIDES[index + 1], step: 0 } : null;
  const plannedHere = SLIDES.slice(0, index).reduce((sum, s) => sum + s.seconds, 0);
  const elapsed = Math.floor((now - started) / 1000);
  const behind = elapsed - plannedHere;

  return (
    <div className="presenter">
      <header className="pv-head">
        <span className="pv-clock">{mmss(elapsed)}</span>
        <span className={`pv-plan${behind > 30 ? " late" : ""}`}>
          plan here {mmss(plannedHere)} of {mmss(TOTAL_SECONDS)} · {behind >= 0 ? `${mmss(behind)} behind` : `${mmss(-behind)} ahead`}
        </span>
        <span className="pv-pos">card {index + 1} / {SLIDES.length} · build {current} / {slide.steps} · {slide.seconds} s</span>
        <span className="pv-size" role="group" aria-label="Text size">
          <button type="button" onClick={() => resize(-SIZES.step)} aria-label="Smaller text (−)">A−</button>
          <button type="button" onClick={() => resize(SIZES.step)} aria-label="Larger text (+)">A+</button>
        </span>
        <button type="button" onClick={() => setStarted(Date.now())}>Restart clock (R)</button>
      </header>

      <div className="pv-body">
        <section className="pv-notes" ref={notes} aria-label="Speaker notes" style={{ fontSize: size }}>
          <div className="pv-card-title">{slide.title}</div>
          {slide.notes.map((text, i) => (
            <p key={i} className={i === current ? "now" : i < current ? "done" : undefined}>
              <span className="pv-mark" aria-hidden>{i === 0 ? "▶" : `→ ${i}`}</span>
              {text}
            </p>
          ))}
        </section>

        <aside className="pv-side">
          <div className="pv-label">On screen</div>
          <div className="pv-current"><SlideView slide={slide} step={current} /></div>
          {slide.words && slide.words.length > 0 && (
            <div className="pv-words">
              <div className="pv-label">Say it like this</div>
              {slide.words.map((w) => (
                <div key={w.word}><b>{w.word}</b> <span>{w.say}</span></div>
              ))}
            </div>
          )}
          <div className="pv-label">Next</div>
          {next ? <div className="pv-next"><SlideView slide={next.slide} step={next.step} /></div> : <div className="pv-end">End of the talk</div>}
          <div className="pv-buttons">
            <button type="button" onClick={back}>← Back</button>
            <button type="button" onClick={forward}>Next →</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
