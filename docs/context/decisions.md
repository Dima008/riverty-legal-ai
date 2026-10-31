# Decision log – export from Notion (2026-10-30)

Snapshot of the Notion database "Entscheidungen" (German, verbatim; the resource name in no. 33
is redacted). Notion stays the source of truth: log new decisions there and refresh this file.
Format: area · status · prominence in the presentation.

### 1. Erst das Problem analysieren und dokumentieren, dann die Lösung entwerfen
Vorgehen · Entschieden · Kurz erwähnen
Begründung: Nachvollziehbarkeit des Vorgehens ist Teil der Bewertung.
Verworfen: Direkt mit Architektur und Code starten.

### 2. Storage-API nur schreibend, nur für Vertragskopien, nur nach Freigabe
Architektur · Entschieden · Hauptpunkt
Begründung: „You may solely use it to store an additional copy … in a legally compliant manner“.
Verworfen: Storage-API als Datenquelle oder Ablage für Extrakte.

### 3. Ziel 100 % nachvollziehbar statt 100 % treffsicher
Analyse · Entschieden · Hauptpunkt
Begründung: OCR und LLMs sind nie fehlerfrei; Belege machen Prüfen schnell.
Verworfen: Fehlerfreiheit versprechen.

### 4. Vertragsregister vor Agent: kompilieren statt durchsuchen
Architektur · Entschieden · Hauptpunkt
Begründung: Agents scheitern an Größe und Komplexität der Umgebung; Kosten.
Verworfen: Agent durchsucht SharePoint bei jeder Anfrage live.

### 5. Negativsuche prüft jeden Vertrag einzeln, mit Abdeckungsanzeige
Architektur · Entschieden · Hauptpunkt
Begründung: Vollständigkeit bei „enthält X nicht“.
Verworfen: Reine Vektorsuche mit Top-k-Treffern.

### 6. Belegpflicht: jede Aussage mit Zitat, deterministisch gegen Quelltext geprüft
Architektur · Entschieden · Hauptpunkt
Begründung: Nachvollziehbarkeit, Schutz vor erfundenen Belegen.
Verworfen: Antworten ohne Fundstelle.

### 7. Microsoft Agent Framework, Werkzeuge als MCP-Server
Architektur · Entschieden · Hauptpunkt
Begründung: Neu (1.0 seit April 2026), passt zum Microsoft-Prinzip, über MCP austauschbar.
Verworfen: Strands (AWS-zentriert); LangGraph bleibt Fallback.

### 8. Techniken aus dem Agentic-Workshop übernehmen, Umsetzung nur auf Azure
Vorgehen · Entschieden · Nur auf Nachfrage
Begründung: Riverty ist ein Microsoft-Unternehmen.
Verworfen: AWS-Dienste aus dem Workshop.

### 9. Deterministisch zuerst, LLM nur für Sinngemäßes (Guardrail-Sandwich)
Architektur · Entschieden · Hauptpunkt
Begründung: Auditierbarkeit, Reproduzierbarkeit, Kosten.
Verworfen: Alle Schritte über das LLM.

### 10. Spezialisierte Dokument-Pipeline, multimodales Modell als Fallback
Architektur · Entschieden · Kurz erwähnen
Begründung: Menge, Kosten, Seitenkoordinaten für Belege; Handschrift braucht Fallback.
Verworfen: Alles multimodal oder nur OCR.

### 11. Azure AI Search als Hybrid-Index mit Berechtigungsfiltern
Architektur · Entschieden · Kurz erwähnen
Begründung: SharePoint-Rechte müssen gelten; Microsoft-Prinzip.
Verworfen: Eigene Vektordatenbank.

### 12. Azure Container Apps statt AKS
Architektur · Entschieden · Nur auf Nachfrage
Begründung: Kleines Team, geringer Betriebsaufwand.
Verworfen: AKS, später bei Bedarf.

### 13. Human-in-the-Loop risikobasiert statt pauschal
Prozess · Entschieden · Hauptpunkt
Begründung: Auch Menschen machen Fehler; Prüfaufwand gezielt einsetzen.
Verworfen: Alles manuell freigeben oder gar nichts.

### 14. Priorisierung vor allem nach Zeitersparnis
Analyse · Entschieden · Kurz erwähnen
Begründung: Riverty will mehr schaffen mit dem gleichen Team.
Verworfen: Priorisierung nach technischer Eleganz.

### 15. Präsentation als eigene Webseite statt Folien
Präsentation · Entschieden · Nur auf Nachfrage
Begründung: Zeigt Frontend-Kompetenz, Entscheidungen werden klickbar, nahtloser Übergang in die Demo.
Verworfen: Klassisches Foliendeck.

### 16. „Vergleichen“ im MVP als Portfolio-Vergleich, Paarvergleich als Ausbaustufe
Analyse · Entschieden · Kurz erwähnen
Begründung: Die Aufgabe belegt Vergleichen mit zwei Portfolio-Beispielen.
Verworfen: Paarvergleich zuerst.

### 17. Verträge per Metadaten-Filter auswählen, nicht per Vektorsuche
Architektur · Entschieden · Kurz erwähnen
Begründung: Nur Filter liefern eine vollständige Menge; Agent baut den Filter, Juristin bestätigt.
Verworfen: Auswahl über Embeddings oder manuelles Klicken.

### 18. Kosten jedes Laufs in der UI anzeigen
Präsentation · Entschieden · Kurz erwähnen
Begründung: Business Case greifbar machen, Kostenfrage vorwegnehmen.
Verworfen: Geschätzte Beispielkosten.

### 19. Vorgehen nach Double Diamond mit Mentoring in neun Schritten
Vorgehen · Entschieden · Kurz erwähnen
Begründung: Strukturiert, im Interview erklärbar, Fortschritt sichtbar.
Verworfen: Ungeordnetes Abarbeiten.

### 20. Testdaten: voller Mix aus synthetischen Verträgen, CUAD und Handschrift
Daten · Entschieden · Hauptpunkt
Begründung: Riverty teilt keine echten Verträge. 20 synthetische Händlerverträge (Outbound, B2B2C) plus Nachtrag, 6 Auftragsverarbeitungsverträge (Inbound), 20 echte CUAD-Verträge mit Expertenlabels (CC BY 4.0), ein handschriftlicher Vertrag. Jede richtige Antwort ist bekannt, eingebaute Fallen testen Umformulierung, Nachtrag, Seitenumbruch, Prompt Injection, Dublette, Scan.
Verworfen: Klein starten nur mit synthetischen Varianten; nur CUAD (nur Englisch).

