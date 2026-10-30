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
Architektur · **Vorschlag** · Hauptpunkt
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
Governance · **Vorschlag** · Hauptpunkt
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
