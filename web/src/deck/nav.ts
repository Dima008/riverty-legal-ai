// Moving through the talk: → reveals the next build, then opens the next card; ← goes back to
// the last build of the card before. The full-screen window (#/present/...) and the presenter window
// (#/presenter/...) follow each other over a BroadcastChannel, so either one can drive the talk.
//
// The protocol, small on purpose:
// - a window announces only its OWN moves (keys, clicks, browser Back, a typed address) - never a
//   move it made to follow the other window, so nothing echoes back and forth;
// - every announcement carries the time of the move, and the later move wins, so two windows
//   pressed at the same moment still end on the same build;
// - a window that opens asks "where are you?" and follows the answer, instead of pulling the
//   window that is already presenting back to its own start card.
import { useEffect } from "react";
import { navigate, parseHash } from "../routing";
import { SLIDES } from "./slides";

export type DeckLayer = "present" | "presenter";

type Message = { type: "pos"; slideId: string; step: number; t: number; from: number } | { type: "hello" };

const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("riverty-talk");
let lastOwnMove = 0;                       // time of this window's last own move
const me = Math.random();                  // breaks a tie when both windows move in the same instant
const clock = () => performance.timeOrigin + performance.now();   // finer than Date.now()
// addresses this code set itself, counted (the same address can be set twice in a row before its
// events arrive) - every other address change came from the user
const ownHashes = new Map<string, number>();

/** Change the address from code (a move or a follow), so the hash listener knows it was not the user. */
function goTo(path: string) {
  ownHashes.set(`#${path}`, (ownHashes.get(`#${path}`) ?? 0) + 1);
  navigate(path);
}

function announce(slideId: string, step: number) {
  lastOwnMove = clock();
  channel?.postMessage({ type: "pos", slideId, step, t: lastOwnMove, from: me } satisfies Message);
}

function position(slideId: string, step: number) {
  const index = Math.max(0, SLIDES.findIndex((s) => s.id === slideId));
  const slide = SLIDES[index];
  return { index, slide, current: step < 0 ? slide.steps : Math.min(step, slide.steps) };     // -1 = its last build
}

export function useDeckNav(layer: DeckLayer, slideId: string, step: number) {
  const go = (i: number, s: number | "last" = 0) => {
    const target = SLIDES[i];
    const n = s === "last" ? target.steps : s;
    goTo(`/${layer}/${target.id}${n === 0 ? "" : `/${n}`}`);
    announce(target.id, n);
  };
  // read the position from the address at the moment of the key press, not from the last render:
  // a clicker that sends two presses quickly must move two builds, not one
  const now = () => {
    const r = parseHash(location.hash);
    return position(r.page, r.step);
  };
  /** true if it moved; false at the last build of the last card */
  const forward = (): boolean => {
    const { index, slide, current } = now();
    if (current < slide.steps) go(index, current + 1);
    else if (index < SLIDES.length - 1) go(index + 1);
    else return false;
    return true;
  };
  const back = (): boolean => {
    const { index, current } = now();
    if (current > 0) go(index, current - 1);
    else if (index > 0) go(index - 1, "last");
    else return false;
    return true;
  };
  return { ...position(slideId, step), go, forward, back };
}

/** The keys that step through the talk - the same in every window and for every kind of clicker
 *  (some send ←/→ or PageUp/PageDown, others ↑/↓). Enter is left alone: it presses a focused button. */
export function stepKeys(forward: () => unknown, back: () => unknown): Record<string, () => void> {
  const f = () => void forward();
  const b = () => void back();
  return { ArrowRight: f, ArrowDown: f, PageDown: f, " ": f, ArrowLeft: b, ArrowUp: b, PageUp: b, Backspace: b };
}

/** Shown under "?" in present mode and in the presenter view. */
export const SHORTCUTS: [string, string][] = [
  ["→  Space  PgDn  ↓  click  scroll", "next build, then next card"],
  ["←  PgUp  ↑  Backspace", "back"],
  ["Home  End", "first / last card"],
  ["O", "all cards (arrows choose, Enter opens)"],
  ["P", "presenter view with notes"],
  ["F  F5", "full screen"],
  ["B  .", "black screen (any key or a click brings it back)"],
  ["S", "spotlight: show what comes next, blurred"],
  ["Esc", "leave present mode (in full screen the first Esc leaves full screen)"],
  ["?", "this list"],
];

/** Keys for the talk; ignored while someone types and with Ctrl/Alt/Meta, so browser shortcuts work. */
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

/** Keep the two windows on the same card and build (see the protocol at the top). */
export function useDeckSync(layer: DeckLayer, slideId: string, step: number) {
  // a window that opens asks where the other one is - and stays put if nobody answers
  useEffect(() => {
    channel?.postMessage({ type: "hello" } satisfies Message);
  }, []);
  // the user changed the address directly (browser Back, a typed or pasted address): an own move
  useEffect(() => {
    const onHash = (e: HashChangeEvent) => {
      // the address of THIS event: after two quick presses the first event arrives when
      // location.hash already shows the second address
      const hash = new URL(e.newURL).hash;
      const mine = ownHashes.get(hash) ?? 0;
      if (mine > 0) {                                        // set by a move or a follow of this window
        if (mine === 1) ownHashes.delete(hash);
        else ownHashes.set(hash, mine - 1);
        return;
      }
      const r = parseHash(hash);
      if (r.layer !== layer) return;
      const p = position(r.page, r.step);
      announce(p.slide.id, p.current);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [layer]);
  useEffect(() => {
    if (!channel) return;
    const onMessage = (e: MessageEvent) => {
      const m = e.data as Message | undefined;
      if (m?.type === "hello") {                             // answer with where this window is
        channel.postMessage({ type: "pos", slideId, step, t: lastOwnMove, from: me } satisfies Message);
        return;
      }
      if (m?.type !== "pos" || typeof m.slideId !== "string" || typeof m.step !== "number") return;
      if (m.t < lastOwnMove || (m.t === lastOwnMove && m.from < me)) return;   // our own later move wins
      // compare with the address now, not with the last render: several messages can arrive
      // before this window has drawn the first of them
      const here = parseHash(location.hash);
      const at = position(here.page, here.step);
      if (m.slideId !== at.slide.id || m.step !== at.current) goTo(`/${layer}/${m.slideId}${m.step ? `/${m.step}` : ""}`);
    };
    channel.addEventListener("message", onMessage);
    return () => channel.removeEventListener("message", onMessage);
  }, [layer, slideId, step]);
}

/** Keep the screen from dimming while presenting (the browser may refuse; then nothing happens). */
export function useWakeLock() {
  useEffect(() => {
    type Lock = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<Lock> } };
    let lock: Lock | null = null;
    const take = () => nav.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => undefined);
    const again = () => document.visibilityState === "visible" && take();
    take();
    document.addEventListener("visibilitychange", again);
    return () => {
      document.removeEventListener("visibilitychange", again);
      void lock?.release().catch(() => undefined);
    };
  }, []);
}