### 21. Abweichung ist kein Rechtsverstoß: Agent meldet nur Beobachtungen
Architektur · Entschieden (von Dima bestätigt am 30.10.) · Hauptpunkt
Begründung: Aus dem Workshop-Learning „Mismatch ist nicht gleich Fraud“; rechtliche Bewertung trifft nur die Juristin.
Verworfen: Agent bewertet Wirksamkeit oder Rechtsverstöße.

### 22. Präsentation, Webseite und Code-Dokumentation auf Englisch
Präsentation · Entschieden · Nur auf Nachfrage
Begründung: Die Case Study ist auf Englisch; Riverty arbeitet international.
Verworfen: Deutsch oder gemischt.

### 23. Zeitplan verdichtet: Interview innerhalb einer Woche
Vorgehen · Entschieden · Nur auf Nachfrage
Begründung: Prototyp und Präsentation haben Vorrang; Architektur-Abfrage läuft parallel zum Bauen.
Verworfen: Alle neun Schritte nacheinander in voller Tiefe.

### 24. Code liegt in einem eigenen GitHub-Repo
Vorgehen · Entschieden · Nur auf Nachfrage
Begründung: Nachvollziehbare Historie, im Interview zeigbar, Standard für das Team.
Verworfen: Zip-Datei oder nur lokal.

### 25. Prototyp lokal, Modell über Azure Foundry (Fallback: Anthropic-API)
Architektur · **Vorschlag** · Kurz erwähnen
Begründung: Weniger als eine Woche Zeit: lokal ist schnell und demo-sicher; das Modell über Azure zeigt den Microsoft-Bezug. Free-Trial-Abos haben oft kein Modell-Kontingent, daher Pay-as-you-go oder Fallback. Modellzugriff liegt hinter einem Adapter, Wechsel ist eine Konfigurationszeile.
Verworfen: Komplett auf Azure deployen (rund ein Tag mehr, Einrichtungsrisiko).

### 26. EU-Region und EU-Datenzone für die Modelle im Betrieb
Governance · Entschieden (von Dima bestätigt am 30.10.) · Hauptpunkt
Begründung: Vertragsdaten eines europäischen Finanzinstituts; DSGVO. Zielbild für den Betrieb; im Prototyp bewusst Global Standard mit synthetischen Daten, weil das neue Abo kein EU-Kontingent hat.
Verworfen: Global Standard (Verarbeitung weltweit).

### 27. Kostenkontrolle ab Tag 1: Pay-as-you-go ohne kostenpflichtigen Support, Budget mit Warnung
Governance · Entschieden · Kurz erwähnen
Begründung: Kostenkontrolle ist Teil der Governance; Basic-Support reicht für einen Prototyp.
Verworfen: Kostenpflichtiger Supportplan; kein Budget.

### 28. Eigener, budgetierter API-Schlüssel nur für den Prototyp, Erneuerung nach dem Interview
Governance · Entschieden · Kurz erwähnen
Begründung: Schlüssel liegt nur in der lokalen .env (per .gitignore ausgeschlossen); im Repo nur .env.example mit Platzhaltern. Nach dem Interview wird der Schlüssel im Azure-Portal neu generiert. Im Betrieb: Managed Identity und Key Vault statt Schlüssel.
Verworfen: Generellen Kontoschlüssel verwenden.

### 29. Nur synthetische und öffentliche Testdaten, jedes Dokument als synthetisch gekennzeichnet
Governance · Entschieden · Kurz erwähnen
Begründung: Keine echten Vertragsdaten, keine personenbezogenen Daten; Verwechslung mit echten Verträgen ausgeschlossen.
Verworfen: Echte Verträge aus dem Netz ohne Kennzeichnung.

### 30. Lizenz der Testdaten beachtet: CUAD unter CC BY 4.0 mit Quellenangabe
Governance · Entschieden · Nur auf Nachfrage
Begründung: Saubere Nutzungsrechte auch im Prototyp.
Verworfen: Beliebige Verträge ohne Lizenzprüfung.

### 31. Repository privat, Schlüssel nie im Repo
Governance · Entschieden · Nur auf Nachfrage
Begründung: .env ist per .gitignore ausgeschlossen; nur .env.example mit Platzhaltern.
Verworfen: Öffentliches Repo.

### 32. KI-Mitarbeit im Git-Verlauf sichtbar (Co-Authored-By)
Governance · Entschieden · Kurz erwähnen
Begründung: Transparenz der KI-Nutzung, wie von Riverty ausdrücklich gewünscht.
Verworfen: KI-Anteil nicht kennzeichnen.

### 33. Netzwerkzugriff der Entwicklungsumgebung nur für benötigte Domains
Governance · Entschieden · Nur auf Nachfrage
Begründung: Least Privilege auch in der Entwicklung: freigegeben ist nur `<resource>.openai.azure.com`, nicht *.azure.com.
Verworfen: Offener Internetzugang.

### 34. Prototyp-Modell gpt-4.1-mini als Global Standard statt neuestem Modell in der EU-Datenzone
Governance · Entschieden · Kurz erwähnen
Begründung: Neues Abo hat für neueste Modelle und die EU-Datenzone kein Kontingent. Im Prototyp nur synthetische Daten ohne Personendaten, daher vertretbar. Für den Betrieb bei Riverty: EU-Datenzone über Unternehmenskontingent. Modell hinter Adapter, Wechsel per Konfiguration.
Verworfen: Auf Kontingent warten (Tage, unsicher).

### 35. Lokaler Überwachungsordner statt echtem SharePoint im Prototyp (Quellen-Adapter)
Architektur · Entschieden · Kurz erwähnen
Begründung: Echtes SharePoint braucht einen Microsoft-365-Tenant; zu viel Einrichtungszeit bis zum Interview. Gleiche Schnittstelle: im Betrieb ersetzt ein Microsoft-Graph-Connector (Delta-Abfrage oder Webhook) den Ordner, der Rest der Pipeline bleibt gleich.
Verworfen: Microsoft-365-Testtenant mit SharePoint einrichten.

### 36. Lokales Register in SQLite mit Volltext und Vektoren als Stellvertreter für PostgreSQL und Azure AI Search
Architektur · Entschieden · Nur auf Nachfrage
Begründung: Kein Betriebsaufwand im Prototyp, läuft auf jedem Laptop; Speicher hinter eigener Schnittstelle, Austausch gegen Azure-Dienste ohne Änderung der Logik.
Verworfen: Azure AI Search und PostgreSQL schon im Prototyp.

### 37. Register-Extraktion: ein Modellaufruf pro Vertrag über den ganzen Text statt Top-k-Suche
Architektur · Entschieden · Hauptpunkt
Begründung: Fehlen kann man nur beweisen, wenn man alles gelesen hat. Top-k liefert die ähnlichsten Stellen, beweist aber nie Abwesenheit. Unsere Verträge passen in einen Aufruf (größter CUAD-Vertrag ca. 15k Tokens); längere werden in Abschnittsblöcke geteilt und zusammengeführt (PRESENT gewinnt, dann UNCLEAR, sonst ABSENT). Suche (Hybrid) bleibt für Fragen ohne festen Klauseltyp.
Verworfen: Klassisches RAG mit Top-k über alle Chunks für die Negativsuche.

