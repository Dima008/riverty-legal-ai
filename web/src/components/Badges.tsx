// The traffic light of a contract (decision 95) as an icon: red ✕, orange ?, green ✓, excluded –. One
// meaning per colour on every screen: red = the issue the question looks for is in the text, orange = a
// person looks, green = positive, with evidence. An icon always comes with a word (Words.tsx), never colour
// alone (accessibility): the shape and the word carry the state, also in grayscale.
import {
  CheckmarkCircle16Filled, DismissCircle16Filled, QuestionCircle16Filled, SubtractCircle16Regular,
} from "@fluentui/react-icons";
import type { ReactElement } from "react";
import type { Light } from "../api";

/** A light, or "excluded": not evaluated, named with the reason. */
export type Lit = Light | "excluded";

const ICON: Record<Lit, ReactElement> = {
  red: <DismissCircle16Filled />,
  orange: <QuestionCircle16Filled />,
  green: <CheckmarkCircle16Filled />,
  excluded: <SubtractCircle16Regular />,
};

// The same sets as pipeline/portfolio.py RED and GREEN - only for older answers and the register, which do
// not carry the server's light. Anything else is orange: an unknown status is never green.
const RED = new Set(["ABSENT", "LEGACY_NAME", "OTHER_LAW", "DUPLICATE"]);
const GREEN = new Set(["PRESENT", "NO_FORMER_NAME", "NAME_RESOLVED", "SAME_LAW", "UNIQUE", "ORIGINAL"]);
export const lightOf = (status: string): Light => (RED.has(status) ? "red" : GREEN.has(status) ? "green" : "orange");

/** The colour of a status, for other marks of the same status (CSS classes sw-red, si-green, ...). */
export const statusColor = (status: string): Light => lightOf(status);

// The icon alone. It is hidden from screen readers: the word beside it says the same.
export const LightIcon = ({ light }: { light: Lit }) => <span className={`si si-${light}`} aria-hidden>{ICON[light]}</span>;

export const StatusIcon = ({ status, light }: { status: string; light?: Lit }) => <LightIcon light={light ?? lightOf(status)} />;
