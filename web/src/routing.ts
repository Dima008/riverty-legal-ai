// Hash routing without a router library: the address says where you are, so every chapter and
// every view of the tool can be opened directly (and bookmarked for the talk).
//   #/story/<chapter>[/<step>]             the presentation (step: 0, 1, ... or 'last')
//   #/tool/<area>?doc=M08&clause=...       the Legal Workbench
import { useEffect, useState } from "react";

export type Layer = "story" | "tool";

export interface Route {
  layer: Layer;
  page: string;
  step: number;               // story only: the revealed step of the chapter; -1 = its last step
  params: URLSearchParams;
}

export const TOOL_AREAS = ["workbench", "register", "audit"];

export function parseHash(hash: string): Route {
  const [path, query = ""] = hash.replace(/^#\/?/, "").split("?");
  const [first = "", second = "", third = ""] = path.split("/");
  const params = new URLSearchParams(query);
  if (first === "tool") return { layer: "tool", page: second || "workbench", step: 0, params };
  if (TOOL_AREAS.includes(first)) return { layer: "tool", page: first, step: 0, params }; // older links: #register
  const step = third === "last" ? -1 : Math.max(0, Number.parseInt(third, 10) || 0);
  return { layer: "story", page: second, step, params };
}

export function navigate(to: string): void {
  location.hash = to.startsWith("#") ? to : `#${to}`;
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
