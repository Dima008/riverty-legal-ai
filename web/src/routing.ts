// Hash routing without a router library: the address says where you are, so every chapter and
// every view of the tool can be opened directly (and bookmarked for the talk).
//   #/story/<chapter>                      the presentation
//   #/tool/<area>?doc=M08&clause=...       the Legal Workbench
import { useEffect, useState } from "react";

export type Layer = "story" | "tool";

export interface Route {
  layer: Layer;
  page: string;
  params: URLSearchParams;
}

export const TOOL_AREAS = ["workbench", "register", "audit"];

export function parseHash(hash: string): Route {
  const [path, query = ""] = hash.replace(/^#\/?/, "").split("?");
  const [first = "", second = ""] = path.split("/");
  const params = new URLSearchParams(query);
  if (first === "tool") return { layer: "tool", page: second || "workbench", params };
  if (TOOL_AREAS.includes(first)) return { layer: "tool", page: first, params }; // older links: #register
  return { layer: "story", page: second, params };
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
