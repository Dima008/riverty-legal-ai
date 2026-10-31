// Moving through the talk: → reveals the next build, then opens the next screen; ← goes back to
// the last build of the screen before. The full-screen window (#/present/...) and the presenter window
// (#/presenter/...) follow each other over a BroadcastChannel, so either one can drive the talk.
import { useEffect } from "react";
import { navigate, parseHash } from "../routing";
import { SLIDES } from "./slides";

export type DeckLayer = "present" | "presenter";

function position(slideId: string, step: number) {
  const index = Math.max(0, SLIDES.findIndex((s) => s.id === slideId));
  const slide = SLIDES[index];
  return { index, slide, current: step < 0 ? slide.steps : Math.min(step, slide.steps) };     // -1 = its last build
}

export function useDeckNav(layer: DeckLayer, slideId: string, step: number) {
  const go = (i: number, s: number | "last" = 0) =>
    navigate(`/${layer}/${SLIDES[i].id}${s === 0 ? "" : `/${s}`}`);
  // read the position from the address at the moment of the key press, not from the last render:
  // a clicker that sends two presses quickly must move two builds, not one
  const now = () => {
    const r = parseHash(location.hash);
    return position(r.page, r.step);
  };
  const forward = () => {
    const { index, slide, current } = now();
    if (current < slide.steps) go(index, current + 1);
    else if (index < SLIDES.length - 1) go(index + 1);
  };
  const back = () => {
    const { index, current } = now();
    if (current > 0) go(index, current - 1);
    else if (index > 0) go(index - 1, "last");
  };
  return { ...position(slideId, step), go, forward, back };
}

/** Arrow keys and the keys presenter clickers send; ignored while someone types. */
export function useDeckKeys(handlers: Record<string, () => void>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.altKey || e.ctrlKey || e.metaKey || (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const run = handlers[key];
      if (!run) return;
      e.preventDefault();
      run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
}

const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("riverty-talk");

/** Tell the other window where we are, and follow it when it moves. */
export function useDeckSync(layer: DeckLayer, slideId: string, step: number) {
  useEffect(() => {
    channel?.postMessage({ slideId, step });
  }, [slideId, step]);
  useEffect(() => {
    if (!channel) return;
    const follow = (e: MessageEvent) => {
      const { slideId: id, step: s } = (e.data ?? {}) as { slideId?: unknown; step?: unknown };
      if (typeof id === "string" && typeof s === "number" && (id !== slideId || s !== step)) {
        navigate(`/${layer}/${id}${s ? `/${s}` : ""}`);
      }
    };
    channel.addEventListener("message", follow);
    return () => channel.removeEventListener("message", follow);
  }, [layer, slideId, step]);
}
