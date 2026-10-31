// Present mode: one card of the talk at a time, as large as the screen allows (decision 76).
// Forward: → / Space / PageDown / ↓ (any clicker), a click on the card, one notch of the wheel or a
// swipe. Back: ← / PageUp / ↑ / Backspace. The controls appear when the mouse moves and hide again
// with the cursor - never while the mouse rests on them. What to say is in the presenter view (P).
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent, type WheelEvent } from "react";
import { navigate } from "../routing";
import { SHORTCUTS, stepKeys, useDeckKeys, useDeckNav, useDeckSync, useWakeLock } from "./nav";
import { Overview } from "./Overview";
import { SlideView } from "./SlideView";
import { SLIDES } from "./slides";
import "./deck.css";

const IDLE_MS = 2500;        // controls and cursor hide after this long without mouse movement
const WHEEL_STEP = 30;       // wheel distance for one step (one notch: 100, or 33 at "one line per notch")
const WHEEL_QUIET_MS = 250;  // one trackpad gesture with momentum counts once
const DRAG_PX = 6;           // a press that moves further is a drag, not a click
const END_PILL_MS = 2200;
const HINT_KEY = "deck-hint";
// a click on these never turns the page
const NO_ADVANCE = "button, a, input, select, textarea, label, summary, [role=button], [contenteditable=true], .present-controls, .present-overview, .present-help, [data-no-advance]";

export function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => undefined);
}

export function openPresenter(slideId: string, step: number) {
  window.open(`#/presenter/${slideId}/${step}`, "riverty-presenter", "width=1280,height=800")?.focus();
}

