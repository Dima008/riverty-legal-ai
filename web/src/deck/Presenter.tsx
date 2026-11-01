// The presenter view (P in the talk), made for reading aloud: the speaker notes are the largest
// thing on the screen, one paragraph per build, the current one bright and kept in view; beside
// them the card on screen, pronunciation help, the next card and the clock against the plan. It
// drives the audience window and follows it (BroadcastChannel). O opens all cards here - for a
// jump during questions without showing the grid on the projector.
import { useEffect, useRef, useState } from "react";
import { stepKeys, useDeckKeys, useDeckNav, useDeckSync, useWakeLock } from "./nav";
import { Overview } from "./Overview";
import { SlideView } from "./SlideView";
import { CHECKPOINTS, mmss, plannedStart, SKIP_IF_LATE, SLIDES, TOTAL_SECONDS } from "./slides";
import "./deck.css";

const SIZES = { min: 18, max: 40, start: 26, step: 2 };
const CLOCK_KEY = "talk-clock";

/** The chosen note size survives a reload; storage may be blocked, then it is just not kept. */
function savedSize(): number {
  try {
    const n = Number(localStorage.getItem("notes-size"));
    return n >= SIZES.min && n <= SIZES.max ? n : SIZES.start;
  } catch {
    return SIZES.start;
  }
}

/** The clock of this window survives a reload of it (sessionStorage); a new window starts fresh. */
function savedClock(): number | null {
  try {
    const n = Number(sessionStorage.getItem(CLOCK_KEY));
    return n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function Presenter({ slideId, step }: { slideId: string; step: number }) {
  const { index, slide, current, go, forward, back } = useDeckNav("presenter", slideId, step);
  useDeckSync("presenter", slide.id, current);
  useWakeLock();
  const [started, setStarted] = useState<number | null>(savedClock);
  const [now, setNow] = useState(() => Date.now());
  const [size, setSize] = useState(savedSize);
  const [overview, setOverview] = useState(false);
  const notes = useRef<HTMLElement>(null);
  const opened = useRef(`${slide.id}/${current}`);

  const startClock = (at: number | null) => {
    setStarted(at);
    setNow(Date.now());
    try {
      if (at) sessionStorage.setItem(CLOCK_KEY, String(at));
      else sessionStorage.removeItem(CLOCK_KEY);
    } catch {
      // not kept - a reload starts the clock again
    }
  };
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);     // the seconds turn on time
    return () => window.clearInterval(timer);
  }, []);
  // the clock starts with the first move after the window opened - in either window
  useEffect(() => {
    if (started === null && `${slide.id}/${current}` !== opened.current) startClock(Date.now());
    notes.current?.querySelector(".now")?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [slide.id, current]);    // eslint-disable-line react-hooks/exhaustive-deps

  const resize = (delta: number) => setSize((s) => {
    const next = Math.min(SIZES.max, Math.max(SIZES.min, s + delta));
    try {
      localStorage.setItem("notes-size", String(next));
    } catch {
      // not kept - the view works without it
    }
    return next;
  });
  useDeckKeys(overview ? {} : {
    ...stepKeys(forward, back), Home: () => go(0), End: () => go(SLIDES.length - 1),
    o: () => setOverview(true), r: () => startClock(Date.now()),
    "+": () => resize(SIZES.step), "-": () => resize(-SIZES.step), F5: () => undefined,   // F5 must not reload the notes
  });

  const next = current < slide.steps ? { slide, step: current + 1 }
    : SLIDES[index + 1] ? { slide: SLIDES[index + 1], step: 0 } : null;
  const plannedHere = plannedStart(index);
  const elapsed = started === null ? null : Math.max(0, Math.floor((now - started) / 1000));
  const behind = elapsed === null ? 0 : elapsed - plannedHere;
  // the next checkpoint (act start, or the register); when it is already past: what can still be skipped
  const checkpoint = slide.deep ? undefined : CHECKPOINTS.find((c) => c.index > index);
  const late = elapsed !== null && checkpoint !== undefined && elapsed > checkpoint.at;
  const at = (id: string) => SLIDES.findIndex((s) => s.id === id);
  const skips = SKIP_IF_LATE.filter((k) => at(k.id) > index || (at(k.id) === index && k.build !== undefined && current < k.build))
    .map((k) => (k.build === undefined ? k.id : `${k.id} from build ${k.build}`));
  const blur = (e: React.MouseEvent) => (e.target as HTMLElement).closest("button")?.blur();   // keys keep working after a click

  return (
    <div className="presenter">
      <header className="pv-head" onMouseUp={blur}>
        <span className="pv-clock">{elapsed === null ? "–:––" : mmss(elapsed)}</span>
        {elapsed === null ? (
          <span className="pv-plan">the clock starts with your first move · plan {mmss(TOTAL_SECONDS)}</span>
        ) : (
          <span className={`pv-plan${behind > 30 ? " late" : ""}`}>
            plan here {mmss(plannedHere)} of {mmss(TOTAL_SECONDS)} · {behind >= 0 ? `${mmss(behind)} behind` : `${mmss(-behind)} ahead`}
          </span>
        )}
        {checkpoint && (
          <span className={`pv-check${late ? " late" : ""}`}>
            {checkpoint.label} by {mmss(checkpoint.at)}
            {late && skips.length > 0 && <> · late: skip {skips.join(", then ")}</>}
          </span>
        )}
        <span className="pv-pos">card {index + 1} / {SLIDES.length} · build {current} / {slide.steps} · {slide.seconds} s</span>
        <span className="pv-size" role="group" aria-label="Text size">
          <button type="button" onClick={() => resize(-SIZES.step)} aria-label="Smaller text (−)">A−</button>
          <button type="button" onClick={() => resize(SIZES.step)} aria-label="Larger text (+)">A+</button>
        </span>
        <button type="button" onClick={() => setOverview(true)} title="Jump to a card (O)">Cards</button>
        <button type="button" onClick={() => startClock(Date.now())}>{started === null ? "Start clock" : "Restart clock"} (R)</button>
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
          <div className="pv-buttons" onMouseUp={blur}>
            <button type="button" onClick={back}>← Back</button>
            <button type="button" onClick={forward}>Next →</button>
          </div>
        </aside>
      </div>
      {overview && <Overview index={index} onPick={(i) => { go(i); setOverview(false); }} onClose={() => setOverview(false)} />}
    </div>
  );
}
