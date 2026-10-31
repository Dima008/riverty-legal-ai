// Present mode: one card of the talk at a time, as large as the screen allows (decision 76).
// Keys: → / ← (or a clicker), O overview, P presenter window with notes, F full screen,
// Esc back to the page. What to say is in the presenter view, never on the screen.
import { useState } from "react";
import { navigate } from "../routing";
import { useDeckKeys, useDeckNav, useDeckSync } from "./nav";
import { SlideView } from "./SlideView";
import { ACTS, pad, SLIDES } from "./slides";
import "./deck.css";

export function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => undefined);
}

export function openPresenter(slideId: string, step: number) {
  window.open(`#/presenter/${slideId}/${step}`, "riverty-presenter", "width=1280,height=800");
}

export function Present({ slideId, step }: { slideId: string; step: number }) {
  const { index, slide, current, go, forward, back } = useDeckNav("present", slideId, step);
  const [overview, setOverview] = useState(false);
  useDeckSync("present", slide.id, current);
  const leave = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    navigate(`/story/${slide.id}`);
  };
  useDeckKeys({
    ArrowRight: forward, PageDown: forward, " ": forward, ArrowLeft: back, PageUp: back,
    Home: () => go(0), End: () => go(SLIDES.length - 1),
    o: () => setOverview((o) => !o), Escape: () => (overview ? setOverview(false) : leave()),
    p: () => openPresenter(slide.id, current), f: toggleFullscreen,
  });
  const progress = (index + (slide.steps ? current / (slide.steps + 1) : 0)) / SLIDES.length;

  return (
    <div className="talk-bg present">
      <div className="present-stage"><SlideView slide={slide} step={current} /></div>
      <div className="present-progress" aria-hidden><div style={{ width: `${progress * 100}%` }} /></div>
      <nav className="present-controls" aria-label="Talk controls">
        <button type="button" onClick={back} aria-label="Back">←</button>
        <span className="present-count">{index + 1} / {SLIDES.length}</span>
        <button type="button" onClick={forward} aria-label="Next">→</button>
        <button type="button" onClick={() => setOverview(true)} title="Overview (O)">Overview</button>
        <button type="button" onClick={() => openPresenter(slide.id, current)} title="Presenter view with notes (P)">Notes</button>
        <button type="button" onClick={toggleFullscreen} title="Full screen (F)">Full screen</button>
        <button type="button" onClick={leave} title="Back to the page (Esc)">Exit</button>
      </nav>

      {overview && (
        <div className="present-overview" role="dialog" aria-label="All cards">
          <button type="button" className="present-overview-close" onClick={() => setOverview(false)}>Close (Esc)</button>
          {ACTS.map((act) => (
            <section key={act.n} className="present-overview-act">
              <h2>{pad(act.n)} · {act.title}</h2>
              <div className="present-overview-grid">
                {SLIDES.map((s, i) => s.act !== act.n ? null : (
                  <button key={s.id} type="button" className={`thumb${i === index ? " on" : ""}${s.draft ? " draft" : ""}`}
                          onClick={() => { go(i); setOverview(false); }}>
                    <span className="thumb-card" aria-hidden><SlideView slide={s} step={s.steps} /></span>
                    <span className="thumb-title">{i + 1}. {s.title}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
