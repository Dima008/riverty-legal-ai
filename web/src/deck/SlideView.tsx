// One screen of the talk at a given build. Everything is sized in container units (cqw), so the
// same screen renders full size for the audience and small in the overview and presenter view.
import { StepContext } from "./Build";
import { ACTS, pad } from "./slides";
import type { Slide } from "./types";

export function SlideView({ slide, step, label }: { slide: Slide; step: number; label?: string }) {
  const act = ACTS[slide.act - 1];
  const Body = slide.Body;
  return (
    <StepContext.Provider value={step}>
      <div className="stage">
        <section className={`slide k-${slide.kind}${slide.draft ? " draft" : ""}`} aria-label={label ?? slide.title}>
          {slide.kind === "title" && Body && <Body />}
          {slide.kind === "opener" && (
            <div className="s-opener">
              <div className="s-num">{pad(act.n)}</div>
              <h1 className="s-title">{slide.title}</h1>
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