function seenHint(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function Present({ slideId, step }: { slideId: string; step: number }) {
  const { index, slide, current, go, forward, back } = useDeckNav("present", slideId, step);
  useDeckSync("present", slide.id, current);
  useWakeLock();
  const [overview, setOverview] = useState(false);
  const [help, setHelp] = useState(false);
  const [ui, setUi] = useState(true);
  const [hint, setHint] = useState(() => !seenHint());
  const [end, setEnd] = useState(false);
  const [blank, setBlank] = useState(false);
  const [spot, setSpot] = useState(false);
  const idle = useRef(0);
  const endTimer = useRef(0);
  const onBar = useRef(false);                    // the mouse rests on the controls: keep them
  const wheel = useRef({ sum: 0, locked: false, timer: 0 });
  const focusedAt = useRef(0);
  const press = useRef<{ x: number; y: number; ignore: boolean } | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const hideLater = () => {
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => !onBar.current && setUi(false), IDLE_MS);
  };
  const showUi = () => {
    setUi(true);
    hideLater();
  };
  useEffect(() => {
    showUi();                                           // seen briefly on entry, then out of the way
    const onFocus = () => (focusedAt.current = performance.now());
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearTimeout(idle.current);
      window.clearTimeout(endTimer.current);
      window.removeEventListener("focus", onFocus);
    };
  }, []);         // eslint-disable-line react-hooks/exhaustive-deps -- once
  useEffect(() => {
    if (!hint) return;
    const t = window.setTimeout(() => dismissHint(), 6000);
    return () => window.clearTimeout(t);
  }, [hint]);     // eslint-disable-line react-hooks/exhaustive-deps

  function dismissHint() {
    setHint(false);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      // not kept: the hint shows again next time
    }
  }

  // Every way of moving goes through these two. They clear the black screen first and say so at
  // the very end. Keys, wheel and card clicks also hide the controls (whoever drives that way does
  // not need them); the buttons of the bar keep them, so a second click lands on the same button.
  const next = (keepUi = false) => {
    if (blank) return setBlank(false);
    dismissHint();
    if (!keepUi) setUi(false);
    if (!forward()) {
      setEnd(true);
      window.clearTimeout(endTimer.current);
      endTimer.current = window.setTimeout(() => setEnd(false), END_PILL_MS);
    }
  };
  const prev = (keepUi = false) => {
    if (blank) return setBlank(false);
    dismissHint();
    if (!keepUi) setUi(false);
    back();
  };
  const leave = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    navigate(`/story/${slide.id}`);
  };
  const pick = (i: number) => {
    setOverview(false);
    if (i !== index) go(i);                             // the same card keeps its build
  };

  // One key map at a time: on a black screen any key only brings the picture back; with the
  // shortcut list or the overview open, the talk behind them does not move.
  useEffect(() => {
    if (!blank) return;
    const wake = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setBlank(false);
    };
    window.addEventListener("keydown", wake, true);
    return () => window.removeEventListener("keydown", wake, true);
  }, [blank]);
  useDeckKeys(blank || overview ? {} : help ? { "?": () => setHelp(false), Escape: () => setHelp(false), o: () => { setHelp(false); setOverview(true); } } : {
    ...stepKeys(() => next(), () => prev()),
    Home: () => go(0), End: () => go(SLIDES.length - 1),
    o: () => setOverview(true), p: () => openPresenter(slide.id, current),
    f: toggleFullscreen, F5: () => void document.documentElement.requestFullscreen?.().catch(() => undefined),
    b: () => setBlank(true), ".": () => setBlank(true), s: () => setSpot((v) => !v),
    "?": () => setHelp(true), Escape: leave,
  });

  const onMouseDown = (e: MouseEvent) => {
    // remember where the press started, and whether it only brought the window to the front
    press.current = { x: e.clientX, y: e.clientY, ignore: performance.now() - focusedAt.current < 100 };
  };
  const onClick = (e: MouseEvent) => {
    const p = press.current;
    press.current = null;
    if (e.button !== 0 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;   // only a plain left click
    if (blank) return setBlank(false);
    if (overview || help || !p || p.ignore) return;
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > DRAG_PX) return;     // a drag, not a click
    if ((e.target as Element).closest(NO_ADVANCE)) return;
    next();
  };
  const onWheel = (e: WheelEvent) => {
    if (overview || help || e.ctrlKey) return;                              // ctrl + wheel is zoom
    const scale = e.deltaMode === 1 ? 16 : 1;
    const d = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * scale;
    const w = wheel.current;
    window.clearTimeout(w.timer);
    w.timer = window.setTimeout(() => {
      w.locked = false;
      w.sum = 0;
    }, WHEEL_QUIET_MS);
    if (w.locked) return;
    w.sum += d;
    if (Math.abs(w.sum) >= WHEEL_STEP) {
      w.locked = true;
      if (w.sum > 0) next();
      else prev();
    }
  };
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "touch") swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || overview || help) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(dy)) {
      press.current = null;                                                 // the swipe is the move, not a click
      if (dx < 0) next();
      else prev();
    }
  };

  // 1/N on the first card, 100 % at the last build of the last card
  const progress = (index + (current + 1) / (slide.steps + 1)) / SLIDES.length;
  const cls = ["talk-bg", "present", ui && "ui", spot && "spot"].filter(Boolean).join(" ");

  return (
    <div className={cls} onMouseMove={(e) => (e.movementX || e.movementY) && showUi()}
         onMouseDown={onMouseDown} onClick={onClick} onWheel={onWheel} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <div className="present-stage"><SlideView slide={slide} step={current} /></div>
      <div className="present-progress" aria-hidden><div style={{ width: `${progress * 100}%` }} /></div>

      {hint && <div className="present-pill present-hint" role="status">→, click or scroll: next · ←: back · ?: all keys · Esc: exit</div>}
      {end && <div className="present-pill" role="status">End of the talk · Esc: back to the page</div>}

      <nav className="present-controls" aria-label="Talk controls"
           onMouseEnter={() => { onBar.current = true; setUi(true); }}
           onMouseLeave={() => { onBar.current = false; hideLater(); }}
           onMouseUp={(e) => (e.target as HTMLElement).closest("button")?.blur()}>
        <button type="button" onClick={() => prev(true)} aria-label="Back">←</button>
        <span className="present-count">{index + 1} / {SLIDES.length}</span>
        <button type="button" onClick={() => next(true)} aria-label="Next">→</button>
        <button type="button" onClick={() => setOverview(true)} title="All cards (O)">Overview</button>
        <button type="button" onClick={() => openPresenter(slide.id, current)} title="Presenter view with notes (P)">Notes</button>
        <button type="button" onClick={toggleFullscreen} title="Full screen (F)">Full screen</button>
        <button type="button" onClick={() => setHelp(true)} aria-label="Keyboard shortcuts (?)">?</button>
        <button type="button" onClick={leave} title="Back to the page (Esc)">Exit</button>
      </nav>

      {help && (
        <div className="present-help" role="dialog" aria-label="Keyboard shortcuts" onClick={() => setHelp(false)}>
          <dl>
            {SHORTCUTS.map(([keys, what]) => (
              <div key={keys}><dt>{keys}</dt><dd>{what}</dd></div>
            ))}
          </dl>
          <p>Click anywhere or press ? to close</p>
        </div>
      )}
      {overview && <Overview index={index} onPick={pick} onClose={() => setOverview(false)} />}
      {blank && <div className="present-blank" aria-label="Black screen - any key or a click continues" />}
    </div>
  );
}