### 38. Vier-Augen-Prinzip für die KI: unabhängiger Prüf-Aufruf (Maker-Checker) für jede PRESENT-Aussage
Governance · Entschieden · Hauptpunkt
Begründung: Messung v1: Das Modell meldete in M08 die Datenschutzklausel als Haftungsbegrenzung, mit korrektem Zitat. Die Zitatprüfung allein fängt das nicht. Der Checker sieht nur Definition und Zitat (klein, billig, kaum Angriffsfläche für Injection) und muss zustimmen. Kosten: ca. 0,01 USD für 47 Dokumente. In v2 hat der Checker M08 unabhängig von der Begriffsprüfung abgelehnt. Bekanntes Muster aus Banken (Maker-Checker).
Verworfen: Nur Zitatprüfung; vom Modell selbst gemeldete Konfidenz.

### 39. Konfidenz aus deterministischen Signalen berechnen, nicht vom Modell erfragen
Architektur · Entschieden · Kurz erwähnen
Begründung: Selbsteinschätzungen von Sprachmodellen sind schlecht kalibriert. Stattdessen: Zitat gefunden, Begriffe der Klausel im Zitat, Checker einverstanden, Gegen-Signale bei ABSENT, OCR-Qualität, Injection-Verdacht. Jede Aussage speichert model_status (was das Modell sagte) neben status (was das Register sagt). So ist sichtbar, welche Prüfschicht was abgefangen hat.
Verworfen: Konfidenzwert als Feld in der Modellantwort.

### 40. Klauselkatalog als Daten: Legal pflegt Definitionen, jede Änderung ist eine neue Prompt-Version
Governance · Entschieden · Kurz erwähnen
Begründung: Das Playbook der Rechtsabteilung (Definition, Pflicht je Vertragstyp, Suchbegriffe) liegt in pipeline/catalogue.py und nicht versteckt im Prompt. Eine neue Prompt-Version löst automatisch eine Neuextraktion aus (Idempotenz über Text-Hash und Prompt-Version). Damit sind Änderungen prüfbar und versioniert.
Verworfen: Klauseldefinitionen frei im Prompt-Text.

### 41. Prompt Injection: Erkennung im Vertragstext, Zitate aus verdächtigen Passagen gesperrt
Governance · Entschieden · Kurz erwähnen
Begründung: Drei Schichten: Vertrag als nicht vertrauenswürdige Daten im Prompt markiert; Muster wie „ignore previous instructions“ markieren das Dokument; ein Zitat aus einer solchen Passage wird nie als Beleg akzeptiert. Getestet mit M14: Der Vertrag ohne Haftungsbegrenzung wird trotz eingeschleuster Notiz als fehlend erkannt und zur Prüfung markiert.
Verworfen: Nur Anweisung im System-Prompt.

### 42. Kleines Modell plus Prüfschichten; größeres Modell erst, wenn Messwerte es verlangen
Architektur · Entschieden · Kurz erwähnen
Begründung: gpt-4.1-mini mit Prüfschichten erreicht auf dem Goldstandard Recall und Precision 1,0 bei ca. 0,12 USD für 47 Dokumente (hochgerechnet ca. 3 USD für 1.100 Verträge einmalig). Der Modellwechsel ist eine Zeile in .env (Adapter). Ein größeres Modell würde ein Mehrfaches kosten, ohne dass die Messung es bisher verlangt.
Verworfen: Von Anfang an das größte verfügbare Modell.

### 43. Modellantworten speichern, Prüfungen ohne Modellkosten wiederholbar (Replay)
Governance · Entschieden · Nur auf Nachfrage
Begründung: Die rohe Modellantwort und das Checker-Urteil liegen im Register. python -m pipeline.run --reassess spielt die deterministischen Prüfungen neu ab. Nachvollziehbar für Audit und Revision, und Prüfregeln lassen sich ohne neue Modellaufrufe verbessern.
Verworfen: Nur das Endergebnis speichern.

### 44. Laut scheitern statt still zurückfallen (Beispiel OCR-Sprachdaten)
Prozess · Entschieden · Nur auf Nachfrage
Begründung: Beim ersten Lauf fehlten die deutschen OCR-Sprachdaten. Tesseract fiel ohne Fehlermeldung auf Englisch zurück: keine Umlaute, trotzdem 90 % Konfidenz. Gefunden nur durch Hinsehen. Jetzt prüft die Pipeline vor dem Start, ob alle Sprachen da sind, und bricht sonst ab.
Verworfen: Weiterlaufen mit Warnung im Log.

### 45. Weiterentwicklung lokal in VS Code mit Claude Code; GitHub als einzige Quelle, Notion für Entscheidungen und Mentoring
Vorgehen · Entschieden · Nur auf Nachfrage
Begründung: Die Live-Demo läuft im Interview auf dem eigenen Laptop; das Frontend braucht Live-Vorschau; Code, den man selbst ausführt, versteht und erklärt man besser (Bewertungspunkt: KI-Nutzung verstanden). CLAUDE.md im Repo gibt Claude Code den Projektkontext; docs/context/ enthält Aufgabe, Briefing und diese Entscheidungen.
Verworfen: Alles weiter in der Cloud-Sitzung bauen.

### 46. Echte Fehlerfälle in der Präsentation zeigen: ein Hauptfall (M08) mit Beleg, Ablation und Fehlerkatalog
Präsentation · Entschieden · Hauptpunkt
Begründung: Zeigt, dass wir messen, Fehler finden und an der richtigen Stelle beheben, statt Fehlerfreiheit zu behaupten. Belegt mit echten Ausgaben: M08 (KI sagt vorhanden, zwei Prüfungen widersprechen), Ablation (nur KI: Recall 0,80 bei Q1, mit Prüfungen 1,00), OCR-Stillfehler (90,8 % Konfidenz ohne Umlaute). Rahmung: Jeder Fehler erklärt eine Prüfschicht. Ehrlich dazu: am selben Testsatz verbessert, deshalb zurückgehaltener Testsatz in Schritt 6. Quelle: docs/failure-cases.md.
Verworfen: Nur Endergebnis zeigen (Recall 1,0) und Fehler weglassen.

