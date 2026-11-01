// One screen of the talk at a given build. Everything is sized in container units (cqw), so the
// same screen renders full size for the audience and small in the overview and presenter view.
import { useLayoutEffect, useRef } from "react";
import { StepContext } from "./Build";
import { ACTS, pad } from "./slides";
import type { Slide } from "./types";

export function SlideView({ slide, step, label }: { slide: Slide; step: number; label?: string }) {
  const act = ACTS[slide.act - 1];
  const Body = slide.Body;
  const card = useRef<HTMLElement>(null);
  // while building: a card whose content does not fit - down or to the right - gets a red frame
  // instead of being cut off silently; checked again when the card changes size
  useLayoutEffect(() => {
    const el = card.current;
    if (!import.meta.env.DEV || !el) return;
    const check = () => {
      const over = el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1;
      if (over && !el.classList.contains("overflow")) {
        console.warn(`card "${slide.id}" does not fit: ${el.scrollWidth}x${el.scrollHeight} > ${el.clientWidth}x${el.clientHeight}`);
      }
      el.classList.toggle("overflow", over);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  });
  return (
    <StepContext.Provider value={step}>
      <div className="stage">
        <section ref={card} className={`slide k-${slide.kind}${slide.draft ? " draft" : ""}`} aria-label={label ?? slide.title}>
          {slide.kind === "title" && Body && <Body />}
          {slide.kind === "opener" && (
            <div className="s-opener">
              <div className="s-num">{pad(act.n)}</div>
              <h1 className="s-title">{slide.title}</h1>
              {/* the part's line from Riverty's task, word for word (decision 90) */}
              {slide.quote?.map((q) => <q key={q} className="s-quote">{q}</q>)}
            </div>
          )}
          {slide.kind === "statement" && (
            <div className="s-statement">
              <h1 className="s-title">{slide.title}</h1>
              {Body && <Body />}
            </div>
          )}
          {slide.kind === "content" && (
            <>
              <div className="s-act">{pad(act.n)} · {act.title}</div>
              <h1 className="s-title">{slide.title}</h1>
              <div className="s-body">{Body && <Body />}</div>
            </>
          )}
          {slide.draft && <div className="s-draft">draft · being rebuilt in the new style</div>}
        </section>
      </div>
    </StepContext.Provider>
  );
}
