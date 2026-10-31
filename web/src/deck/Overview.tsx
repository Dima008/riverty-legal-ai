// All cards at once (O), grouped by act: jump to any card, e.g. during questions. The selection
// IS the keyboard focus: arrows and clicker keys move it, Enter or Space opens the focused card
// (or presses the focused Close button), O or Esc closes - the talk itself does not move.
import { useEffect, useRef, useState } from "react";
import { useDeckKeys } from "./nav";
import { SlideView } from "./SlideView";
import { ACTS, pad, SLIDES } from "./slides";

export function Overview({ index, onPick, onClose }: { index: number; onPick: (i: number) => void; onClose: () => void }) {
  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);
  const [pick, setPick] = useState(index);          // the focused card, drawn with a clear frame
  const focusAt = (i: number) => {
    const el = thumbs.current[Math.min(SLIDES.length - 1, Math.max(0, i))];
    el?.focus();
    el?.scrollIntoView({ block: "nearest" });
  };
  const focused = () => thumbs.current.findIndex((el) => el === document.activeElement);
  const move = (d: number) => focusAt((focused() < 0 ? index : focused()) + d);
  useDeckKeys({
    ArrowRight: () => move(1), ArrowDown: () => move(1), PageDown: () => move(1),
    ArrowLeft: () => move(-1), ArrowUp: () => move(-1), PageUp: () => move(-1),
    o: onClose, Escape: onClose,
  });
  useEffect(() => focusAt(index), []);   // eslint-disable-line react-hooks/exhaustive-deps -- start on the current card

  return (
    <div className="present-overview" role="dialog" aria-label="All cards">
      <button type="button" className="present-overview-close" onClick={onClose}>Close (Esc)</button>
      {ACTS.map((act) => (
        <section key={act.n} className="present-overview-act">
          <h2>{pad(act.n)} · {act.title}</h2>
          <div className="present-overview-grid">
            {SLIDES.map((s, i) => s.act !== act.n ? null : (
              <button key={s.id} type="button" ref={(el) => { thumbs.current[i] = el; }}
                      className={["thumb", i === index && "on", i === pick && "pick", s.draft && "draft"].filter(Boolean).join(" ")}
                      onFocus={() => setPick(i)} onClick={() => onPick(i)}>
                <span className="thumb-card" aria-hidden><SlideView slide={s} step={s.steps} /></span>
                <span className="thumb-title">{i + 1}. {s.title}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