### 47. Feste Abläufe als Projekt-Skills im Repo, Schlüsselschutz als Pre-commit-Hook statt nur als Regel
Governance · Entschieden · Kurz erwähnen
Begründung: Wiederkehrende Abläufe laufen in jeder Sitzung gleich: record-failure (Fehler sofort mit wörtlichem Beleg in docs/failure-cases.md, auch vor dem Fix), log-decision (Notion + decisions.md), run-eval (Auswertung, Vergleich mit dem letzten Lauf, Recall unter 1,0 = Fehlerfall). Die Regel „keine Schlüssel committen“ stand nur in CLAUDE.md; .githooks/pre-commit erzwingt sie deterministisch für Mensch und KI (Schlüssel, echte Azure-Endpunkte, .env-Dateien). Gleiches Prinzip wie im Produkt: Der Prompt bittet, die Prüfung erzwingt. Getestet: 3 erfundene Schlüssel blockiert, Platzhalter durchgelassen, keine Fehlalarme im Repo.
Verworfen: Nur Regeln in CLAUDE.md; eigene Subagents (jetzt noch nicht nötig, später evtl. Interviewer-Agent für die Generalprobe).

### 48. Demo-Laptop: Python 3.12 wie getestet, OCR-Sprachdaten im Benutzerordner ohne Admin-Rechte
Vorgehen · Entschieden · Nur auf Nachfrage
Begründung: Installiert war Python 3.13; Anleitung und bisherige Läufe beruhen auf 3.12, für die Demo zählt Gleichheit. Tesseract 5.4 per winget bringt nur eng/osd; deu.traineddata (tessdata_fast) liegt mit eng/osd in %LOCALAPPDATA%\Tesseract-OCR\tessdata, Verweis per TESSDATA_PREFIX in .env. Least Privilege: kein Schreiben nach Program Files nötig.
Verworfen: Python 3.13 ungetestet; Sprachdaten mit Admin-Rechten nach Program Files kopieren.

### 49. Pipeline-Explorer im Frontend: jeder Schritt mit Schaubild und echtem Beispiel aus dem Register
Präsentation · Entschieden · Hauptpunkt
Begründung: Konzepte sind in Notion erklärt, aber im Frontend-Plan fehlte ein Ort, die Schritte zu zeigen. Je Station: Schaubild, Erklärung, Live-Beispiel über dieselbe API wie die Demo (z. B. M09 Haftungsklausel über drei Seiten bleibt ein Abschnitt; M08 läuft sichtbar durch die Prüfschichten; dieselbe Frage als BM25-, Vektor- und RRF-Rangliste), zugehörige Entscheidung und Fehlerfall. Im Vortrag 2–3 Stationen live, Rest auf Nachfrage. Folge für die API: Sie liefert auch Zwischenergebnisse (Abschnitte, Prüfsignale, model_status neben status, Such-Ranglisten).
Verworfen: Erklärung nur statisch als Folie; alle Stationen gleich ausführlich (sprengt 20 Minuten).

### 50. Paketversionen auf den letzten grünen Lauf festschreiben (exakte Versionen statt Mindestversionen)
Vorgehen · Entschieden · Nur auf Nachfrage
Begründung: requirements.txt hatte nur Mindestversionen; auf dem Laptop installierte pip neue Hauptversionen (openai 3.41, PyMuPDF 2.0, numpy 2.5, pillow 13). Der Lauf damit war grün (Recall/Precision 1,0 auf Q1–Q8), also werden genau diese Versionen fixiert. Upgrade nur bewusst, danach Evaluierung. Im Betrieb: Container-Image mit Lock-Datei (siehe F9: andere Umgebung, anderer OCR-Text).
Verworfen: Mindestversionen behalten (Demo kann morgen anders laufen); vollständige Lock-Datei aller transitiven Pakete (für den Prototyp zu viel).

### 51. Widerspruch in den Metadaten macht ein Dokument nie unsichtbar: im Zweifel Vertrag statt Nachtrag, plus Prüfhinweis
Architektur · Entschieden · Kurz erwähnen
Begründung: Fehlerfall F10: Das Modell markierte den Dienstleistungsvertrag C11 als Nachtrag (doc_type sagt nein, is_amendment sagt ja). Register-Abfragen überspringen Nachträge, also verschwand C11 still aus jeder Antwort, obwohl ihm die Haftungsbegrenzung fehlt (18 von 19 sichtbar). Neue deterministische Prüfung: Nachtrag nur, wenn beide Felder übereinstimmen; sonst als Vertrag behandeln (Recall zuerst) und zur Prüfung markieren. Nachträge ohne Hauptvertrag im Register (C16) werden als unvollständige Vertragsfamilie markiert, ein Befund für Legal. Ohne Modellkosten per --reassess eingespielt; Evaluierung unverändert 1,0. Lehre: Jeder Filter, der Dokumente ausschließt, kann einen Treffer verstecken; Ausschlüsse müssen in der Abdeckungsanzeige sichtbar sein.
Verworfen: Dem Feld is_amendment vertrauen (Vertrag bleibt unsichtbar); Prompt nachschärfen und neu extrahieren (Kosten, behebt den Widerspruch nicht sicher).

### 52. Belegansicht: Server rendert das Seitenbild, Browser markiert das Zitat über die gespeicherten Wortkoordinaten (statt PDF.js)
Architektur · Entschieden · Nur auf Nachfrage
Begründung: Wortkoordinaten pro Seite liegen schon im Register (pages.words_json, aus Textschicht und OCR). Ein Seitenbild plus Markierungsrahmen funktioniert für PDF und JPEG-Scan gleich, braucht deutlich weniger Frontend-Code und keine PDF-Bibliothek im Browser.
Verworfen: PDF.js im Browser (mehr Code, Scans brauchen trotzdem eigene Darstellung).

### 53. Triage-Regel: FOUR_EYES bei Injection-Verdacht oder Metadaten-Widerspruch, REVIEW bei UNCLEAR oder Konfidenz unter 0,8, sonst CONFIRM mit Stichprobe
Prozess · Entschieden · Kurz erwähnen
Begründung: Konkretisiert Entscheidung 13 (Human-in-the-Loop risikobasiert): Prüfaufwand dort, wo ein Fehler wahrscheinlich oder ein Angriff möglich ist. Die Regel nutzt nur deterministische Signale aus dem Register, keine Selbsteinschätzung des Modells. Schwellenwert konfigurierbar.
Verworfen: Alles manuell freigeben (kein Zeitgewinn) oder nichts (kein Schutz); Triage durch das Modell.

### 54. Zwei simulierte Prüferinnen per Auswahl im UI statt echter Anmeldung; im Betrieb Entra ID
Governance · Entschieden · Nur auf Nachfrage
Begründung: Audit-Log und Vier-Augen-Prinzip brauchen unterscheidbare Personen. Echte Anmeldung braucht einen Microsoft-365-Tenant (wie Entscheidung 35). Die API liest die Person aus einem Header; im Betrieb aus dem Entra-ID-Token, Rollen aus Entra-Gruppen. Offen gesagt: Die Auswahl ist keine Sicherheit, sie zeigt nur den Ablauf.
Verworfen: Ohne Nutzer (kein Vier-Augen-Prinzip zeigbar); Testtenant mit Entra ID (Einrichtungszeit).

