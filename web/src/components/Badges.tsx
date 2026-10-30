// Status, triage and review state: always icon + text, never colour alone (accessibility).
import { Badge, type BadgeProps } from "@fluentui/react-components";
import {
  Checkmark16Regular,
  CheckmarkCircle16Filled,
  Dismiss16Regular,
  DismissCircle16Filled,
  Edit16Regular,
  Eye16Regular,
  Info16Regular,
  People16Regular,
  Person16Regular,
  QuestionCircle16Filled,
  ShieldError16Regular,
  Warning16Filled,
} from "@fluentui/react-icons";
import type { ReactElement } from "react";
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
};

function Tag({ look, text }: { look?: Look; text: string }) {
  return (
    <Badge appearance="tint" color={look?.color ?? "subtle"} icon={look?.icon} size="medium">
      {text}
    </Badge>
  );
}

export const StatusBadge = ({ status, short = false }: { status: string; short?: boolean }) => (
  <Tag look={STATUS[status]} text={(short ? STATUS_SHORT : STATUS_LABEL)[status] ?? status} />
);
export const TriageBadge = ({ triage }: { triage: string }) => <Tag look={TRIAGE[triage]} text={TRIAGE_LABEL[triage] ?? triage} />;
export const ReviewBadge = ({ state }: { state: string }) => <Tag look={REVIEW[state]} text={REVIEW_LABEL[state] ?? state} />;
