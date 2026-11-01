// The status of a finding as an icon and a colour. It always comes with a word (Words.tsx StatusWord, the
// row's label), never colour alone (accessibility).
import { type BadgeProps } from "@fluentui/react-components";
import {
  CheckmarkCircle16Filled,
  DismissCircle16Filled,
  DocumentCopy16Regular,
  Info16Regular,
  QuestionCircle16Filled,
  Warning16Filled,
} from "@fluentui/react-icons";
import type { ReactElement } from "react";

type Look = { color: BadgeProps["color"]; icon: ReactElement };

const STATUS: Record<string, Look> = {
  PRESENT: { color: "success", icon: <CheckmarkCircle16Filled /> },
  ABSENT: { color: "danger", icon: <DismissCircle16Filled /> },
  UNCLEAR: { color: "warning", icon: <QuestionCircle16Filled /> },
  LEGACY_NAME: { color: "warning", icon: <Warning16Filled /> },
  NAME_NOT_RULED_OUT: { color: "warning", icon: <QuestionCircle16Filled /> },
  OTHER_LAW: { color: "informative", icon: <Info16Regular /> },
  LAW_UNKNOWN: { color: "warning", icon: <QuestionCircle16Filled /> },
  LAW_NOT_CONFIRMED: { color: "warning", icon: <QuestionCircle16Filled /> },
  DUPLICATE: { color: "informative", icon: <DocumentCopy16Regular /> },
};

/** The badge colour of a status ("danger", "warning", "informative"), for other marks of the same status. */
export const statusColor = (status: string) => STATUS[status]?.color ?? "subtle";

// The icon alone. It is hidden from screen readers: the word beside it says the same, so colour and
// shape are never the only signal.
export const StatusIcon = ({ status }: { status: string }) => (
  <span className={`si si-${STATUS[status]?.color ?? "subtle"}`} aria-hidden>{STATUS[status]?.icon}</span>
);