### 55. Planer zuerst ohne Modell (Beispielfragen und manuelle Auswahl der Prüfart), Modell-Planer mit Function Calling als letzter API-Schritt
Architektur · Entschieden · Kurz erwähnen
Begründung: Der End-to-end-Ablauf (Lauf, Abdeckung, Triage, Freigabe, Archiv) steht zuerst und ist demo-sicher. Der Modell-Planer wählt danach nur aus derselben festen Liste von Prüfarten und fragt bei Unklarheit nach; fällt er aus, bleiben die Beispielfragen. Leitsatz: so viel deterministisch wie möglich, so viel Agent wie nötig.
Verworfen: Modell-Planer zuerst (Demo hängt am Modell); freie SQL-Erzeugung durch das Modell.

### 56. Arbeitsstand (Läufe, Freigaben, Audit) in eigener Datenbank, getrennt vom erzeugten Register; jeder Lauf als Momentaufnahme
Architektur · Entschieden · Nur auf Nachfrage
Begründung: Das Register ist erzeugt und wird bei neuer Prompt-Version oder --reassess neu gebaut. Was eine Prüferin gesehen und entschieden hat, darf dabei nie verloren gehen oder sich nachträglich ändern. Deshalb var/workbench.sqlite getrennt von var/register.sqlite (in Azure: eigenes PostgreSQL-Schema mit eingeschränkten Schreibrechten). Jeder Lauf speichert Plan, Abdeckung, Zeilen mit Triage und die Register-Version als Momentaufnahme; Freigaben verweisen auf den Lauf. So zeigt das Audit immer, was tatsächlich vorlag.
Verworfen: Workflow-Tabellen im Register (gehen beim Neuaufbau verloren); nur Verweise statt Momentaufnahme (Audit zeigt den heutigen statt den damaligen Stand).

### 57. Prüf- und Archivregeln: Begründungspflicht, keine Sammelbestätigung kritischer Fälle, Uneinigkeit wird eskaliert, Archivkopie nur nach Freigabe und je Datei genau einmal
Prozess · Entschieden · Kurz erwähnen
Begründung: Setzt die Entscheidungen 2, 13 und 53 im Ablauf um. Begründung ist Pflicht bei Ablehnung, Korrektur und jeder REVIEW- oder FOUR_EYES-Zeile (Audit, Schutz vor Automation Bias). Sammelbestätigung nur für CONFIRM-Zeilen, nie für kritische Fälle oder Stichproben. Bei FOUR_EYES müssen zwei verschiedene Personen zustimmen; sind sie uneinig, wird der Fall DISPUTED und eskaliert. Die Archivkopie ist gesperrt bis zur Freigabe (Tool Gate); jede Quelldatei wird über ihren SHA-256 genau einmal abgelegt, auf beiden Seiten geprüft (Workbench und Speicher). Speicher-Mock als eigener Dienst nur mit PUT, über HTTP und Adapter angesprochen wie der echte. Getestet: Ende-zu-Ende über echtes HTTP, 342 ms, Doppelklick erzeugt keine zweite Kopie.
Verworfen: Archiv direkt nach Systemvorschlag (ohne Mensch); Hash über alle Seiten zusammen als Schlüssel (bei mehrteiligen Scans nicht pro Datei prüfbar); Mock als Funktionsaufruf statt REST-Grenze.

### 58. Frontend: eine App (Vite, React, TypeScript) mit Fluent UI v9 und Bereichen Workbench, Explorer, später Präsentation
Architektur · Entschieden · Nur auf Nachfrage
Begründung: Riverty-Stack (React, TypeScript). Fluent UI v9 ist das Designsystem von Microsoft: passt zum Microsoft-Umfeld, barrierearm, fertige Tabellen, Dialoge, Badges; wirkt sofort professionell. Eine App statt zwei: gleicher API-Client, gleiche Komponenten, nahtloser Übergang von der Erklärung in die Demo. Gestaltungsprinzipien umgesetzt: Status immer mit Symbol und Text, Juristensprache statt Technikbegriffe (labels.ts), Beleg vor Urteil (Quelle vor Entscheidung), Kosten und Abdeckung sichtbar, keine Sammelbestätigung kritischer Fälle. Geprüft mit einem automatischen Rundgang in Edge (Screenshots).
Verworfen: Schlankere Bibliothek oder eigenes CSS (mehr Bauzeit, weniger Microsoft-Bezug); getrennte Apps für Präsentation und Demo (doppelter Code).

### 59. Entwicklungsprotokoll pro Arbeitsschritt (docs/dev-log.md, fünf Punkte), per Pre-commit-Hook erzwungen; Sitzungsprotokoll in Notion am Ende jeder Sitzung
Vorgehen · Entschieden · Kurz erwähnen
Begründung: Wunsch von Dima: zu jedem Schritt Problem, Ursache, Technik und warum, verworfene Alternative, Messwert vorher und nachher. Das ist Stoff für Präsentation und Interviewfragen. Ein Arbeitsschritt ist ein Commit, der Code oder Verhalten ändert; der Pre-commit-Hook lehnt solche Commits ohne neuen Eintrag ab (SKIP_DEVLOG=1 für Kleinigkeiten). Gleiches Prinzip wie im Produkt: Der Prompt bittet, die Prüfung erzwingt. Neue Fehler zusätzlich in den Fehlerkatalog, neue Entscheidungen hierher. Am Sitzungsende kurze deutsche Zusammenfassung auf der Notion-Seite Sitzungsprotokolle (Skill session-summary).
Verworfen: Nur Regel in CLAUDE.md (nichts erzwingt sie); Claude-Code-Stop-Hook nach jeder Antwort (feuert auch mitten im Schritt).

### 60. Vertragsregister als Matrix gegen das Playbook (Zeilen Verträge, Spalten Klauseln) mit Vertragsakte als Seitenleiste
Präsentation · Entschieden · Hauptpunkt
Begründung: Beantwortet Dimas Fragen „Wo sehe ich die Verträge?“ und „Was vergleiche ich?“ auf einen Blick: Der Maßstab ist das Playbook von Legal (catalogue.py), jede Spalte eine Klausel mit Definition, Pflicht je Vertragstyp sichtbar. Zellen: gefunden / fehlt / unklar, blass wenn für den Typ nicht verlangt, Punkt wenn die Prüfungen das Modell überstimmt haben. Dazu Spalte Firmenname (offen / erledigt) – beide Pilotfragen in einer Ansicht. Klick öffnet die Vertragsakte mit Originalseite, allen Befunden, Prüfschichten und Definition. Ohne Modellaufruf. Geprüft: Matrix ergibt für Q1 genau die Gold-Antwort; 9 Händlerverträge mit Pflichtlücke = Vereinigung von Q1, Q3, Q4; 3 AV-Verträge = Q6 und Q7; 5 alte Namen = Q2.
Verworfen: Nur Ergebnisse nach einer Frage (kein Gesamtbild); Liste ohne Maßstab; Vertragsakte als eigene Seite (Kontextverlust).

