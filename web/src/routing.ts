// Hash routing without a router library: the address says where you are, so every chapter and
// every view of the tool can be opened directly (and bookmarked for the talk).
//   #/story[/<card>]                       the talk as a web page of cards (decision 76)
//   #/present/<card>[/<step>]              the same cards one at a time, full screen (step: 0, 1, ... or 'last')
//   #/presenter/<card>[/<step>]            the presenter view with speaker notes, in sync with present mode
//   #/tool/<area>?doc=M08&clause=...       the Legal Workbench
import { useEffect, useState } from "react";

export type Layer = "story" | "present" | "presenter" | "tool";

export interface Route {
  layer: Layer;
  page: string;
  step: number;               // present / presenter: the revealed build of the card; -1 = its last build
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
  if (first === "present" || first === "presenter") return { layer: first, page: second, step, params };
  return { layer: "story", page: second, step: 0, params };
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
