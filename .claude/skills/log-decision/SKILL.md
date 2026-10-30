---
name: log-decision
description: Log a project decision (architecture, library, model, region, data, process, presentation - small ones too) in the Notion database "Entscheidungen" and in docs/context/decisions.md. Use whenever Dima decides something or a choice between alternatives is made during implementation.
---

# Log a decision

Every decision is logged right away with reason, rejected alternative and prominence in the
presentation (CLAUDE.md). Notion is the source of truth, `docs/context/decisions.md` is the export.

## Fields

Notion data source: `collection://00cee8d8-e41a-46dc-959e-06ea9499c9b2` (database "Entscheidungen"
on the page "Riverty Case Study"). Entries are written in **German**, like the existing ones.

| Property | Value |
| --- | --- |
| Entscheidung (title) | the decision as one sentence |
| Bereich | Vorgehen, Analyse, Daten, Architektur, Prozess, Präsentation, Governance |
| Status | `Entschieden` if Dima decided or accepted it, otherwise `Vorschlag` |
| In Präsentation | Hauptpunkt, Kurz erwähnen, Nur auf Nachfrage |
| Begründung | why, with measured numbers where there are any |
| Verworfene Alternative | what was rejected, in a few words |
| Datum | today (ISO date) |

`Nr` is assigned by Notion.

## Steps

1. Create the entry with the Notion tools (parent = the data source above). Read back its `Nr`.
2. Append the same entry to `docs/context/decisions.md` in the existing format:

   ```
   ### <Nr>. <Entscheidung>
   <Bereich> · <Status> · <In Präsentation>
   Begründung: ...
   Verworfen: ...
   ```

3. If a later decision changes an earlier one, update the earlier entry (status or text) instead
   of leaving two contradicting entries.
4. Notion not reachable: add the decision to the commit message under "Decision:" and tell Dima
   that it still has to go into Notion.
