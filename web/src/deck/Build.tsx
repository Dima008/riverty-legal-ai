// Builds: parts of a screen that appear one by one with →, like builds on a slide.
import { createContext, useContext, type ReactNode } from "react";

export const StepContext = createContext(0);

/** The step the screen is on: 0 when it opens, +1 with every →. */
export const useStep = () => useContext(StepContext);

/** Shown from step `at` on; before that it holds its place, invisible, so nothing jumps. */
export function Build({ at, className = "", children }: { at: number; className?: string; children: ReactNode }) {
  const on = useStep() >= at;
  return (
    <div className={`b${on ? " on" : ""}${className ? ` ${className}` : ""}`} aria-hidden={on ? undefined : true}>
      {children}
    </div>
  );
}
