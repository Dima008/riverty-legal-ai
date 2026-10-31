// Language switch for the tool layer (decision 74): Riverty's legal team works in German, and
// the tool speaks the lawyers' language. The presentation stays English.
//
// How it works: the English text is the key. t("Clause not found") looks the text up in the German
// dictionary below; when an entry is missing it falls back to the English text, so a forgotten
// translation shows English, never an empty string. Placeholders like {n} are filled in after
// the lookup: t("{done} of 2 approvals", { done: 1 }).
//
// Only the interface is translated. Quotes from contracts, playbook definitions from the API,
// model reasons and server messages are never translated: they stay in their original language,
// because they are evidence or come from the server as they are.
import { createContext, useContext } from "react";

export type Lang = "en" | "de";
export type Params = Record<string, string | number>;
export type T = (text: string, params?: Params) => string;

export const DE: Record<string, string> = {
  // ---- header, tabs, footer (App.tsx)
  "Contract register · Legal": "Vertragsregister · Rechtsabteilung",
  "Synthetic test data": "Synthetische Testdaten",
  "Register {version}": "Register {version}", // same in German
  "API offline": "API offline", // same in German
  "Language": "Sprache",
  "Signed in as": "Angemeldet als",
  "Workbench": "Workbench", // same word in German
  "Contract register": "Vertragsregister",
  "Audit log": "Audit-Log",
  "Observations, not legal advice – lawyers decide · Synthetic and public test data (CUAD, CC BY 4.0) · Every model call is logged with its cost":
    "Beobachtungen, keine Rechtsberatung – die Rechtsabteilung entscheidet · Synthetische und öffentliche Testdaten (CUAD, CC BY 4.0) · Jeder Modellaufruf wird mit seinen Kosten protokolliert",

  // ---- labels.ts: status of a finding (long and short form)
  "Clause found": "Klausel vorhanden",
  "Clause not found": "Klausel nicht gefunden",
  "Unclear – needs a look": "Unklar – bitte prüfen",
  "Former company name": "Früherer Firmenname",
  "Other governing law": "Anderes anwendbares Recht",
  "Governing law not found": "Keine Rechtswahl gefunden",
  "Duplicate": "Dublette",
  "Found": "Vorhanden",
  "Not found": "Nicht gefunden",
  "Unclear": "Unklar",
  "Former name": "Alter Name",
  "Other law": "Anderes Recht",
  "No law found": "Keine Rechtswahl",
  // triage
  "Routine": "Routine",
  "Review": "Prüfen",
  "Four eyes": "Vier-Augen-Prüfung",
  // review state
  "Open": "Offen",
  "1 of 2 approvals": "1 von 2 Freigaben",
  "Confirmed": "Bestätigt",
  "Rejected": "Verworfen",
  "Corrected": "Korrigiert",
  "Disputed – escalate": "Strittig – eskalieren",
  "Escalated – four eyes": "Eskaliert – Vier-Augen-Prüfung",
  // document types (plural, singular, short, filter buttons)
  "merchant agreements": "Händlerverträge",
  "data processing agreements": "Auftragsverarbeitungsverträge",
  "amendments": "Nachträge",
  "other commercial agreements": "sonstige Handelsverträge",
  "documents of unknown type": "Dokumente unbekannten Typs",
  "all documents": "alle Dokumente",
  "Merchant agreement": "Händlervertrag",
  "Data processing agreement": "Auftragsverarbeitungsvertrag",
  "Amendment": "Nachtrag",
  "Other commercial agreement": "Sonstiger Handelsvertrag",
  "Unknown type": "Unbekannter Typ",
  "Merchant": "Händler",
  "DPA": "AVV",
  "Other": "Sonstige",
  "Unknown": "Unbekannt",
  "All documents": "Alle Dokumente",
  "Merchant agreements": "Händlerverträge",
  "Data processing (DPA)": "Auftragsverarbeitung (AVV)",
  "Other contracts (CUAD)": "Sonstige Verträge (CUAD)",
  "Amendments": "Nachträge",
  // the checks of the guardrail sandwich
  "What the model said": "Was das Modell gesagt hat",
  "Quote found in the contract": "Zitat im Vertrag gefunden",
  "Quote not from a suspicious passage": "Zitat nicht aus einer verdächtigen Textstelle",
  "Quote uses the clause's vocabulary": "Zitat verwendet das Vokabular der Klausel",
  "Second model call agrees (four eyes)": "Zweiter Modellaufruf stimmt zu (Vier-Augen-Prinzip)",
  "No hint that the clause exists after all": "Kein Hinweis, dass die Klausel doch vorhanden ist",
  "Document quality and safety": "Dokumentqualität und -sicherheit",
  "What the register says": "Was das Register sagt",
  // warnings
  "Contains text addressed to software": "Enthält an Software gerichteten Text",
  "Quote from a suspicious passage": "Zitat aus verdächtiger Textstelle",
  "Contradicting metadata": "Widersprüchliche Metadaten",
  "Base agreement not in register": "Basisvertrag nicht im Register",
  "Quote not found in the contract": "Zitat nicht im Vertrag gefunden",
  "Quote does not fit the clause": "Zitat passt nicht zur Klausel",
  "Second check disagreed": "Zweite Prüfung widerspricht",
  "Second check missing": "Zweite Prüfung fehlt",
  "Hint that the clause may exist": "Hinweis, dass die Klausel vorhanden sein könnte",
  "Read by OCR": "Per OCR gelesen",
  "Poor scan quality": "Schlechte Scanqualität",

  // ---- names that come from the API (check types, playbook clauses); their definitions stay English
  "Contracts that lack a clause (absent or unclear)": "Verträge, denen eine Klausel fehlt (fehlend oder unklar)",
  "Contracts that still name a former company": "Verträge, die noch einen früheren Firmennamen nennen",
  "Contracts not governed by a given law": "Verträge, die nicht einem bestimmten Recht unterliegen",
  "Duplicate documents": "Dubletten",
  "Limitation of liability": "Haftungsbegrenzung",
  "Consumer terms in checkout": "Verbraucherbedingungen im Checkout",
  "Data processing agreement (Art. 28 GDPR)": "Auftragsverarbeitungsvertrag (Art. 28 DSGVO)",
  "Sub-processors": "Unterauftragsverarbeiter",
  "Audit and inspection rights": "Kontroll- und Auditrechte",

  // ---- workbench start (Workbench.tsx)
  "How it works": "So funktioniert es",
  "Complete": "Vollständig",
  "Every contract in scope is read in full – or listed as excluded, with the reason. Nothing drops out silently.":
    "Jeder Vertrag im Prüfumfang wird vollständig gelesen – oder mit Begründung als ausgeschlossen aufgeführt. Nichts fällt stillschweigend heraus.",
  "Evidence first": "Beleg zuerst",
  "Every finding points to the passage on the original page, and shows which checks it passed.":
    "Jeder Befund verweist auf die Textstelle auf der Originalseite und zeigt, welche Prüfungen er bestanden hat.",
  "You decide": "Die Rechtsabteilung entscheidet",
  "The system reports observations. Critical cases need two people, and nothing leaves the system without approval.":
    "Das System meldet Beobachtungen. Kritische Fälle prüfen zwei Personen, und nichts verlässt das System ohne Freigabe.",
  "API not reachable – is the backend running on port 8010? ({error})": "API nicht erreichbar – läuft das Backend auf Port 8010? ({error})",
  "Loading…": "Wird geladen …",
  "Evidence": "Beleg",
  "Select a contract to see the evidence.": "Vertrag auswählen, um den Beleg zu sehen.",

  // ---- step 1: ask (AskPanel.tsx)
  "Negative clause search": "Negativsuche: fehlende Klausel",
  "Negative clause search (B2B2C)": "Negativsuche: fehlende Klausel (B2B2C)",
  "Company name": "Firmenname",
  "Register / metadata filter": "Register / Metadatenfilter",
  "Inbound (DPA)": "Eingehend (AVV)",
  "Organising": "Bestand ordnen",
  "Check": "Prüfung",
  "Clause": "Klausel",
  "Choose a clause": "Klausel auswählen",
  "Scope": "Prüfumfang",
  "Expected governing law": "Erwartetes anwendbares Recht",
  "law is not {law}": "Recht ist nicht {law}",
  "in merchant agreements": "in Händlerverträgen",
  "in data processing agreements": "in Auftragsverarbeitungsverträgen",
  "in amendments": "in Nachträgen",
  "in other commercial agreements": "in sonstigen Handelsverträgen",
  "in documents of unknown type": "in Dokumenten unbekannten Typs",
  "in all documents": "in allen Dokumenten",
  "Plan": "Plan",
  "Ask a question": "Frage stellen",
  "Step 1 · Ask": "Schritt 1 · Frage",
  "What do you want to know about the contract portfolio?": "Was soll im Vertragsbestand geprüft werden?",
  "Every question runs on every contract in scope – and you see the plan before anything runs.":
    "Jede Frage läuft über jeden Vertrag im Prüfumfang – und der Plan ist sichtbar, bevor etwas läuft.",
  "Or build the check yourself": "Oder die Prüfung selbst zusammenstellen",
  "Pick a question above or choose the {params}": "Oben eine Frage wählen oder {params} festlegen",
  "clause type": "Klauseltyp",
  "law": "Recht",
  "Register query · no model call · $0": "Registerabfrage · kein Modellaufruf · 0 $",
  "Check all contracts": "Alle Verträge prüfen",

  // ---- step 2: answer (RunOverview.tsx)
  "Answer overview": "Antwort im Überblick",
  "Step 2 · Answer": "Schritt 2 · Antwort",
  "Your check": "Eigene Prüfung",
  "in scope": "im Prüfumfang",
  "checked": "geprüft",
  "read completely, with evidence": "vollständig gelesen, mit Beleg",
  "to look at": "zu prüfen",
  "nothing to report": "nichts zu melden",
  "excluded": "ausgeschlossen",
  "with reason, see below": "mit Begründung, siehe unten",
  "none": "keine",
  "cost of this question": "Kosten dieser Frage",
  "register built once for {usd}": "Register einmalig für {usd} aufgebaut",
  "{reported} to look at, {ok} without finding, {excluded} excluded": "{reported} zu prüfen, {ok} ohne Befund, {excluded} ausgeschlossen",
  "checked, nothing to report": "geprüft, nichts zu melden",
  "former name already resolved by amendment {id}": "früherer Name bereits durch Nachtrag {id} bereinigt",
  "four eyes": "Vier-Augen-Prüfung",
  "review": "Prüfen",
  "routine": "Routine",

  // ---- step 3: review list (ResultList.tsx)
  "Contracts to look at": "Zu prüfende Verträge",
  "Step 3 · Review": "Schritt 3 · Prüfung",
  "{n} contracts · {open} open": "{n} Verträge · {open} offen",
  "Confirm {n} routine": "{n} Routinefälle bestätigen",
  "No contract in scope has this issue.": "Kein Vertrag im Prüfumfang ist betroffen.",
  "unknown party": "unbekannter Vertragspartner",
  "confidence from the checks": "Konfidenz aus den Prüfungen",
  "Random spot check: open the evidence before confirming": "Zufällige Stichprobe: vor dem Bestätigen den Beleg öffnen",
  "spot check": "Stichprobe",

  // ---- evidence and contract file (Evidence.tsx, ContractFile.tsx, PageView.tsx, Finding.tsx)
  "Loading evidence for {doc}…": "Beleg für {doc} wird geladen …",
  "Unknown party": "Unbekannter Vertragspartner",
  "no date": "kein Datum",
  "{law} law": "Recht: {law}",
  "law not found": "keine Rechtswahl gefunden",
  "family {ids}": "Vertragsfamilie {ids}",
  "Original document": "Originaldokument",
  "Model's reason: {reason}": "Begründung des Modells: {reason}",
  "How the register decided": "Wie das Register entschieden hat",
  "{status} is an observation about the text, not a legal assessment.": "„{status}“ ist eine Beobachtung zum Text, keine rechtliche Bewertung.",
  "page {n}": "Seite {n}",
  "Copy of {id}. The original is checked; this copy is not counted twice.":
    "Kopie von {id}. Geprüft wird das Original; diese Kopie wird nicht doppelt gezählt.",
  "the model's quote": "Zitat des Modells",
  "the passage that hints at the clause": "Textstelle, die auf die Klausel hindeutet",
  "the former company name": "früherer Firmenname",
  "highlighted": "markiert",
  "and": "und",
  "Previous page": "Vorherige Seite",
  "Next page": "Nächste Seite",
  "Page {page} of {count}": "Seite {page} von {count}",
  "scanned, read by OCR ({conf} %)": "gescannt, per OCR gelesen ({conf} %)",
  "{doc}, page {page}": "{doc}, Seite {page}",
  "Checks applied to this finding": "Prüfungen dieses Befunds",
  "passed": "bestanden",
  "failed": "nicht bestanden",
  "found in the text: …{text}…": "im Text gefunden: …{text}…",
  "Model proposed": "Modellvorschlag",
  "{n} checks": "{n} Prüfungen",
  "{n} checks, {failed} failed": "{n} Prüfungen, {failed} nicht bestanden",
  "Register says": "Register sagt",
  "confidence {c}": "Konfidenz {c}",
  "No passage: the model read the whole contract and reported no such clause.":
    "Keine Textstelle: Das Modell hat den ganzen Vertrag gelesen und keine solche Klausel gemeldet.",
  "Close": "Schließen",
  "Loading the contract file…": "Vertragsakte wird geladen …",
  "Family:": "Vertragsfamilie:",
  "Copies:": "Kopien:",
  "Open {id}": "{id} öffnen",
  "our entity today: {name}": "unsere Gesellschaft heute: {name}",
  "Compared with the playbook": "Abgleich mit dem Playbook",
  "required": "erforderlich",
  "not required here": "hier nicht erforderlich",
  "The playbook says": "Das Playbook sagt",
  "Former company names": "Frühere Firmennamen",
  "resolved by {id}": "bereinigt durch {id}",
  "open": "offen",

  // ---- the human decision (ReviewBox.tsx, FindingReview.tsx)
  "Your decision": "Entscheidung",
  "Four-eyes principle: {done} of 2 approvals": "Vier-Augen-Prinzip: {done} von 2 Freigaben",
  "{done} of 2 approvals": "{done} von 2 Freigaben",
  "{done} of 1 decision": "{done} von 1 Entscheidung",
  "spot-check sample: open the evidence before confirming": "Stichprobe: vor dem Bestätigen den Beleg öffnen",
  "confirmed": "bestätigt",
  "rejected": "verworfen",
  "corrected": "korrigiert",
  "escalated": "eskaliert",
  "present": "vorhanden",
  "absent": "nicht vorhanden",
  "missing": "nicht vorhanden",
  "in the register": "im Register",
  "in run {id}": "in Prüflauf {id}",
  "You ({user}) already approved this row. The second approval must come from a different person – switch the reviewer at the top.":
    "{user} hat diese Zeile bereits freigegeben. Die zweite Freigabe muss von einer anderen Person kommen – oben den Prüfer wechseln.",
  "You ({user}) already decided. The second approval must come from a different person.":
    "{user} hat bereits entschieden. Die zweite Freigabe muss von einer anderen Person kommen.",
  "Continue as {user}": "Weiter als {user}",
  "Reason (required for this row)": "Begründung (für diese Zeile erforderlich)",
  "Reason (optional for routine rows)": "Begründung (bei Routinezeilen optional)",
  "Reason (optional for a routine finding)": "Begründung (bei Routinebefund optional)",
  "Reason (required)": "Begründung (erforderlich)",
  "What did you check in the evidence?": "Was wurde im Beleg geprüft?",
  "If you correct it, the clause is actually …": "Bei Korrektur ist die Klausel tatsächlich …",
  "Confirm finding": "Befund bestätigen",
  "Reject": "Verwerfen",
  "Correct": "Korrigieren",
  "Escalate": "Eskalieren",
  "Store archive copy": "Archivkopie speichern",
  "Write-only contract storage, one copy per file": "Vertragsablage nur mit Schreibzugriff, eine Kopie pro Datei",
  "Locked until the finding is approved – the server refuses and logs every attempt":
    "Gesperrt, bis der Befund freigegeben ist – der Server verweigert und protokolliert jeden Versuch",
  "{file}: {status} (receipt {id})": "{file}: {status} (Quittung {id})",
  "stored": "gespeichert",
  "already stored": "bereits gespeichert",
  "already archived": "bereits archiviert",
  "approved by {names}": "freigegeben von {names}",
  "Review in the register": "Prüfung im Register",
  "{n} review(s) of an earlier version of this finding no longer apply: the text, the extraction or the status has changed since.":
    "{n} Prüfung(en) einer früheren Fassung dieses Befunds gelten nicht mehr: Text, Extraktion oder Status haben sich seitdem geändert.",

  // ---- contract register (Register.tsx)
  "Text": "Text", // same in German
  "Scan": "Scan", // same in German
  "Photo scan": "Fotoscan",
  " – required for this type": " – für diesen Typ erforderlich",
  " – not required for this type": " – für diesen Typ nicht erforderlich",
  ". The model said “{status}”, the checks changed it.": ". Das Modell sagte „{status}“, die Prüfungen haben das geändert.",
  ". Review: {state}.": ". Prüfung: {state}.",
  "API not reachable ({error})": "API nicht erreichbar ({error})",
  "Loading the register…": "Register wird geladen …",
  "{n} documents, each compared with Legal's playbook": "{n} Dokumente, jeweils abgeglichen mit dem Playbook der Rechtsabteilung",
  "Every contract was read once, completely. Each column is a clause from the playbook – the standard we compare against. Click a cell or a contract to open its file with the evidence.":
    "Jeder Vertrag wurde einmal vollständig gelesen. Jede Spalte ist eine Klausel aus dem Playbook – der Maßstab für den Abgleich. Zelle oder Vertrag anklicken, um die Vertragsakte mit Belegen zu öffnen.",
  "Playbook": "Playbook",
  "Legal's definitions as data (pipeline/catalogue.py) – changing one is a new prompt version.":
    "Definitionen der Rechtsabteilung als Daten (pipeline/catalogue.py) – jede Änderung ist eine neue Prompt-Version.",
  "Hide definitions": "Definitionen ausblenden",
  "Show definitions": "Definitionen anzeigen",
  "required for {types}": "erforderlich für {types}",
  "Document type": "Dokumenttyp",
  "Only with gaps or former names": "Nur mit Lücken oder früheren Namen",
  "Search ID or party": "ID oder Vertragspartner", // the search box shows a magnifier; longer text is cut off
  "shown": "angezeigt",
  "with a required clause missing or unclear": "mit fehlender oder unklarer Pflichtklausel",
  "still naming a former company": "nennen noch einen früheren Firmennamen",
  "faded = not required for this type": "blass = für diesen Typ nicht erforderlich",
  "dot = checks overruled the model": "Punkt = Prüfungen haben das Modell überstimmt",
  "Contract": "Vertrag",
  "Type": "Typ",
  "Date": "Datum",
  "Law": "Recht",
  "Source": "Quelle",
  "copy of {id}": "Kopie von {id}",
  "amendment of {id}": "Nachtrag zu {id}",
  "amendment, base not in register": "Nachtrag, Basisvertrag nicht im Register",
  "{n} former": "{n} frühere",
  "resolved": "bereinigt",
  "current": "aktuell",

  // ---- audit log (AuditLog.tsx)
  "Traceability": "Nachvollziehbarkeit",
  "Every run, decision and archive attempt – kept apart from the register, so it survives every rebuild.":
    "Jeder Prüflauf, jede Entscheidung und jeder Archivierungsversuch – getrennt vom Register gespeichert, damit nichts bei einem Neuaufbau verloren geht.",
  "Refresh": "Aktualisieren",
  "The audit log could not be loaded: {error}": "Das Audit-Log konnte nicht geladen werden: {error}",
  "No actions yet.": "Noch keine Aktionen.",
  "run created": "Prüflauf erstellt",
  "review recorded": "Prüfung erfasst",
  "batch confirmed": "Sammelbestätigung",
  "archive copy": "Archivkopie",
  "archive refused": "Archivierung verweigert",
  "finding review recorded": "Befundprüfung erfasst",
  "finding escalated": "Befund eskaliert",
  "found": "offen", // review state FOUND = not reviewed yet
  "in review": "in Prüfung",
  "disputed": "strittig",
  "refused by the tool gate: finding is {state}": "vom Tool-Gate verweigert: Befund ist {state}",
  "missing clause": "fehlende Klausel",
  "legacy names": "frühere Firmennamen",
  "governing law not": "abweichendes Recht",
  "duplicates": "Dubletten",
  "{n} to look at": "{n} zu prüfen",
  "routine rows {ids}": "Routinezeilen {ids}",
};

/** The text in the chosen language, with {placeholders} filled in. */
export function translate(lang: Lang, text: string, params?: Params): string {
  const s = lang === "de" ? (DE[text] ?? text) : text;
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));
}

export const LangContext = createContext<Lang>("en");
export const useLang = () => useContext(LangContext);

/** t(text, params) in the language of the current screen. */
export function useT(): T {
  const lang = useContext(LangContext);
  return (text, params) => translate(lang, text, params);
}
