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
  "Synthetic test data": "Synthetische Testdaten",
  "Register {version}": "Register {version}", // same in German
  "API offline": "API offline", // same in German
  "Language": "Sprache",
  "Signed in as": "Angemeldet als",
  "Workbench": "Workbench", // same word in German
  "Contract register": "Vertragsregister",
  "Audit log": "Audit-Log",
  "Talk": "Vortrag",
  "Back to the talk": "Zurück zum Vortrag",
  "Observations, not legal advice – lawyers decide · Synthetic and public test data (CUAD, CC BY 4.0) · Every model call is logged with its cost":
    "Beobachtungen, keine Rechtsberatung – die Rechtsabteilung entscheidet · Synthetische und öffentliche Testdaten (CUAD, CC BY 4.0) · Jeder Modellaufruf wird mit seinen Kosten protokolliert",

  // ---- labels.ts: status of a finding (long and short form)
  "Clause found": "Klausel gefunden",
  "Clause not found": "Klausel nicht gefunden",
  "Unclear – needs a look": "Unklar – bitte prüfen",
  "Former company name": "Früherer Firmenname",
  "Former name cannot be ruled out": "Früherer Name nicht auszuschließen",
  "Other governing law": "Anderes anwendbares Recht",
  "Governing law not found": "Keine Rechtswahl gefunden",
  "Duplicate": "Dublette",
  "Found": "Gefunden",
  "Not found": "Nicht gefunden",
  "Unclear": "Unklar",
  "Former name": "Alter Name",
  "Cannot rule out": "Nicht auszuschließen",
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
  "Contains text addressed to AI systems": "Enthält an KI-Systeme gerichteten Text",
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
  // warning bars for injection and scan quality (components/SafetyBar.tsx)
  "Text addressed to AI systems": "Text an KI-Systeme gerichtet",
  "Page {page} contains text addressed to AI systems, not to the contract parties – a suspected prompt injection. It is never used as evidence, and two reviewers must approve the finding.":
    "Seite {page} enthält Text, der sich an KI-Systeme richtet statt an die Vertragsparteien – Verdacht auf Prompt-Injection. Er wird nie als Beleg verwendet, und der Befund braucht die Freigabe von zwei Personen.",
  "This contract contains text addressed to AI systems, not to the contract parties – a suspected prompt injection. It is never used as evidence, and two reviewers must approve the finding.":
    "Dieser Vertrag enthält Text, der sich an KI-Systeme richtet statt an die Vertragsparteien – Verdacht auf Prompt-Injection. Er wird nie als Beleg verwendet, und der Befund braucht die Freigabe von zwei Personen.",
  "Page {page} was read by text recognition (OCR) with only {conf} % confidence. Compare the finding with the original page before relying on it.":
    "Seite {page} wurde per Texterkennung (OCR) mit nur {conf} % Sicherheit gelesen. Den Befund vor der Verwendung mit der Originalseite abgleichen.",
  "This contract was read by text recognition (OCR) with low confidence. Compare the finding with the original before relying on it.":
    "Dieser Vertrag wurde per Texterkennung (OCR) mit geringer Sicherheit gelesen. Den Befund vor der Verwendung mit dem Original abgleichen.",
  "Show page {page}": "Seite {page} zeigen",

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

  // ---- workbench start (Workbench.tsx): the portfolio today
  "Portfolio today": "Vertragsbestand heute",
  "documents in the register": "Dokumente im Register",
  "to build the register, once – every question after that is free": "für den Aufbau des Registers, einmalig – jede weitere Frage kostet nichts",
  "API not reachable – is the backend running on port 8010? ({error})": "API nicht erreichbar – läuft das Backend auf Port 8010? ({error})",
  "Loading…": "Wird geladen …",
  "Evidence": "Beleg",
  "Select a contract to see the evidence.": "Vertrag auswählen, um den Beleg zu sehen.",

  // ---- step 1: ask (AskPanel.tsx)
  "Missing clause": "Fehlende Klausel",
  "Governing law": "Anwendbares Recht",
  "Duplicates": "Dubletten",
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
  "Change question": "Frage ändern",
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
  // whole sentences per type: German needs the dative after "von"
  "{n} of {of} merchant agreements to look at": "{n} von {of} Händlerverträgen zu prüfen",
  "{n} of {of} data processing agreements to look at": "{n} von {of} Auftragsverarbeitungsverträgen zu prüfen",
  "{n} of {of} other commercial agreements to look at": "{n} von {of} sonstigen Handelsverträgen zu prüfen",
  "{n} of {of} amendments to look at": "{n} von {of} Nachträgen zu prüfen",
  "{n} of {of} documents to look at": "{n} von {of} Dokumenten zu prüfen",
  "{n} of {of} selected contracts to look at": "{n} von {of} ausgewählten Verträgen zu prüfen",
  "Every contract in scope": "Jeder Vertrag im Prüfumfang",
  "+{n} checked, nothing to report": "+{n} geprüft, nichts zu melden",
  "{n} in scope": "{n} im Prüfumfang",
  "{n} read completely, with evidence": "{n} vollständig gelesen, mit Beleg",
  "this question: {usd} · the register was built once for {total}": "diese Frage: {usd} · das Register wurde einmalig für {total} aufgebaut",
  "excluded": "ausgeschlossen",
  "checked, nothing to report": "geprüft, nichts zu melden",
  "former name already resolved by amendment {id}": "früherer Name bereits durch Nachtrag {id} bereinigt",
  "Checked, nothing to report": "Geprüft, nichts zu melden",
  "Excluded": "Ausgeschlossen",
  "{n} four eyes": "{n} mit Vier-Augen-Prüfung",
  "{n} to review": "{n} zur Prüfung",
  "{n} routine": "{n} Routine",
  // exclusion reasons: fixed templates of pipeline/portfolio.py, matched in labels.ts
  "duplicate of {id} – the original is checked": "Dublette von {id} – geprüft wird das Original",
  "amendment of {id} – read together with its base agreement": "Nachtrag zu {id} – wird zusammen mit dem Basisvertrag gelesen",
  "amendment, base agreement not in register": "Nachtrag, Basisvertrag nicht im Register",
  "document type unknown – check manually": "Dokumenttyp unbekannt – bitte von Hand prüfen",
  "not extracted (status {status})": "nicht extrahiert (Status {status})",
  "selected, but another type ({type}) – the question is about {types}": "ausgewählt, aber anderer Typ ({type}) – die Frage betrifft {types}",
  // poor scan without an exact former name: fixed templates of pipeline/queries.py (F19)
  "cannot be ruled out – poor scan (OCR confidence {conf} %, threshold {threshold} %) – a person checks":
    "nicht auszuschließen – schlechter Scan (OCR-Sicherheit {conf} %, Schwelle {threshold} %) – eine Person prüft",
  "cannot be ruled out – poor scan – a person checks": "nicht auszuschließen – schlechter Scan – eine Person prüft",

  // ---- step 3: review list (ResultList.tsx)
  "Contracts to look at": "Zu prüfende Verträge",
  "Step 3 · Review": "Schritt 3 · Prüfung",
  "{n} contracts · {open} open": "{n} Verträge · {open} offen",
  "Confirm {n} routine": "{n} Routinefälle bestätigen",
  "No contract in scope has this issue.": "Kein Vertrag im Prüfumfang ist betroffen.",
  "unknown party": "unbekannter Vertragspartner",
  "confidence {word} ({c})": "Konfidenz {word} ({c})",
  "high": "hoch",
  "medium": "mittel",
  "low": "niedrig",
  "decided": "entschieden",
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
  "text addressed to AI systems – not evidence": "an KI-Systeme gerichteter Text – kein Beleg",
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
  "match {score}, page {page}": "Übereinstimmung {score}, Seite {page}",
  "match {score}": "Übereinstimmung {score}",
  "Model proposed": "Modellvorschlag",
  "{n} checks": "{n} Prüfungen",
  "{n} checks · {failed} failed": "{n} Prüfungen · {failed} nicht bestanden",
  "Show how the register decided": "Zeigen, wie das Register entschieden hat",
  "The checks overruled the model": "Die Prüfungen haben das Modell überstimmt",
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
  "Required for this type": "Für diesen Typ erforderlich",
  "Not required for this type": "Für diesen Typ nicht erforderlich",
  "The playbook says": "Das Playbook sagt",
  "Former company names": "Frühere Firmennamen",
  "The exact search found no former company name – but this scan is too poor to prove that none is there. Read the page: confirm if it names a former company, reject if it does not.":
    "Die exakte Suche hat keinen früheren Firmennamen gefunden – aber dieser Scan ist zu schlecht, um zu beweisen, dass keiner darin steht. Die Seite lesen: bestätigen, wenn sie einen früheren Firmennamen nennt, sonst verwerfen.",
  "The exact search found no former company name – but this scan is too poor to prove that none is there. A person reads the page.":
    "Die exakte Suche hat keinen früheren Firmennamen gefunden – aber dieser Scan ist zu schlecht, um zu beweisen, dass keiner darin steht. Eine Person liest die Seite.",
  "resolved by {id}": "bereinigt durch {id}",
  "open": "offen",

  // ---- the human decision (ReviewBox.tsx, FindingReview.tsx)
  "Your decision": "Entscheidung",
  "Four-eyes principle: {done} of 2 approvals": "Vier-Augen-Prinzip: {done} von 2 Freigaben",
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
  "The clause is actually …": "Die Klausel ist tatsächlich …",
  "Cancel": "Abbrechen",
  "Confirm finding": "Befund bestätigen",
  "Reject": "Verwerfen",
  "Correct": "Korrigieren",
  "Escalate": "Eskalieren",
  "Store archive copy": "Archivkopie speichern",
  // the approval slots and the archive step (components/Approvals.tsx)
  "Decision – open": "Entscheidung – offen",
  "First approval – open": "Erste Freigabe – offen",
  "Second approval – from another person": "Zweite Freigabe – von einer anderen Person",
  "{user} escalated it to four eyes": "{user} hat zur Vier-Augen-Prüfung eskaliert",
  "Archive copy": "Archivkopie",
  "Unlocked · write-only contract storage, one copy per file": "Freigeschaltet · Vertragsablage nur mit Schreibzugriff, eine Kopie pro Datei",
  "Stays locked: the finding was not approved. The server refuses and logs every attempt.":
    "Bleibt gesperrt: Der Befund wurde nicht freigegeben. Der Server verweigert und protokolliert jeden Versuch.",
  "Unlocks after 2 approvals. Until then the server refuses and logs every attempt.":
    "Wird nach 2 Freigaben freigeschaltet. Bis dahin verweigert und protokolliert der Server jeden Versuch.",
  "Unlocks after the approval. Until then the server refuses and logs every attempt.":
    "Wird nach der Freigabe freigeschaltet. Bis dahin verweigert und protokolliert der Server jeden Versuch.",
  "Write what you checked in the evidence – then you can confirm, reject or correct.":
    "Eintragen, was im Beleg geprüft wurde – dann lässt sich bestätigen, verwerfen oder korrigieren.",
  "A routine row can be confirmed without a reason; rejecting or correcting needs one.":
    "Eine Routinezeile lässt sich ohne Begründung bestätigen; Verwerfen oder Korrigieren braucht eine.",
  "Write what you checked in the evidence – then you can confirm, reject, correct or escalate.":
    "Eintragen, was im Beleg geprüft wurde – dann lässt sich bestätigen, verwerfen, korrigieren oder eskalieren.",
  "A routine finding can be confirmed without a reason; rejecting, correcting or escalating needs one.":
    "Ein Routinebefund lässt sich ohne Begründung bestätigen; Verwerfen, Korrigieren oder Eskalieren braucht eine.",
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
  "Playbook: {n} clauses": "Playbook: {n} Klauseln",
  "Playbook clauses": "Klauseln des Playbooks",
  "Liability cap": "Haftungsgrenze",
  "Consumer terms": "Verbraucher-AGB",
  "DPA Art. 28": "AVV Art. 28",
  "Audit rights": "Auditrechte",
  "Company name": "Firmenname",
  "Legal's definitions as data (pipeline/catalogue.py) – changing one is a new prompt version.":
    "Definitionen der Rechtsabteilung als Daten (pipeline/catalogue.py) – jede Änderung ist eine neue Prompt-Version.",
  "Hide definitions": "Definitionen ausblenden",
  "Show definitions": "Definitionen anzeigen",
  "required for {types}": "erforderlich für {types}",
  "Document type": "Dokumenttyp",
  "Only with gaps or former names": "Nur mit Lücken oder früheren Namen",
  "Only with a required clause missing or unclear": "Nur mit fehlender oder unklarer Pflichtklausel",
  "Only still naming a former company": "Nur mit früherem Firmennamen",
  "Search ID or party": "ID oder Vertragspartner", // the search box shows a magnifier; longer text is cut off
  "shown": "angezeigt",
  "with a required clause missing or unclear": "mit fehlender oder unklarer Pflichtklausel",
  "still naming a former company": "nennen noch einen früheren Firmennamen",
  "former name cannot be ruled out (poor scan)": "früherer Name nicht auszuschließen (schlechter Scan)",
  "cannot rule out": "nicht auszuschließen",
  "grey = not required for this type": "grau = für diesen Typ nicht erforderlich",
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
  "Show": "Anzeigen",
  "All": "Alle",
  "Runs": "Prüfläufe",
  "Reviews": "Prüfungen",
  "Archive copies": "Archivkopien",
  "Refused": "Verweigert",
  "Reviews in the register": "Prüfungen im Register",
  "Run {id}": "Prüflauf {id}",
  "{id} · started by {who}": "{id} · gestartet von {who}",
  "{who} ran the check: {n} of {of} to look at": "{who} hat die Prüfung gestartet: {n} von {of} zu prüfen",
  "{who} ran the check: {n} to look at": "{who} hat die Prüfung gestartet: {n} zu prüfen",
  "{who} confirmed {doc}": "{who} hat {doc} bestätigt",
  "{who} rejected {doc}": "{who} hat {doc} verworfen",
  "{who} corrected {doc} to “{status}”": "{who} hat {doc} auf „{status}“ korrigiert",
  "{who} reviewed {doc}": "{who} hat {doc} geprüft",
  "{who} escalated {doc} to four eyes": "{who} hat {doc} zur Vier-Augen-Prüfung eskaliert",
  "{who} confirmed {n} routine rows at once": "{who} hat {n} Routinezeilen gesammelt bestätigt",
  "{who} confirmed 1 routine row in a batch": "{who} hat 1 Routinezeile per Sammelbestätigung bestätigt",
  "{who} stored an archive copy of {doc}": "{who} hat eine Archivkopie von {doc} gespeichert",
  "{who} tried to store an archive copy of {doc} – refused": "{who} wollte eine Archivkopie von {doc} speichern – verweigert",
  "The tool gate refused it: the finding is “{state}”, not approved.": "Das Tool-Gate hat verweigert: Der Befund ist „{state}“, nicht freigegeben.",
  // selection in the register, run over a selection (decision 75)
  "not found or unclear": "nicht gefunden oder unklar",
  "not found": "nicht gefunden",
  "unclear": "unklar",
  "clause found": "Klausel gefunden",
  "any": "alle",
  "Gaps not yet reviewed": "Lücken noch nicht geprüft",
  "Gaps reviewed": "Lücken geprüft",
  "Escalated or disputed": "eskaliert oder strittig",
  "More filters": "Weitere Filter",
  "Dated from": "Datiert ab",
  "any year": "jedes Jahr",
  "to": "bis",
  "Clause status": "Klauselstatus",
  "Review state": "Review-Status",
  "Reset filters": "Filter zurücksetzen",
  "not shown, no governing law found: {ids}": "nicht angezeigt, kein anwendbares Recht gefunden: {ids}",
  "not shown, no date found: {ids}": "nicht angezeigt, kein Datum gefunden: {ids}",
  "selected": "ausgewählt",
  "{ids} hidden by the filters": "{ids} durch die Filter ausgeblendet",
  "Check these {n} in the Workbench": "Diese {n} in der Workbench prüfen",
  "Clear selection": "Auswahl aufheben",
  "Tick contracts to check only those – or check everything shown.": "Verträge anhaken, um nur diese zu prüfen – oder alle angezeigten prüfen.",
  "Check the {n} shown in the Workbench": "Die {n} angezeigten in der Workbench prüfen",
  "Select all shown": "Alle angezeigten auswählen",
  "Select {id}": "{id} auswählen",
  "Selection": "Auswahl",
  "{n} contracts chosen in the register": "{n} Verträge im Register ausgewählt",
  "How they were chosen: {filters}": "So ausgewählt: {filters}",
  "Only these are checked. The run says so, and the audit records the list.": "Nur diese werden geprüft. Der Lauf zeigt das an, und das Audit-Log hält die Liste fest.",
  "Check all contracts instead": "Stattdessen alle Verträge prüfen",
  "Check the {n} selected contracts": "Die {n} ausgewählten Verträge prüfen",
  "{n} selected contracts": "{n} ausgewählte Verträge",
  "selected from {of}": "ausgewählt aus {of}",
  "A selection: {n} of {of} contracts, chosen by {user}. This answer covers only these – not the whole portfolio.":
    "Eine Auswahl: {n} von {of} Verträgen, ausgewählt von {user}. Diese Antwort gilt nur für sie – nicht für den ganzen Bestand.",
  "type": "Typ",
  "only": "nur",
  "dated from": "datiert ab",
  "dated to": "datiert bis",
  "clause": "Klausel",
  "clause status": "Klauselstatus",
  "review state": "Review-Status",
  "search": "Suche",
  "picked": "ausgewählt",
  "by hand": "von Hand",
  "with gaps or former names": "mit Lücken oder früheren Namen",
};

/** The text in the chosen language, with {placeholders} filled in. */
export function translate(lang: Lang, text: string, params?: Params): string {
  const s = lang === "de" ? (DE[text] ?? text) : text;
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match));
}

export const LangContext = createContext<Lang>("en");
export const useLang = () => useContext(LangContext);

// Numbers in the format of the language: 0.35 / 0,35 and $0.12 / 0,12 $. en-US for the dollar
// sign without a country prefix (en-GB would write "US$0.12").
const LOCALE: Record<Lang, string> = { en: "en-US", de: "de-DE" };
export const formatNumber = (lang: Lang, n: number, digits = 2) =>
  n.toLocaleString(LOCALE[lang], { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const formatUsd = (lang: Lang, n: number) =>
  n.toLocaleString(LOCALE[lang], { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** num(0.35) and usd(0.12) in the language of the current screen. */
export function useFormat() {
  const lang = useContext(LangContext);
  return { num: (n: number, digits = 2) => formatNumber(lang, n, digits), usd: (n: number) => formatUsd(lang, n) };
}

/** t(text, params) in the language of the current screen. */
export function useT(): T {
  const lang = useContext(LangContext);
  return (text, params) => translate(lang, text, params);
}