### 61. Auswertung als Daten: jeder Lauf als JSON mit Konfiguration, Live-Auswertung über die API
Vorgehen · Entschieden · Nur auf Nachfrage
Begründung: Qualitätsansicht, Monitoring und Modellvergleich brauchen die Zahlen und die Konfiguration jedes Laufs (Modell, Prompt-Version). evaluate() rechnet, render() druckt den bisherigen Bericht (zeichengleich geprüft), --json speichert die Zahlen; GET /evaluation liefert Live-Auswertung plus gespeicherte Läufe mit dem ehrlichen Hinweis, dass am selben Testsatz verbessert wurde. Ein Test stellt sicher, dass Auswertung und Workbench dieselben Verträge melden.
Verworfen: Textbericht im Frontend parsen; zweite Auswertung nur für die API.

### 62. Vertragsvergleich deterministisch: Dublette gegen Original und Vertrag gegen Vertrag, Abschnitt für Abschnitt
Analyse · Entschieden · Kurz erwähnen
Begründung: Wunsch von Dima, bei Dubletten in den ähnlichen Vertrag schauen zu können; zugleich die zweite Bedeutung von „vergleichen“ (Vertrag gegen Vertrag, vgl. Entscheidung 16). Ohne Modell: Beziehung (Dublette, Familie), gleiche Datei / gleicher Text per Hash, Ähnlichkeit, Metadaten-Unterschiede, jede Playbook-Klausel für beide, Text je Abschnitt gepaart (Nummer, sonst ähnlichster Text) mit Wortunterschieden. M15 vs M01: identischer Text in anderer Datei; M01 vs M02: 92,8 %, Haftungsklausel nur 43,8 % ähnlich, aber in beiden als vorhanden erkannt.
Verworfen: Modell beschreibt Unterschiede (Kosten, kann Unterschiede erfinden); ein Diff über den ganzen Text (für Juristen unlesbar).

### 63. Monitoring aus vorhandenen Daten: Kosten, Latenz, Pipeline-Zustand, Prüflast und Korrekturquote
Governance · Entschieden · Kurz erwähnen
Begründung: Wunsch von Dima; setzt den Monitoring-Baustein aus Governance & Einführung um (Recall, Korrekturquote, Prüflast, Kosten; monatliche Durchsicht mit Legal). GET /monitoring rechnet bei Abruf aus llm_calls, Audit-Log, Workflow-Datenbank und gespeicherten Auswertungen: Aufrufe je Zweck mit Kosten, Tokens und Latenz (p50/p95/max), Dokumentstatus und Markierungen, offene und strittige Fälle, Entscheidungen und Korrekturquote, Archivkopien, Qualität je Lauf. Im Betrieb: Azure Monitor / Application Insights.
Verworfen: Eigener Metrikspeicher oder Application Insights schon im Prototyp (Aufwand); Korrekturquote nur je Lauf (verdeckt den Trend).

### 64. Modell-Evaluierung in frischen Registern: Wiederholungsläufe und Modellvergleich, Produktionsregister bleibt unberührt
Vorgehen · Entschieden · Hauptpunkt
Begründung: „Ein Lauf ist keine Messung“ (F7). eval/repeat.py baut N frische Register (REGISTER_DB, ohne Suchindex), wertet jeden Lauf wie die Produktion aus und vergleicht: Antworten je Frage und welche Befunde vor und nach den Prüfungen kippen. Ergebnis (3 Läufe + Laptop-Lauf + Cloud-Lauf): 233 von 235 Befunden stabil, nur M08 und M10 kippen, jedes falsche „vorhanden“ wird „unklar“; Recall und Precision 1,0 in allen Läufen, Modell allein bei Q1 0,6 bis 1,0. Kosten je Lauf 0,09–0,11 $ (Prompt-Caching), 101–134 s. Derselbe Aufruf mit --chat-deployment vergleicht ein anderes Modell. Dazu: Pipeline startet nicht, wenn für ein Modell kein Preis hinterlegt ist (sonst würde es als kostenlos verbucht).
Verworfen: Neu extrahieren ins Produktionsregister (Referenz geht verloren); Schwankung nur über Q1 messen; fehlender Preis nur als Warnung.

### 65. Produktionsmodell bleibt gpt-4.1-mini: gpt-4.1 bringt mit Prüfungen keinen Gewinn bei fünffachen Kosten
Architektur · Entschieden · Hauptpunkt
Begründung: Gemessen mit eval.repeat in frischen Registern, gleicher Prompt (v2), gleiche Prüfungen; gpt-4.1 auch als Checker. Beide Modelle erreichen Recall und Precision 1,0 auf Q1–Q8 in jedem Lauf. gpt-4.1 allein findet bei Q1 alle Fallen (1,0/1,0 statt 1,0/0,8/0,8) – genau das, was die Prüfungen bei mini ohnehin leisten. Dafür kostet ein Lauf 0,45–0,60 $ statt 0,09–0,11 $ (Faktor 5) und dauert 245–252 s statt 101–134 s. Die Extraktion ist stabiler (235/235), der Checker nicht (232/235 nach den Prüfungen, F11); die CUAD-Übereinstimmung sinkt auf 18/20, weil gpt-4.1 unsere Definition wörtlicher nimmt (F12). Bestätigt Entscheidung 42 mit Messwerten. Beide Modelle sind laut Microsoft abgekündigt (Recherche vom 30.10.); die Messumgebung ist das Tor für jeden Modellwechsel, der nächste Kandidat (GPT-5.x, Reasoning-Modell ohne temperature) braucht eine Adapter-Änderung.
Verworfen: gpt-4.1 als Produktionsmodell (fünffache Kosten für einen Gewinn, den die Prüfungen schon liefern); Modellwahl nach einem Lauf; nur die CUAD-Zahl vergleichen, ohne die Abweichungen zu lesen (hätte das Modell besser bewertet, das eine Klausel übersieht, F12).

