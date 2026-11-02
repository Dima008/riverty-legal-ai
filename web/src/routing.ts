// Hash routing without a router library: the address says where you are, so every chapter and
// every view of the tool can be opened directly (and bookmarked for the talk).
//   #/story[/<card>]                       the talk as a web page of cards (decision 76)
//   #/present/<card>[/<step>]              the same cards one at a time, full screen (step: 0, 1, ... or 'last')
//   #/presenter/<card>[/<step>]            the presenter view with speaker notes, in sync with present mode
//   #/tool/<area>?doc=M08&clause=...       the Legal Workbench
//   #/tool/workbench                       steps 1 + 2 (Analysis, Contracts), fresh: nothing chosen
//   #/tool/workbench?run=<id>[&doc=M14]    step 3 (Answer) of a stored answer; with doc, step 4 (Evidence & decision)
//   #/tool/workbench?doc=M08&clause=<key>  decide one finding, opened from the contract file
//   #/tool/workbench?q=Q2&check=&clause=&intent=find&type=&law=&from=&to=&search=
//                                          step 1 prefilled (filters.ts readParams) - nothing runs
//   #/tool/register?doc=M08&clause=<key>   a contract file; ?type=all&only=new|gaps|names a filter
import { useEffect, useState } from "react";
import { toParams, type ScopeFilters } from "./filters";

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

/** What a Workbench address can carry; type "" = every type ("all" in the address). */
export interface WorkbenchLink extends Partial<ScopeFilters> {
  q?: string;
  check?: string;
  clause?: string;
  intent?: string;
  type?: string | null;
  run?: string;
  doc?: string;
}

/** A Workbench address, e.g. workbenchHref({ run: "run-…" }) or workbenchHref({ type: "", law: "NL" }).
 *  The prefill part is written by filters.ts toParams, the same module that reads it back. */
export function workbenchHref({ run, doc, q, check, clause, intent, type, ...filters }: WorkbenchLink = {}): string {
  const where = new URLSearchParams();
  if (run) where.set("run", run);
  if (doc) where.set("doc", doc);
  const query = [where.toString(), toParams({ q, check, clause, intent, type, filters })].filter(Boolean).join("&");
  return `#/tool/workbench${query ? `?${query}` : ""}`;
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
