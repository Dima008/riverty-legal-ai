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

  // ---- labels.ts: status of a finding
  "Former company name": "Früherer Firmenname",
  "Duplicate": "Dublette",
  "Found": "Gefunden",
  "Not found": "Nicht gefunden",
  "Unclear": "Unklar",
  "Former name": "Früherer Name",
  "Cannot rule out": "Nicht auszuschließen",
  "Other law": "Anderes Recht",
  "No law found": "Keine Rechtswahl gefunden",
  // triage (TRIAGE_LABEL: the old story chapters only)
  "Routine": "Routine",
  "Review": "Prüfen",
  "Four eyes": "Vier-Augen-Prüfung",
  // the state a decision left a finding in (REVIEW_LABEL, the audit log)
  "Open": "Offen",
  "1 of 2 approvals": "1 von 2 Freigaben",
  "Confirmed": "Bestätigt",
  "Rejected": "Verworfen",
  "Corrected": "Korrigiert",
  "Escalated – four eyes": "Eskaliert – vier Augen",
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
  "All documents": "Alle Dokumente",
  "Merchant agreements": "Händlerverträge",
  "Data processing (DPA)": "Auftragsverarbeitung (AVV)",
  "Other contracts (CUAD)": "Sonstige Verträge (CUAD)",
  "Amendments": "Nachträge",
  // the checks of the guardrail sandwich (labels.ts CHECK_LABEL)
  "What the model said": "Was das Modell gesagt hat",
  "Quote found in the contract": "Zitat im Vertrag gefunden",
  "Quote not from a suspicious passage": "Zitat nicht aus einer verdächtigen Textstelle",
  "Quote uses the clause's vocabulary": "Zitat verwendet das Vokabular der Klausel",
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
  // injection and scan quality when the page is not known (components/Words.tsx whyLines)
  "Text addressed to AI systems": "Text an KI-Systeme gerichtet",
  "This contract contains text addressed to AI systems, not to the contract parties – a suspected prompt injection. It is never used as evidence, and two reviewers must approve the finding.":
    "Dieser Vertrag enthält Text, der sich an KI-Systeme richtet statt an die Vertragsparteien – Verdacht auf Prompt-Injection. Er wird nie als Beleg verwendet, und der Befund braucht die Freigabe von zwei Personen.",
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

  // ---- the Workbench (Workbench.tsx, DecideStep.tsx)
  "documents in the register": "Dokumente im Register",
  "API not reachable – is the backend running on port 8010? ({error})": "API nicht erreichbar – läuft das Backend auf Port 8010? ({error})",
  "Loading…": "Wird geladen …",
  "Select a contract to see the evidence.": "Vertrag auswählen, um den Beleg zu sehen.",

  // ---- step 1: ask (AskStep.tsx, PlanCard.tsx)
  "Governing law": "Anwendbares Recht",
  "Check": "Prüfung",
  "Clause": "Klausel",
  "Choose a clause": "Klausel auswählen",
  "Expected governing law": "Erwartetes anwendbares Recht",
  "law": "Recht",

  // ---- step 2: answer (AnswerStep.tsx)
  // whole sentences per type: German needs the dative after "von"
  "{n} of {of} merchant agreements to look at": "{n} von {of} Händlerverträgen zu prüfen",
  "{n} of {of} data processing agreements to look at": "{n} von {of} Auftragsverarbeitungsverträgen zu prüfen",
  "{n} of {of} other commercial agreements to look at": "{n} von {of} sonstigen Handelsverträgen zu prüfen",
  "{n} of {of} amendments to look at": "{n} von {of} Nachträgen zu prüfen",
  "{n} of {of} documents to look at": "{n} von {of} Dokumenten zu prüfen",
  "Every contract in scope": "Jeder Vertrag im Prüfumfang",
  "+{n} read, nothing to report": "+{n} gelesen, nichts zu melden",
  "{n} read completely, with evidence": "{n} vollständig gelesen, mit Beleg",
  "excluded": "ausgeschlossen",
  "former name already resolved by amendment {id}": "früherer Name bereits durch Nachtrag {id} bereinigt",
  "Excluded": "Ausgenommen",
  // exclusion reasons: fixed templates of pipeline/portfolio.py, matched in labels.ts
  "duplicate of {id} – the original is checked": "Dublette von {id} – geprüft wird das Original",
  "amendment of {id} – read together with its base agreement": "Nachtrag zu {id} – wird zusammen mit dem Basisvertrag gelesen",
  "amendment, base agreement not in register": "Nachtrag, Basisvertrag nicht im Register",
  "document type unknown – check manually": "Dokumenttyp unbekannt – bitte von Hand prüfen",
  "selected, but another type ({type}) – the question is about {types}": "ausgewählt, aber anderer Typ ({type}) – die Frage betrifft {types}",
  // poor scan without an exact former name: fixed templates of pipeline/queries.py (F19)
  "cannot be ruled out – poor scan (OCR confidence {conf} %, threshold {threshold} %) – a person checks":
    "nicht auszuschließen – schlechter Scan (OCR-Sicherheit {conf} %, Schwelle {threshold} %) – eine Person prüft",
  "cannot be ruled out – poor scan – a person checks": "nicht auszuschließen – schlechter Scan – eine Person prüft",

  // ---- the list "To look at" (ToLookAt.tsx)
  "No contract in scope has this issue.": "Kein Vertrag im Prüfumfang ist betroffen.",
  "unknown party": "unbekannter Vertragspartner",

  // ---- evidence and contract file (DecideStep.tsx, ContractFile.tsx, PageView.tsx, Finding.tsx)
  "Unknown party": "Unbekannter Vertragspartner",
  "no date": "kein Datum",
  "{law} law": "Recht: {law}",
  "law not found": "keine Rechtswahl gefunden",
  "family {ids}": "Vertragsfamilie {ids}",
  "Original document": "Originaldokument",
  "Model's reason: {reason}": "Begründung des Modells: {reason}",
  "How the register decided": "Wie das Register entschieden hat",
  "page {n}": "Seite {n}",
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
  "Checks applied to this finding": "Kontrollen dieses Befunds",
  "passed": "bestanden",
  "failed": "nicht bestanden",
  "found in the text: …{text}…": "im Text gefunden: …{text}…",
  "match {score}, page {page}": "Übereinstimmung {score}, Seite {page}",
  "match {score}": "Übereinstimmung {score}",
  "The checks overruled the model": "Die Kontrollen haben das Modell überstimmt",
  "confidence {c}": "Konfidenz {c}",
  "Close": "Schließen",
  "Loading the contract file…": "Vertragsakte wird geladen …",
  "Family:": "Vertragsfamilie:",
  "Copies:": "Kopien:",
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

  // ---- the human decision (components/DecisionPanel.tsx)
  "Your decision": "Ihre Entscheidung",
  "Four-eyes principle: {done} of 2 approvals": "Vier-Augen-Prinzip: {done} von 2 Freigaben",
  "{done} of 1 decision": "{done} von 1 Entscheidung",
  "confirmed": "bestätigt",
  "rejected": "verworfen",
  "corrected": "korrigiert",
  "escalated": "eskaliert",
  "present": "vorhanden",
  "absent": "nicht vorhanden",
  "from the register": "aus dem Register",
  "in another answer ({id})": "in einer anderen Antwort ({id})",
  "Reason (optional)": "Begründung (optional)",
  "Continue as {user}": "Weiter als {user}",
  "Reason (required)": "Begründung (erforderlich)",
  "Cancel": "Abbrechen",
  "Confirm finding": "Befund bestätigen",
  "Reject": "Verwerfen",
  "Correct": "Korrigieren",
  "Store archive copy": "Archivkopie speichern",
  // the approval slots and the archive step (components/Approvals.tsx)
  "Decision – open": "Entscheidung – offen",
  "First approval – open": "Erste Freigabe – offen",
  "Second approval – from another person": "Zweite Freigabe – von einer anderen Person",
  "{user} escalated it to four eyes": "{user} hat zur Vier-Augen-Prüfung eskaliert",
  "Archive copy": "Archivkopie",
  "Stays locked: the finding was not approved. The server refuses and logs every attempt.":
    "Bleibt gesperrt: Der Befund wurde nicht freigegeben. Der Server verweigert und protokolliert jeden Versuch.",
  "{file}: {status} (receipt {id})": "{file}: {status} (Quittung {id})",
  "stored": "gespeichert",
  "already stored": "bereits gespeichert",
  "already archived": "bereits archiviert",
  "approved by {names}": "freigegeben von {names}",

  // ---- contract register (Register.tsx)
  "Text": "Text", // same in German
  "Scan": "Scan", // same in German
  "Photo scan": "Fotoscan",
  " – required for this type": " – für diesen Typ erforderlich",
  " – not required for this type": " – für diesen Typ nicht erforderlich",
  "Loading the register…": "Register wird geladen …",
  "Playbook: {n} clauses": "Playbook: {n} Klauseln",
  "Playbook clauses": "Klauseln des Playbooks",
  "Liability cap": "Haftungsgrenze",
  "Consumer terms": "Verbraucher-AGB",
  "DPA Art. 28": "AVV Art. 28",
  "Audit rights": "Auditrechte",
  "Legal's definitions as data (pipeline/catalogue.py) – changing one is a new prompt version.":
    "Definitionen der Rechtsabteilung als Daten (pipeline/catalogue.py) – jede Änderung ist eine neue Prompt-Version.",
  "required for {types}": "erforderlich für {types}",
  "Document type": "Dokumenttyp",
  "Only with gaps or former names": "Nur mit Lücken oder früheren Namen",
  "Only with a required clause not found or unclear": "Nur mit nicht gefundener oder unklarer Pflichtklausel",
  "Only still naming a former company": "Nur mit früherem Firmennamen",
  "Search ID or party": "ID oder Vertragspartner", // the search box shows a magnifier; longer text is cut off
  "shown": "angezeigt",
  "cannot rule out": "nicht auszuschließen",
  "grey = not required for this type": "grau = für diesen Typ nicht erforderlich",
  "Contract": "Vertrag",
  "Type": "Typ",
  "Date": "Datum",
  "Law": "Recht",
  "Source": "Quelle",
  "copy of {id}": "Kopie von {id}",
  "amendment of {id}": "Nachtrag zu {id}",
  "resolved": "bereinigt",
  "current": "aktuell",

  // ---- audit log (AuditLog.tsx)
  "Traceability": "Nachvollziehbarkeit",
  "Every question, decision and archive attempt – kept apart from the register, so it survives every rebuild.":
    "Jede Frage, jede Entscheidung und jeder Archivierungsversuch – getrennt vom Register gespeichert, damit nichts bei einem Neuaufbau verloren geht.",
  "Refresh": "Aktualisieren",
  "The audit log could not be loaded: {error}": "Das Audit-Log konnte nicht geladen werden: {error}",
  "No actions yet.": "Noch keine Aktionen.",
  "Show": "Anzeigen",
  "All": "Alle",
  "Archive copies": "Archivkopien",
  "Refused": "Verweigert",
  "Decisions on single findings": "Entscheidungen zu einzelnen Befunden",
  "Question {id}": "Frage {id}",
  "Your own question": "Eigene Frage",
  "{id} · started by {who}": "{id} · gestartet von {who}",
  "{who} asked: {n} to look at": "{who} hat gefragt: {n} zu prüfen",
  "{who} confirmed {doc}": "{who} hat {doc} bestätigt",
  "{who} rejected {doc}": "{who} hat {doc} verworfen",
  "{who} corrected {doc} to “{status}”": "{who} hat {doc} auf „{status}“ korrigiert",
  "{who} reviewed {doc}": "{who} hat {doc} geprüft",
  "{who} escalated {doc} to four eyes": "{who} hat {doc} zur Vier-Augen-Prüfung eskaliert",
  "{who} confirmed {n} rows at once": "{who} hat {n} Zeilen auf einmal bestätigt",
  "{who} confirmed 1 row at once": "{who} hat 1 Zeile auf einmal bestätigt",
  "{who} stored an archive copy of {doc}": "{who} hat eine Archivkopie von {doc} gespeichert",
  "{who} tried to store an archive copy of {doc} – refused": "{who} wollte eine Archivkopie von {doc} speichern – verweigert",
  "Refused by the server: the finding is “{state}”, not approved.": "Vom Server abgelehnt: Der Befund ist „{state}“, nicht freigegeben.",
  // register filters and how a selection was made (decision 75, filters.ts, labels.ts scopeText)
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
  "Reset filters": "Filter zurücksetzen",
  "not shown, no governing law found: {ids}": "nicht angezeigt, kein anwendbares Recht gefunden: {ids}",
  "not shown, no date found: {ids}": "nicht angezeigt, kein Datum gefunden: {ids}",
  "type": "Typ",
  "only": "nur",
  "dated from": "datiert ab",
  "dated to": "datiert bis",
  "clause": "Klausel",
  "clause status": "Klauselstatus",
  "review state": "Review-Status",
  "search": "Suche",
  "picked": "ausgewählt",

  // ==== The redesign (spec section 3, decision 91): Register = look up, Workbench = Ask · Answer · Decide.
  // German de-collision (3.6): the step is "Entscheiden", the triage level "Prüfen", four eyes "Vier Augen",
  // the guardrails "Kontrollen"; a run is a "Frage" with an "Antwort".
  // ---- labels.ts: what the text says, the next step, why a person looks
  "Other law ({law})": "Anderes Recht ({law})",
  "Copy": "Kopie",
  "A second model call agrees": "Ein zweiter Modellaufruf stimmt zu",
  "Confirm": "Bestätigen",
  "Spot check": "Stichprobe",
  "Four eyes · {done} of 2": "Vier Augen · {done} von 2",
  "Confirmed ✓": "Bestätigt ✓",
  "Corrected → {status}": "Korrigiert → {status}",
  "Reviewers disagree": "Uneinig",
  "Text addressed to AI systems (page {page})": "Text an KI-Systeme (Seite {page})",
  "Text addressed to AI systems on page {page}. It is never used as evidence, so two people approve.":
    "Text an KI-Systeme auf Seite {page}. Er wird nie als Beleg verwendet, deshalb geben zwei Personen frei.",
  "The amendment contradicts the contract": "Nachtrag widerspricht dem Vertrag",
  "{amendment} says something different from the register – two people approve.":
    "{amendment} sagt etwas anderes als das Register – zwei Personen geben frei.",
  "Escalated by {user}": "Eskaliert von {user}",
  "{user} asked for a second person: “{reason}”": "{user} hat eine zweite Person hinzugezogen: „{reason}“",
  "Poor scan (OCR {conf} %)": "Schlechter Scan (OCR {conf} %)",
  "Poor scan: page {page} was read by text recognition with only {conf} % confidence. Compare with the page.":
    "Schlechter Scan: Seite {page} wurde per Texterkennung mit nur {conf} % Sicherheit gelesen. Mit der Seite abgleichen.",
  "The text hints at the clause": "Der Text deutet auf die Klausel hin",
  "The model found nothing, but the text mentions …{snippet}… – read the highlighted passage.":
    "Das Modell hat nichts gefunden, aber der Text erwähnt …{snippet}… – die markierte Textstelle lesen.",
  "Base agreement not in the register": "Grundvertrag nicht im Register",
  "The register is not sure ({c})": "Das Register ist unsicher ({c})",
  "The register is not sure (confidence {c}; a person looks below 0.80).":
    "Das Register ist unsicher (Konfidenz {c}; unter 0,80 sieht eine Person hin).",
  "No governing law found": "Keine Rechtswahl gefunden",
  "Picked at random for a spot check": "Zufällig für eine Stichprobe gewählt",
  "Picked at random: look at the page before you confirm.": "Zufällig gewählt: vor dem Bestätigen die Seite ansehen.",
  "the quote is not in the contract": "das Zitat steht nicht im Vertrag",
  "the quote does not fit the clause": "das Zitat passt nicht zur Klausel",
  "the quote comes from text addressed to AI systems": "das Zitat stammt aus Text an KI-Systeme",
  "a second model call disagreed": "ein zweiter Modellaufruf hat widersprochen",
  "the second model call is missing": "der zweite Modellaufruf fehlt",
  "the text hints at the clause": "der Text deutet auf die Klausel hin",
  "The checks overruled the model. The model said {model}.": "Die Kontrollen haben das Modell überstimmt. Das Modell sagte „{model}“.",
  "The checks overruled the model. The model said {model}, but {reasons}.":
    "Die Kontrollen haben das Modell überstimmt. Das Modell sagte „{model}“, aber {reasons}.",
  ", and ": " und ",
  // per contract (3.4)
  "the model is reading it …": "das Modell liest ihn …",
  "could not be read – a person reads it": "nicht gelesen – eine Person liest ihn",
  "New": "Neu",
  "poor scan (OCR {conf} %)": "schlechter Scan (OCR {conf} %)",
  "poor scan": "schlechter Scan",
  "amendment, base not in the register": "Nachtrag, Grundvertrag fehlt",
  "1 former name": "1 früherer Name",
  "{n} former names": "{n} frühere Namen",
  "type not known yet": "Typ noch unbekannt",
  "confirmed by Legal": "von Legal bestätigt",
  "Legal disagrees": "Legal widerspricht",
  "in review": "in Prüfung",
  // the New strip and the register pill: the live-add card's words
  "poor scan → a person": "schlechter Scan → eine Person",
  "not found: {clauses}": "nicht gefunden: {clauses}",
  "unclear → a person: {clauses}": "unklar → eine Person: {clauses}",
  "former name: cannot be ruled out – a person checks": "früherer Name: nicht auszuschließen – eine Person prüft",
  "hidden instruction → four eyes": "versteckte Anweisung → vier Augen",
  "arrived {time}": "eingegangen {time}",
  "{n} contracts": "{n} Verträge",
  "{n} new": "{n} neu",
  "{id}: the model is reading it …": "{id}: das Modell liest ihn …",
  "{id} could not be read": "{id} nicht gelesen",
  "1 new contract: {ids}": "1 neuer Vertrag: {ids}",
  "{n} new contracts: {ids}": "{n} neue Verträge: {ids}",
  "New in the register": "Neu im Register",
  "New in the register – last 24 hours": "Neu im Register – letzte 24 Stunden",
  "Open file": "Akte öffnen",
  "Show new in the register": "Neue im Register zeigen",
  "+{n} more in the register ›": "+{n} weitere im Register ›",
  // steps and the work bar (3.5)
  "Ask": "Fragen",
  "Answer": "Antwort",
  "Decide": "Entscheiden",
  "Up to date · asked {time}": "Aktuell · gefragt {time}",
  "Out of date: {ids} arrived after this answer": "Veraltet: {ids} nach dieser Antwort eingegangen",
  "Out of date: {ids} arrived after this answer – the model is still reading it":
    "Veraltet: {ids} nach dieser Antwort eingegangen – das Modell liest noch",
  "Out of date: {ids} has been read since": "Veraltet: {ids} inzwischen gelesen",
  "Out of date: {ids} was removed from the register": "Veraltet: {ids} aus dem Register entfernt",
  "Ask again": "Erneut fragen",
  "Decisions on clauses carry over; decisions on former names, law and copies are asked again.":
    "Entscheidungen zu Klauseln bleiben bestehen; zu früheren Namen, Recht und Kopien wird neu entschieden.",
  "From the register › Decide · {doc} · {clause}": "Aus dem Register › Entscheiden · {doc} · {clause}",
  "Back to the register": "Zurück zum Register",
  "Back to the register →": "Zurück zum Register →",
  "This answer is not in the workflow database.": "Diese Antwort ist nicht in der Workflow-Datenbank.",
  // step 1 · Ask: every question in one box (decision 93), the case study's two tagged "Pilot"
  "Pilot": "Pilot",
  "Clause not found": "Klausel nicht gefunden",
  "Copies": "Kopien",
  "What do you want to know about the contracts?": "Was möchten Sie über die Verträge wissen?",
  "Pick a question. You see the plan – which contracts, which check – before anything runs.":
    "Wählen Sie eine Frage. Bevor etwas läuft, sehen Sie den Plan – welche Verträge, welche Abfrage.",
  "Build your own question": "Eigene Frage bauen",
  "Question type": "Fragetyp",
  "Choose a question type": "Fragetyp auswählen",
  "Your plan": "Ihr Plan",
  "Nothing runs before you confirm it.": "Nichts läuft, bevor Sie ihn bestätigen.",
  "Question": "Frage",
  "Contracts": "Verträge",
  "In scope": "Im Umfang",
  "Cost": "Kosten",
  "register query · no model call · $0": "Registerabfrage · kein Modellaufruf · 0 $",
  "Confirm the plan": "Plan bestätigen",
  "Pick a question first": "Zuerst eine Frage wählen",
  "Choose the clause": "Klausel wählen",
  "No contract matches these filters.": "Kein Vertrag passt zu diesen Filtern.",
  "{clause} – not found or unclear": "{clause} – nicht gefunden oder unklar",
  "Not governed by {law} law": "Nicht nach {law}-Recht",
  "Copies (duplicates)": "Kopien (Dubletten)",
  "every document": "jedes Dokument",
  "every merchant agreement": "jeder Händlervertrag",
  "every data processing agreement": "jeder Auftragsverarbeitungsvertrag",
  "every other commercial agreement": "jeder sonstige Handelsvertrag",
  "every amendment": "jeder Nachtrag",
  "{n} of {of} documents": "{n} von {of} Dokumenten",
  "{n} of {of} merchant agreements": "{n} von {of} Händlerverträgen",
  "{n} of {of} data processing agreements": "{n} von {of} Auftragsverarbeitungsverträgen",
  "{n} of {of} other commercial agreements": "{n} von {of} sonstigen Handelsverträgen",
  "{n} of {of} amendments": "{n} von {of} Nachträgen",
  "Narrow down": "Eingrenzen",
  "Contract type": "Vertragstyp",
  "Party or IDs": "Vertragspartner oder IDs",
  "M03, M08 or a party": "M03, M08 oder ein Vertragspartner",
  "Use {every} instead": "Stattdessen: {every}",
  "{ids} (opened from the register)": "{ids} (aus dem Register geöffnet)",
  "{id} will be excluded: {reason}": "{id} wird ausgenommen: {reason}",
  "kept in, the filter cannot judge them: {list}": "einbezogen, der Filter kann sie nicht beurteilen: {list}",
  "{id}: not read yet – it will be listed, not checked": "{id}: noch nicht gelesen – wird aufgeführt, nicht geprüft",
  "kept in": "einbezogen",
  // why a filter keeps a contract it cannot judge (filters.ts applyScope)
  "not read yet": "noch nicht gelesen",
  "could not be read": "nicht lesbar",
  "type not known": "Typ unbekannt",
  "no law found": "keine Rechtswahl gefunden",
  "no date found": "kein Datum gefunden",
  // step 2 · Answer
  "Read, nothing to report": "Gelesen, nichts zu melden",
  "not read yet – listed, not checked": "noch nicht gelesen – aufgeführt, nicht geprüft",
  "{n} in scope ({types})": "{n} im Umfang ({types})",
  "{id} excluded: {reason}": "{id} ausgenommen: {reason}",
  "this question: {usd} – reading every contract cost {total}, once": "diese Frage: {usd} – das Lesen aller Verträge kostete einmalig {total}",
  "A selection: {part} ({filters}) – this answer covers only these.": "Eine Auswahl: {part} ({filters}) – diese Antwort gilt nur für sie.",
  "(older answer – quiet contracts summarised)": "(ältere Antwort – unauffällige Verträge zusammengefasst)",
  "No contract in scope has this issue – {n} read, {k} excluded ({ids}).":
    "Kein Vertrag im Umfang ist betroffen – {n} gelesen, {k} ausgenommen ({ids}).",
  "To look at": "Zu prüfen",
  "The register says": "Das Register sagt",
  "Why a person looks": "Warum eine Person hinsieht",
  "Next step": "Nächster Schritt",
  "All {n}": "Alle {n}",
  "Open {n}": "Offen {n}",
  "New {n}": "Neu {n}",
  "Showing {n} of {of}": "{n} von {of} angezeigt",
  "Show all": "Alle anzeigen",
  "Confirm {n} at once": "{n} auf einmal bestätigen",
  "{ids} – only rows marked Confirm; spot checks are opened one by one.":
    "{ids} – nur Zeilen mit „Bestätigen“; Stichproben werden einzeln geöffnet.",
  "Decide →": "Entscheiden →",
  // step 3 · Decide
  "{n} to decide · {open} open": "{n} zu entscheiden · {open} offen",
  "more ↓": "mehr ↓",
  "No passage: the model read the whole contract and found no such clause.":
    "Keine Textstelle: Das Modell hat den ganzen Vertrag gelesen und keine solche Klausel gefunden.",
  "The register read: {law} law": "Das Register hat gelesen: Recht {law}",
  "Copy of {id}": "Kopie von {id}",
  "Copy of {id} – the original is checked; this copy is not counted twice.":
    "Kopie von {id} – geprüft wird das Original; diese Kopie wird nicht doppelt gezählt.",
  "Open {id} →": "{id} öffnen →",
  "{n} checks passed": "{n} Kontrollen bestanden",
  "{failed} of {n} checks failed": "{failed} von {n} Kontrollen nicht bestanden",
  "The model said {status}": "Das Modell sagte „{status}“",
  "An observation about the text, not a legal assessment.": "Eine Beobachtung zum Text, keine rechtliche Bewertung.",
  "Legal: not decided yet": "Legal: noch nicht entschieden",
  "Confirmed by {names}, {when} (in the Workbench)": "Bestätigt von {names}, {when} (in der Workbench)",
  "Rejected by {names}, {when}": "Verworfen von {names}, {when}",
  "Corrected by {names}, {when}": "Korrigiert von {names}, {when}",
  "In review – {done} of 2 approvals": "In Prüfung – {done} von 2 Freigaben",
  "Decide in the Workbench →": "In der Workbench entscheiden →",
  "Confirm · one person, no reason needed": "Bestätigen · eine Person, ohne Begründung",
  "Review · one person, with a reason": "Prüfen · eine Person, mit Begründung",
  "Four eyes · two people, each with a reason": "Vier Augen · zwei Personen, jede mit Begründung",
  "From another person – open": "Von einer anderen Person – offen",
  "What did you check on the page?": "Was haben Sie auf der Seite geprüft?",
  "The contract …": "Der Vertrag …",
  "does contain it": "enthält sie",
  "does not contain it": "enthält sie nicht",
  "Not sure? Ask for a second person": "Unsicher? Zweite Person hinzuziehen",
  "Needs a reason: what should the second person look at?": "Braucht eine Begründung: Worauf soll die zweite Person achten?",
  "You approved. The second approval must come from another person.":
    "Sie haben freigegeben. Die zweite Freigabe muss von einer anderen Person kommen.",
  "Demo stand-in for a second person signing in (Entra ID). The server still refuses the same person twice.":
    "Demo-Ersatz für die Anmeldung einer zweiten Person (Entra ID). Der Server lehnt dieselbe Person beim zweiten Mal weiterhin ab.",
  "Archive copy – after the approval": "Archivkopie – nach der Freigabe",
  "Archive copy – after 2 approvals": "Archivkopie – nach 2 Freigaben",
  "The two decisions differ. Nothing is archived.": "Die beiden Entscheidungen weichen ab. Es wird nichts archiviert.",
  "The archive copy is made from an answer – ask the question in the Workbench.":
    "Die Archivkopie entsteht aus einer Antwort – stellen Sie die Frage in der Workbench.",
  // server refusals in lawyers' words (D17, labels.ts serverMessage)
  "Refused by the server: the archive copy needs 1 approval ({done} so far). The attempt is in the audit log.":
    "Vom Server abgelehnt: Die Archivkopie braucht 1 Freigabe (bisher {done}). Der Versuch steht im Audit-Log.",
  "Refused by the server: the archive copy needs {k} approvals ({done} so far). The attempt is in the audit log.":
    "Vom Server abgelehnt: Die Archivkopie braucht {k} Freigaben (bisher {done}). Der Versuch steht im Audit-Log.",
  "Refused by the server: the finding was not approved, so there is no archive copy. The attempt is in the audit log.":
    "Vom Server abgelehnt: Der Befund wurde nicht freigegeben, daher gibt es keine Archivkopie. Der Versuch steht im Audit-Log.",
  "You already decided. The second decision must come from another person.":
    "Sie haben schon entschieden. Die zweite Entscheidung muss von einer anderen Person kommen.",
  "Already escalated – two people decide now.": "Bereits eskaliert – jetzt entscheiden zwei Personen.",
  "Already decided ({state}) – reload to see it.": "Bereits entschieden ({state}) – neu laden.",
  // contract register (look up)
  "{n} contracts, each compared with Legal's playbook": "{n} Verträge, jeweils mit dem Playbook der Rechtsabteilung abgeglichen",
  "Look up any contract: what it says about each playbook clause, with the page. Decisions are made in the Workbench.":
    "Jeden Vertrag nachschlagen: was er zu jeder Klausel des Playbooks sagt, mit der Seite. Entschieden wird in der Workbench.",
  "{id} arrived at {time} – the model is reading it. Its findings appear in a few seconds.":
    "{id} ist um {time} eingegangen – das Modell liest ihn. Die Befunde erscheinen in wenigen Sekunden.",
  "Legal's decision": "Entscheidung von Legal",
  "{n} with a required clause not found or unclear": "{n} mit nicht gefundener oder unklarer Pflichtklausel",
  "{n} to check for a former name ({open} name one · {unsure} cannot be ruled out)":
    "{n} auf frühere Namen zu prüfen ({open} mit Namen · {unsure} nicht auszuschließen)",
  "being read: {n}": "wird gerade gelesen: {n}",
  "Ask in the Workbench →": "In der Workbench fragen →",
  "Ask in the Workbench: {question} →": "In der Workbench fragen: {question} →",
  "Carries type, law, dates and search; a clause becomes the question. Result filters (only gaps, Legal's decision) stay here.":
    "Übernimmt Typ, Recht, Daten und Suche; eine Klausel wird zur Frage. Ergebnisfilter (nur Lücken, Entscheidung von Legal) bleiben hier.",
  // contract file (read-only)
  "arrived {date}": "eingegangen {date}",
  "Arrived {time} – the model is reading it …": "Eingegangen {time} – das Modell liest ihn …",
  "Reading failed – a person reads the page.": "Lesen fehlgeschlagen – eine Person liest die Seite.",
  "cannot be ruled out – poor scan (OCR {conf} %, threshold {threshold} %)":
    "nicht auszuschließen – schlechter Scan (OCR {conf} %, Schwelle {threshold} %)",
  "Ask about former names for this contract in the Workbench →": "In der Workbench nach früheren Namen dieses Vertrags fragen →",
  // audit log
  "Questions": "Fragen",
  "Decisions": "Entscheidungen",
  "Register": "Register", // same in German
  "Register (pipeline)": "Register (Pipeline)",
  "Open the answer →": "Antwort öffnen →",
  "{who} asked: {n} of {of} to look at": "{who} hat gefragt: {n} von {of} zu prüfen",
  "Archive copy of {doc} refused: needs 1 approval ({done} so far)": "Archivkopie von {doc} verweigert: braucht 1 Freigabe (bisher {done})",
  "Archive copy of {doc} refused: needs {k} approvals ({done} so far)": "Archivkopie von {doc} verweigert: braucht {k} Freigaben (bisher {done})",
  "{id} arrived – {details}": "{id} eingegangen – {details}",
  "1 page": "1 Seite",
  "{n} pages": "{n} Seiten",
  "{id} read by the model ({model}, {prompt})": "{id} vom Modell gelesen ({model}, {prompt})",
  "{id}: reading failed – {error}": "{id}: Lesen fehlgeschlagen – {error}",
  "{id}: could not be taken in – {error}": "{id}: Einlesen fehlgeschlagen – {error}",
  "{id} removed from the register": "{id} aus dem Register entfernt",
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
