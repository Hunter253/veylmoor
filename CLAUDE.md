# Working on Veylmoor

## Reading the roadmap doc
When you call `mcp__claude_ai_Claude_Docs__read`, ask for fewer rows, fewer fields or a shorter time range. In that tool's own terms:
- Never read a whole tab. Start with `{"projection":"outline"}`, which gives shortened headings and block ids.
- Fewer rows: open only the one list or table you need, with `{"kind":"view","parentId":"<its id>"}`.
- Fewer fields: to find a phrase, use `{"kind":"search","text":"<phrase>"}` instead of reading the section around it.
- Shorter time range: when you come back to a tab you've already read, use `{"kind":"view","sinceRev":<last rev>}` to get only what changed.
- Don't re-read a block you've just written. The edit's reply already shows it.
