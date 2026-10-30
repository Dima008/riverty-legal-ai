# Project context

Everything that was discussed and decided before development moved to VS Code.

| File | Content |
| --- | --- |
| `case-study.md` | the original task from Riverty, verbatim, plus their addendum |
| `briefing.md` | condensed handover: how to work with Dima, problem analysis, approach, target architecture, MVP canvas, frontend and presentation plan, governance and adoption, status, schedule, where things live |
| `decisions.md` | export of the decision log (46 decisions, German, verbatim) |

**Source of truth** for decisions, roadmap and the coverage matrix is Notion (page "Riverty
Case Study"). These files are a snapshot from 2026-10-30. With the Notion connector in Claude
Code you can read and update Notion directly:

```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp
```

Then run `/mcp` inside Claude Code and sign in to the Notion workspace.
