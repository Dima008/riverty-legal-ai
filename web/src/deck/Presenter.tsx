// The presenter view (P in the talk): the current screen, what → shows next, the speaker notes and
// the clock against the plan. It drives the audience window and follows it (BroadcastChannel).
import { useEffect, useState } from "react";
import { useDeckKeys, useDeckNav, useDeckSync } from "./nav";
import { SlideView } from "./SlideView";
import { mmss, SLIDES, TOTAL_SECONDS } from "./slides";
import "./deck.css";

export function Presenter({ slideId, step }: { slideId: string; step: number }) {
  const { index, slide, current, forward, back } = useDeckNav("presenter", slideId, step);
  useDeckSync("presenter", slide.id, current);
  const [started, setStarted] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useDeckKeys({ ArrowRight: forward, PageDown: forward, " ": forward, ArrowLeft: back, PageUp: back,
                r: () => setStarted(Date.now()) });

  const next = current < slide.steps ? { slide, step: current + 1 }
    : SLIDES[index + 1] ? { slide: SLIDES[index + 1], step: 0 } : null;
  const plannedHere = SLIDES.slice(0, index).reduce((sum, s) => sum + s.seconds, 0);
  const elapsed = Math.floor((now - started) / 1000);
  const behind = elapsed - plannedHere;
  // the notes mark each build with →; the part for the current build is highlighted
  const parts = slide.notes.split("→");

  return (
    <div className="presenter">
      <header className="pv-head">
        <span className="pv-clock">{mmss(elapsed)}</span>
        <span className={`pv-plan${behind > 30 ? " late" : ""}`}>
          plan here {mmss(plannedHere)} of {mmss(TOTAL_SECONDS)} · {behind >= 0 ? `${mmss(behind)} behind` : `${mmss(-behind)} ahead`}
        </span>
        <span className="pv-pos">screen {index + 1} / {SLIDES.length} · build {current} / {slide.steps} · {slide.seconds} s</span>
        <button type="button" onClick={() => setStarted(Date.now())}>Restart clock (R)</button>
      </header>
      <div className="pv-main">
        <div className="pv-current"><SlideView slide={slide} step={current} /></div>
        <div className="pv-side">
          <div className="pv-label">Next</div>
          {next ? <div className="pv-next"><SlideView slide={next.slide} step={next.step} /></div> : <div className="pv-end">End of the talk</div>}
          <div className="pv-buttons">
            <button type="button" onClick={back}>← Back</button>
            <button type="button" onClick={forward}>Next →</button>
          </div>
        </div>
      </div>
      <section className="pv-notes" aria-label="Speaker notes">
        {parts.map((p, i) => (
          <span key={i} className={i === current ? "now" : i < current ? "done" : undefined}>{i > 0 && "→ "}{p.trim()} </span>
        ))}
      </section>
    </div>
  );
}