### 66. Präsentation und Werkzeug als eine Webseite mit zwei Ebenen; Hash-Routing ohne Router-Bibliothek, Kapitel als Daten
Präsentation · Entschieden · Kurz erwähnen
Begründung: Wunsch von Dima: von der Fallstudie bis zum Werkzeug durch eine Seite klicken, das Werkzeug kommt am Ende. Kopfzeile mit „Case study“ | „Legal Workbench“, die Reiter des Werkzeugs als zweite Ebene. Die Adresse sagt, wo man ist (#/story/<kapitel>, #/tool/<ansicht>): jedes Kapitel lässt sich direkt öffnen, die Seite läuft auf jedem statischen Hosting. Kapitel als Daten (Akt, Titel, Leitsatz, Redezeit) – die Geschichte ändert sich an einer Stelle, die Leiste zeigt die geplante Zeit (Entwurf: 10 Kapitel, 18:45 min). Pfeiltasten und PageUp/PageDown (Presenter) nur in der Präsentation. Inhalt der Kapitel nach Freigabe der Geschichte.
Verworfen: Getrennte Folien (PowerPoint, reveal.js – zwei Dinge synchron halten, Werkzeug nicht Teil der Seite); react-router (Abhängigkeit für zwei Ebenen).

### 67. Fehler live zeigen: Schutzschichten abschalten und die gespeicherten Modellantworten auf einer Kopie des Registers neu bewerten
Präsentation · Entschieden · Hauptpunkt
Begründung: Wunsch von Dima, Probleme live zu zeigen (fehlende Prüfung, nicht genutzte Technik). Jede Schutzschicht hat einen Schalter; die gespeicherten Modellantworten laufen ohne diese Schicht durch die Prüfungen – auf einer Kopie im Arbeitsspeicher, ohne Modellaufruf, in 0,7 s, jedes Mal gleich, also sicher für die Live-Demo. Zwei Invarianten als Tests: ohne Abschalten exakt das Register; eine Schutzschicht macht das System nur vorsichtiger. Ergebnis ehrlich: Einzeln abgeschaltet bleibt Q1 bei 1,0, weil sich Vokabelprüfung und Checker überlappen (Defense in Depth); beide aus → 0,6 (M08, M10); Recall first aus → 0,6; Injection-Schutz aus → M14 ohne Vier-Augen-Prüfung; Nachtragsprüfung aus → C11 fehlt in allen Antworten.
Verworfen: Live-Modellaufrufe mit schlechtem Prompt als Hauptdemo (Kosten, Dauer, Schwankung – bleibt Option für einen Vertrag); Neuberechnung aus gespeicherten Markierungen (zweite Wahrheit); Wiederholung im Produktionsregister.

### 68. Storyline der Webseite: 10 Kapitel in 5 Akten (Why · How · Proof · Operate · Live), 17:15 min, Q1 als roter Faden (abgelöst durch 76)
Präsentation · Entschieden · Hauptpunkt
Begründung: Ergebnis eines Workflows mit drei unabhängigen Entwürfen (Story-, Demo-, Prüfer-Sicht), bewertet von zwei Jury-Agenten (Wirkung, Machbarkeit) und zusammengeführt; von Dima freigegeben. Drei rote Fäden: eine Frage (Q1) durch alle Kapitel, eine Pipeline-Karte, die mit Fehlern und Feedback-Schleife wiederkommt, fünf Testverträge als Besetzung (M18, M08, M14, C11, M15). Jedes Diagramm sagt, was es zeigt, warum es existiert und warum es so aussieht. 2:45 min Puffer für Fragen, 15-Minuten-Fassung (~13:30) vorbereitet. Hauptweg der Demo ohne Modellaufruf, mit Snapshot-Rückfall und PDF.
Verworfen: Werkzeug zuerst, Vortrag danach (Demo-Entwurf als Hauptlinie – zu wenig Herangehensweise); 18:45 min (zu wenig Puffer); Architektur vor der Pipeline (die Pipeline-Karte ist die Grundlage für Fehler- und Feedback-Bild).

### 69. Kein Modell-Umschalter im Frontend: Nur-Lese-Modellkarte und Checkliste „Modellwechsel vorschlagen“
Governance · Entschieden · Kurz erwähnen
Begründung: Ein Modellwechsel leitet jeden Befund neu ab und ist damit ein Release, keine Einstellung (Entscheidungen 40, 42, 43). Läufe sind Schnappschüsse einer Registerversion; Modelle pro Nutzer machten Antworten zweier Juristen unvergleichbar (56). Live-Aufrufe bringen Kosten, Wartezeit (p95 36 s) und Schwankung (F7) vor das Panel. Der Vergleich ist gemessen (64, 65). Stattdessen: Karte „gpt-4.1-mini · extract-v2 · Gate-Ergebnis“ und ein Knopf, der die Release-Checkliste zeigt (Auswertung, Freigabe durch Legal, gestaffelter Rollout, Rückweg).
Verworfen: Modellauswahl für Juristen; Umschalter nur für den Präsentator (Live-Risiko).

### 70. Repo-Audit umsetzen: erst die bestätigten Fehler (je Beleg, Test, Fix), dann Lesbarkeit; keine Ordner-Umzüge vor dem Interview
Vorgehen · Entschieden · Nur auf Nachfrage
Begründung: Audit-Workflow mit Gegenprüfung: 61 Punkte bestätigt, 14 verworfen, darunter echte Fehler mit Demo-Risiko (gleichzeitige API-Aufrufe → 500 und leeres Audit-Log; erneutes Einlesen entfernt die Vier-Augen-Markierung von M14; BM25-Filter liefert 0 Treffer). Fehler werden erst mit wörtlichem Beleg nachgestellt und im Fehlerkatalog aufgenommen, dann mit Test behoben. Lesbarkeit: README neu, docs/approach.md (englischer Text der Kapitel), docs/diagrams.md (Diagramm-Index), kürzerer Status in CLAUDE.md, Kommentare, die sagen, was der Code heute tut.
Verworfen: Alles auf einmal vor der Webseite (kostet einen Tag); Ordner umbauen (Risiko kurz vor der Generalprobe).

### 71. Archiv-Button bleibt klickbar, auch vor der Freigabe: der Server lehnt ab (409) und protokolliert die Ablehnung
Präsentation · Entschieden · Kurz erwähnen
Begründung: Bisher sperrte die Oberfläche den Knopf, die Server-Sperre (Tool-Gate, Entscheidungen 2, 57) wurde nie vorgeführt. Klickbar mit Schloss-Symbol und Hinweis zeigt die Demo: „Der Button ist nicht die Kontrolle, der Server ist es.“ Die Ablehnung erscheint im Audit-Log.
Verworfen: Sperre nur in der Oberfläche (beweist nichts über den Server).
Umgesetzt 31.10.: Knopf klickbar mit Schloss und Hinweis; Ablehnung „tool gate: archive copy only after approval; M03 is FOUND“ erscheint in der Oberfläche und im Audit-Log.

### 72. Held-out-Testset: 10 weitere CUAD-Verträge (Zufall mit festem Seed) und 2–4 von Dima geschriebene Verträge, vor dem ersten Lauf versiegelt
Analyse · Entschieden · Hauptpunkt
Begründung: Prompt und Prüfungen wurden am Goldstandard verbessert (Overfitting-Risiko). Von Hand geschriebene Verträge brechen die Muster des Generators (neue Fallen: Haftungsgrenze im Anhang, per Verweis, Namensvariante „arvato infoscore“). Manifest mit SHA-256 und erwarteten Antworten wird committet, bevor gemessen wird; gemessen wird einmal mit eingefrorener Konfiguration, das Ergebnis wird gezeigt, wie es kommt.
Verworfen: Nur weitere synthetische Verträge vom selben Generator; Messen vor dem Versiegeln.

### 73. Review direkt im Vertragsregister: das Review gehört zum Befund in einer Fassung (Vertrag, Klausel, Text-Hash, Prompt-Version); Läufe übernehmen es; neu „Eskalieren“
Vorgehen · Entschieden · Hauptpunkt
Begründung: Idee von Dima. Bisher hing ein Review an einem Lauf (Entscheidung 56): Wer Q1 erneut stellt, sieht M08 wieder als „zu prüfen“, obwohl zwei Juristen es schon geklärt haben. Ein Review ist eine Aussage über den Vertrag, nicht über eine Frage. Gleiche Regeln wie im Lauf (Begründung, Vier-Augen bei kritischen Befunden, DISPUTED bei Widerspruch); „Eskalieren“ schickt einen Befund mit Begründung in die Vier-Augen-Prüfung. Ändern sich Vertragstext oder Extraktion, gilt das alte Review nicht mehr und wird als „geprüft an einer früheren Fassung“ gezeigt. Die Archivkopie bleibt an den freigegebenen Lauf gebunden (57). Wirkung für die Einführung: Prüflast sinkt mit jeder Frage („reviewed once, reused in every question“). Umsetzung direkt nach den Fehlerkorrekturen.
Verworfen: Reviews nur im Lauf (doppelte Arbeit, Prüflast wächst mit jeder Frage); Review ohne Fassung (ein geändertes Ergebnis würde stillschweigend als geprüft gelten).
Umgesetzt 31.10.: Tabelle finding_reviews, api/findings.py, Läufe übernehmen Reviews derselben Fassung, Review aus dem Lauf zählt auch im Register; Eskalieren ist keine Stimme, hebt aber auf vier Augen (wer eskaliert, darf eine der zwei Stimmen abgeben – sonst bliebe der Fall mit zwei simulierten Prüfern hängen).

### 74. Werkzeug zweisprachig (Deutsch/Englisch umschaltbar), Präsentation bleibt Englisch
Präsentation · Entschieden · Kurz erwähnen
Begründung: Wunsch von Dima; Riverty's Rechtsabteilung arbeitet auf Deutsch („die Sprache der Juristen“). Kleine Übersetzungsschicht ohne Bibliothek (zwei Wörterbücher, Umschalter in der Kopfzeile, Wahl gemerkt). Vertragszitate, Playbook-Definitionen und Modell-Begründungen bleiben in der Originalsprache und sind so gekennzeichnet. Dabei wird „Missing“ zu „Not found“ / „Nicht gefunden“ (Entscheidung 21: Beobachtung, kein Urteil – von Dima am 31.10. bestätigt und umgesetzt). Die Präsentation bleibt eine englische Fassung, weil der Vortrag Englisch ist und zwei Fassungen auseinanderlaufen.
Verworfen: Alle Kapitel zweisprachig (ein Tag mehr, zwei Quellen); Werkzeug nur Deutsch (im englischen Interview liest das Panel deutsche Oberflächen).

### 75. Legal darf den Umfang eines Laufs selbst wählen: Filter und Auswahl im Register, die Auswahl wird im Lauf gespeichert und sichtbar gezeigt
Vorgehen · Entschieden · Kurz erwähnen
Begründung: Frage von Dima: „wir können ja nicht selbst ständig nach Verträgen filtern? und auswählen, welche man bearbeiten möchte? Wieso“. Juristen arbeiten oft an Teilmengen (eine Vertragspartei, ein Recht, ein Paket für Nachverhandlungen). Wer das verbietet, treibt sie zurück nach Excel. Heute filtert das Register nur nach Typ, Lücken und Suche, und ein Lauf prüft immer den ganzen Vertragstyp. Neu: Das Register bekommt mehr Filter (Recht, Datum, Review-Status, Klausel-Spalte) und Häkchen. „Diese N Verträge prüfen“ übergibt die Auswahl an die Workbench. Der Lauf speichert die Regel oder die Liste und zeigt „N von 47, ausgewählt von …“. Das Audit-Log protokolliert die Auswahl, und die Abdeckungsprüfung (Umfang = geprüft + ausgeschlossen) zählt gegen den gewählten Umfang. Risiko: Eine Teilmenge darf nie wie eine Aussage über den ganzen Bestand aussehen.
Verworfen: Nur mehr Filter im Register, ohne Läufe über eine Teilmenge; alles lassen und im Vortrag begründen.

### 76. Präsentation neu aufgebaut im Gamma-Stil: Webseite aus großen Karten (scrollen oder Present-Modus), eine Aussage pro Karte, dunkler Look, Text in den Sprechernotizen, kein Begriff vor seiner Erklärung (ersetzt den Aufbau aus Entscheidung 68)
Präsentation · Entschieden · Nur auf Nachfrage
Begründung: Kritik von Dima am 31.10.: zu viel Text, nicht intuitiv, nicht übersichtlich, nicht modern, nicht aufbauend. Beispiel: Kapitel 2 sprach von Top-k und vom Scheitern der Agenten, bevor erklärt war, was RAG, Top-k oder ein Agent ist. Jede Abbildung hatte drei Textblöcke daneben, eigentlich Sprechernotizen. Neu: 6 Akte (Aufgabe → warum Chatbot/Top-k und freie Agenten scheitern → unsere Lösung an einem Vertrag (M18) → Beweis → Betrieb → Live und Schluss), 33 Karten, ~18:30 min. Jede Karte: eine große Überschrift, ein großes Bild, höchstens eine Zeile; Bausteine erscheinen mit → bzw. spielen sich beim Scrollen ab. Wunsch von Dima: Gamma-Stil – die Präsentation ist eine Webseite aus Karten; „Present“ zeigt dieselben Karten einzeln im Vollbild; die Erklärtexte stehen in einer synchronen Referentenansicht (zweites Fenster). Dunkler Look (Wahl von Dima). Vorgehen: Akt 1 und 2 zuerst als Muster (gebaut 31.10.), dann Akt 3 bis 6 im selben Stil.
Verworfen: Bestehende Kapitel kürzen (Grundproblem Aufbau bleibt); heller oder gemischter Look; alles auf einmal umbauen.
