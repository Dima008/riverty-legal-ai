// Status, triage and review state: always icon + text, never colour alone (accessibility).
import { Badge, type BadgeProps } from "@fluentui/react-components";
import {
  Checkmark16Regular,
  CheckmarkCircle16Filled,
  Circle16Regular,
  CircleHalfFill16Regular,
  Dismiss16Regular,
  DismissCircle16Filled,
  DismissCircle16Regular,
  Edit16Regular,
  Eye16Regular,
  Flag16Regular,
  Info16Regular,
  People16Regular,
  Person16Regular,
  QuestionCircle16Filled,
  ShieldError16Regular,
  Warning16Filled,
} from "@fluentui/react-icons";
import type { ReactElement } from "react";
import { useT } from "../i18n";
import { REVIEW_LABEL, STATUS_LABEL, STATUS_SHORT, TRIAGE_LABEL } from "../labels";

type Look = { color: BadgeProps["color"]; icon: ReactElement };

const STATUS: Record<string, Look> = {
  PRESENT: { color: "success", icon: <CheckmarkCircle16Filled /> },
  ABSENT: { color: "danger", icon: <DismissCircle16Filled /> },
  UNCLEAR: { color: "warning", icon: <QuestionCircle16Filled /> },
  LEGACY_NAME: { color: "warning", icon: <Warning16Filled /> },
  OTHER_LAW: { color: "informative", icon: <Info16Regular /> },
  LAW_UNKNOWN: { color: "warning", icon: <QuestionCircle16Filled /> },
  DUPLICATE: { color: "informative", icon: <Info16Regular /> },
};

const TRIAGE: Record<string, Look> = {
  CONFIRM: { color: "subtle", icon: <Person16Regular /> },
  REVIEW: { color: "warning", icon: <Eye16Regular /> },
  FOUR_EYES: { color: "severe", icon: <People16Regular /> },
};

const REVIEW: Record<string, Look> = {
  FOUND: { color: "subtle", icon: <Info16Regular /> },
  IN_REVIEW: { color: "important", icon: <People16Regular /> },
  CONFIRMED: { color: "success", icon: <Checkmark16Regular /> },
  REJECTED: { color: "danger", icon: <Dismiss16Regular /> },
  CORRECTED: { color: "brand", icon: <Edit16Regular /> },
  DISPUTED: { color: "danger", icon: <ShieldError16Regular /> },
  ESCALATED: { color: "warning", icon: <Flag16Regular /> },
};

// the label is English (labels.ts); it is translated here, where it is shown
function Tag({ look, text, size = "medium" }: { look?: Look; text: string; size?: BadgeProps["size"] }) {
  const t = useT();
  return (
    <Badge appearance="tint" color={look?.color ?? "subtle"} icon={look?.icon} size={size}>
      {t(text)}
    </Badge>
  );
}

// quiet: same icon and words, in grey - for a clause that is not required for this type of contract.
// large: the verdict, where the status is the point of the box.
export const StatusBadge = ({ status, short = false, quiet = false, large = false }:
  { status: string; short?: boolean; quiet?: boolean; large?: boolean }) => {
  const look = STATUS[status];
  return <Tag look={look && quiet ? { ...look, color: "subtle" } : look} size={large ? "large" : "medium"}
              text={(short ? STATUS_SHORT : STATUS_LABEL)[status] ?? status} />;
};

/** The badge colour of a status ("danger", "warning", "informative"), for other marks of the same status. */
export const statusColor = (status: string) => STATUS[status]?.color ?? "subtle";

// Icons alone, for the compact result list. They are hidden from screen readers: the row's label
// says the same in words (status, triage, review state), so colour and shape are never the only signal.
export const StatusIcon = ({ status }: { status: string }) => (
  <span className={`si si-${STATUS[status]?.color ?? "subtle"}`} aria-hidden>{STATUS[status]?.icon}</span>
);
// routine needs no icon: the quiet left border says it
export const TriageIcon = ({ triage }: { triage: string }) =>
  triage === "CONFIRM" ? null : <span className={`si si-${TRIAGE[triage]?.color ?? "subtle"}`} aria-hidden>{TRIAGE[triage]?.icon}</span>;

const REVIEW_ICON: Record<string, ReactElement> = {
  FOUND: <Circle16Regular />,                 // nobody has decided yet: an empty circle
  IN_REVIEW: <CircleHalfFill16Regular />,     // one of two approvals
  CONFIRMED: <CheckmarkCircle16Filled />,
  CORRECTED: <CheckmarkCircle16Filled />,
  REJECTED: <DismissCircle16Regular />,
  DISPUTED: <ShieldError16Regular />,
  ESCALATED: <Flag16Regular />,
};
export const ReviewIcon = ({ state }: { state: string }) => (
  <span className={`si ri-${state.toLowerCase()}`} aria-hidden>{REVIEW_ICON[state] ?? <Circle16Regular />}</span>
);
export const TriageBadge = ({ triage }: { triage: string }) => <Tag look={TRIAGE[triage]} text={TRIAGE_LABEL[triage] ?? triage} />;
export const ReviewBadge = ({ state }: { state: string }) => <Tag look={REVIEW[state]} text={REVIEW_LABEL[state] ?? state} />;
