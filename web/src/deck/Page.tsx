// The talk as a web page, in the style of Gamma (decision 76): large cards on a dark page, one
// statement each, read by scrolling or card by card with ← → / PageUp PageDown. A card plays its
// builds when it comes into view; "Present" shows the same cards one at a time in full screen. The
// address follows the card in the middle of the window (#/story/<card>), so a reload, a shared link
// or "Present" lands on the card you are looking at.
import { useEffect, useRef, useState } from "react";
import { navigate, parseHash } from "../routing";
import { useDeckKeys } from "./nav";
import { openPresenter } from "./Present";
import { SlideView } from "./SlideView";
import { ACTS, DEEP_FROM, mmss, pad, SLIDES, TOTAL_SECONDS } from "./slides";
import type { Slide } from "./types";
import "./deck.css";

const BUILD_MS = 650;      // pause between two builds when a card plays itself
const JUMP_MS = 700;       // while a jump is still scrolling, the next ← → counts from its target

/** Full screen needs the click itself (a user gesture), so it is asked for before the page changes. */
function startPresenting(id: string, fullscreen = true) {
  if (fullscreen) void document.documentElement.requestFullscreen?.().catch(() => undefined);
  navigate(`/present/${id}`);
}

/** The outline on the left can be hidden; the choice is remembered when storage allows it. */
function savedOutline(): boolean {
  try {
    return localStorage.getItem("talk-outline") !== "off";
  } catch {
    return true;
  }
}

// Positions from the layout, not from getBoundingClientRect: a card that has not faded in yet is
// still moved by its entrance transform, and the sticky header covers the top of the window.
const cards = () => [...document.querySelectorAll<HTMLElement>(".talk-card")];
const headerHeight = () => document.querySelector<HTMLElement>(".talk-top")?.offsetHeight ?? 0;
function pageTop(el: HTMLElement): number {
  let y = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) y += n.offsetTop;
  return y;
}
/** The window position that puts a card in the middle of the area below the header - or, in a
 *  window too short for the whole card, its top just below the header. */
function centredTop(el: HTMLElement): number {
  const header = headerHeight();
  const visible = window.innerHeight - header;
  if (el.offsetHeight > visible - 16) return pageTop(el) - header - 8;
  return pageTop(el) + el.offsetHeight / 2 - (header + visible / 2);
}
function scrollToCard(id: string, smooth = true, focus = false) {
  const el = document.getElementById(`card-${id}`);
  if (!el) return;
  window.scrollTo({ top: Math.max(0, centredTop(el)), behavior: smooth ? "smooth" : "auto" });
  if (focus) el.focus({ preventScroll: true });     // the keys then scroll the page, not the outline
}
/** Index of the card closest to the middle of the visible area. */
function middleCard(): number {
  const list = cards();
  const distance = (el: HTMLElement) => Math.abs(centredTop(el) - window.scrollY);
  return list.reduce((best, el, i) => (distance(el) < distance(list[best]) ? i : best), 0);
}

/** One card: fades in when it enters the view, then reveals its builds one after another. */
function Card({ slide, index }: { slide: Slide; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {      // play the builds once, after the card has appeared
    if (!visible || step >= slide.steps) return;
    const timer = window.setTimeout(() => setStep((s) => s + 1), step === 0 ? BUILD_MS * 1.4 : BUILD_MS);
    return () => window.clearTimeout(timer);
  }, [visible, step, slide.steps]);

  return (
    <article ref={ref} id={`card-${slide.id}`} tabIndex={-1} className={`talk-card${visible ? " in" : ""}`} aria-label={`${index + 1}. ${slide.title}`}>
      <SlideView slide={slide} step={step} />
      <button type="button" className="card-present" onClick={() => startPresenting(slide.id)} title="Present from this card, full screen">
        ▶ Present
      </button>
    </article>
  );
}

