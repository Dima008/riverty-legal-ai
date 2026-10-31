// The talk as a web page, in the style of Gamma (decision 76): large cards on a dark page, one
// statement each, read by scrolling. A card plays its builds when it comes into view; "Present"
// shows the same cards one at a time in full screen. The address follows the card in view
// (#/story/<card>), so a reload or a shared link lands on the same card.
import { useEffect, useRef, useState } from "react";
import { navigate } from "../routing";
import { openPresenter } from "./Present";
import { SlideView } from "./SlideView";
import { ACTS, mmss, pad, SLIDES, TOTAL_SECONDS } from "./slides";
import type { Slide } from "./types";
import "./deck.css";

const BUILD_MS = 650;      // pause between two builds when a card plays itself

/** One card: fades in when it enters the view, then reveals its builds one after another. */
function Card({ slide, index, onSeen }: { slide: Slide; index: number; onSeen: (id: string) => void }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setVisible(true);
        onSeen(slide.id);
      }
    }, { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, [slide.id, onSeen]);

  useEffect(() => {      // play the builds once, after the card has appeared
    if (!visible || step >= slide.steps) return;
    const timer = window.setTimeout(() => setStep((s) => s + 1), step === 0 ? BUILD_MS * 1.4 : BUILD_MS);
    return () => window.clearTimeout(timer);
  }, [visible, step, slide.steps]);

  return (
    <article ref={ref} id={`card-${slide.id}`} className={`talk-card${visible ? " in" : ""}`} aria-label={`${index + 1}. ${slide.title}`}>
      <SlideView slide={slide} step={step} />
      <button type="button" className="card-present" onClick={() => navigate(`/present/${slide.id}`)} title="Present from this card">
        ▶ Present
      </button>
    </article>
  );
}

export function Page({ slideId }: { slideId: string }) {
  const [current, setCurrent] = useState(slideId || SLIDES[0].id);

  // open on the card named in the address
  useEffect(() => {
    if (slideId) document.getElementById(`card-${slideId}`)?.scrollIntoView({ block: "center" });
  }, []);       // eslint-disable-line react-hooks/exhaustive-deps -- only when the page opens

  // the address follows the card in view without a jump (replaceState fires no hashchange)
  const onSeen = useRef((id: string) => {
    setCurrent(id);
    history.replaceState(null, "", `#/story/${id}`);
  }).current;

  const currentAct = SLIDES.find((s) => s.id === current)?.act ?? 1;

  return (
    <div className="talk-bg talk">
      <header className="talk-top">
        <a className="talk-brand" href="#/story/title">Which contracts are missing something?</a>
        <span className="talk-meta">{SLIDES.length} cards · {mmss(TOTAL_SECONDS)} min</span>
        <div className="spacer" />
        <button type="button" className="pill primary" onClick={() => navigate(`/present/${current}`)}>▶ Present</button>
        <button type="button" className="pill" onClick={() => openPresenter(current, 0)} title="Presenter view with speaker notes">Notes</button>
        <button type="button" className="pill" onClick={() => navigate("/tool/workbench")}>Open the tool</button>
      </header>

      <nav className="talk-nav" aria-label="Outline">
        {ACTS.map((act) => (
          <div key={act.n} className={`talk-act${act.n === currentAct ? " on" : ""}`}>
            <div className="talk-act-title">{pad(act.n)} · {act.title}</div>
            <ol>
              {SLIDES.map((s) => s.act !== act.n || s.kind === "opener" ? null : (
                <li key={s.id}>
                  <a href={`#/story/${s.id}`} className={`${s.id === current ? "on" : ""}${s.draft ? " draft" : ""}`}
                     onClick={(e) => { e.preventDefault(); document.getElementById(`card-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </nav>

      <main className="talk-cards">
        {SLIDES.map((s, i) => <Card key={s.id} slide={s} index={i} onSeen={onSeen} />)}
        <footer className="talk-end">
          <button type="button" className="pill primary" onClick={() => navigate("/tool/workbench")}>Open the Legal Workbench</button>
        </footer>
      </main>
    </div>
  );
}
