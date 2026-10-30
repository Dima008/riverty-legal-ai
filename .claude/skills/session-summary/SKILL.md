---
name: session-summary
description: Summarise the current Claude Code session for Notion (German, short) and refresh the project status there. Use at the end of every working session - when Dima says so ("Schluss für heute", "Feierabend", "Sitzung beenden") or invokes /session-summary.
---

# Session summary for Notion

## 1. Collect

- Commits of this session (`git log --oneline` since the first commit of the session).
- New entries in `docs/dev-log.md`, new failure cases in `docs/failure-cases.md`, new decisions
  (Notion "Entscheidungen", export `docs/context/decisions.md`).
- Measured numbers of the session (evaluation, tests, cost) - only real output.

## 2. Write (German, at most ~20 lines)

Notion page "Sitzungsprotokolle" (child of "Riverty Case Study"):
https://app.notion.com/p/40987bb40ae281758a7be38c15d63571 - insert the new session **at the
top**, below the intro callout (Notion tools: fetch the page, then `update_content` / insert):

```
## <TT.MM.JJJJ> – <Thema in wenigen Worten>
<callout> Ergebnis in einem Satz </callout>
- Gebaut: ...
- Messwerte: ...
- Neue Fehlerfälle: F.. (eine Zeile je Fall)
- Neue Entscheidungen: Nr. .. bis ..
- Offen / nächste Schritte: ...
- Commits: <erster>…<letzter>
```

## 3. Refresh the main page

On "Riverty Case Study" replace the paragraph under "Aktueller Stand" with 2-3 sentences
(date, what works now, next step) and keep the link to "Sitzungsprotokolle".

## 4. Fallback

Notion not reachable: post the summary in the chat and tell Dima it still has to go to Notion.