export function Page({ slideId }: { slideId: string }) {
  const [current, setCurrent] = useState(SLIDES.some((s) => s.id === slideId) ? slideId : SLIDES[0].id);
  const [outline, setOutline] = useState(savedOutline);
  // the deep dives are not part of the talk (decision 101): shown only on request, or when the address names one
  const [deep, setDeep] = useState(() => !!SLIDES.find((s) => s.id === slideId)?.deep);
  const TALK = DEEP_FROM > 0 ? SLIDES.slice(0, DEEP_FROM) : SLIDES;
  const shown = deep ? SLIDES : TALK;
  const pending = useRef<{ i: number; until: number } | null>(null);

  // open on the card named in the address, and go to it when the address changes on the page
  // (header link, a pasted link); the address itself follows the card in the middle
  useEffect(() => {
    if (SLIDES.some((s) => s.id === slideId)) scrollToCard(slideId, false);
    else history.replaceState(null, "", `#/story/${SLIDES[0].id}`);   // #/story, #/story/ or an unknown id
    const onHash = () => {
      const r = parseHash(location.hash);
      if (r.layer === "story" && r.page) scrollToCard(r.page);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);       // eslint-disable-line react-hooks/exhaustive-deps -- once, when the page opens

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const id = SLIDES[middleCard()]?.id;
      if (!id) return;
      setCurrent((old) => {
        if (old !== id) history.replaceState(null, "", `#/story/${id}`);   // replaceState fires no hashchange
        return id;
      });
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /** ← → card by card; a second press while the first jump still scrolls counts from its target. */
  const jump = (d: 1 | -1) => {
    const now = performance.now();
    const from = pending.current && pending.current.until > now ? pending.current.i : middleCard();
    const i = Math.min(SLIDES.length - 1, Math.max(0, from + d));
    pending.current = { i, until: now + JUMP_MS };
    scrollToCard(SLIDES[i].id);
  };
  // ← → and PageUp / PageDown go card by card; ↑ ↓, Space and Home / End scroll as on any web page
  useDeckKeys({ ArrowRight: () => jump(1), ArrowLeft: () => jump(-1), PageDown: () => jump(1), PageUp: () => jump(-1) });
  // Ctrl+Enter starts presenting here, Ctrl+Shift+Enter in full screen (as in Gamma)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        startPresenting(current, e.shiftKey);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current]);

  const toggleOutline = () => {
    const keep = current;
    setOutline((o) => {
      try {
        localStorage.setItem("talk-outline", o ? "off" : "on");
      } catch {
        // not kept
      }
      return !o;
    });
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToCard(keep, false)));   // after the new layout
  };
  // after a mouse click the button gives up the focus, so Space scrolls the page instead of pressing it again
  const blur = (e: React.MouseEvent) => (e.target as HTMLElement).closest<HTMLElement>("button, a")?.blur();
  const currentAct = SLIDES.find((s) => s.id === current)?.act ?? 1;

  return (
    <div className={`talk-bg talk${outline ? "" : " no-nav"}`}>
      <header className="talk-top" onMouseUp={blur}>
        <a className="talk-brand" href="#/story/title">Which contracts are missing something?</a>
        <span className="talk-meta">{TALK.length} cards · {mmss(TOTAL_SECONDS)} min · ← → card by card</span>
        <div className="spacer" />
        <button type="button" className="pill" onClick={toggleOutline} aria-pressed={outline}>Outline</button>
        <button type="button" className="pill primary" onClick={() => startPresenting(current)} title="Full screen, one card at a time (Ctrl+Shift+Enter)">▶ Present</button>
        <button type="button" className="pill" title="Opens your notes in a second window and starts presenting here - then move this window to the projector and press F"
                onClick={() => { openPresenter(current, 0); navigate(`/present/${current}`); }}>
          Present with notes
        </button>
        <button type="button" className="pill" onClick={() => navigate("/tool/workbench")}>Open the tool</button>
      </header>

      <nav className="talk-nav" aria-label="Outline" onMouseUp={blur}>
        {ACTS.filter((act) => deep || act.n < 7).map((act) => (
          <div key={act.n} className={`talk-act${act.n === currentAct ? " on" : ""}`}>
            <div className="talk-act-title">{pad(act.n)} · {act.title}</div>
            <ol>
              {SLIDES.map((s) => s.act !== act.n || s.kind === "opener" ? null : (
                <li key={s.id}>
                  <a href={`#/story/${s.id}`} className={`${s.id === current ? "on" : ""}${s.draft ? " draft" : ""}`}
                     onClick={(e) => { e.preventDefault(); scrollToCard(s.id, true, true); }}>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </nav>

      <main className="talk-cards">
        {shown.map((s, i) => (
          <span key={s.id} style={{ display: "contents" }}>
            {i === DEEP_FROM && <div className="talk-divider">For questions – not part of the talk</div>}
            <Card slide={s} index={i} />
          </span>
        ))}
        <footer className="talk-end">
          <button type="button" className="pill primary" onClick={() => navigate("/tool/workbench")}>Open the Legal Workbench</button>
          {DEEP_FROM > 0 && (
            <button type="button" className="pill" onClick={() => setDeep((d) => !d)} aria-pressed={deep}>
              {deep ? "Hide the cards for questions" : `Cards for questions (${SLIDES.length - DEEP_FROM})`}
            </button>
          )}
        </footer>
      </main>
    </div>
  );
}
