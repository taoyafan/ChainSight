# ChainSight Agent Notes

## Encoding Rules

This repository contains many UTF-8 files with Chinese text. On Windows/PowerShell, direct terminal output from `Get-Content`, `type`, Node, or Python may appear as mojibake even when the file itself is valid UTF-8.

Follow these rules to avoid corrupting Chinese text:

- Do not treat mojibake shown in the terminal as proof that the file is corrupted. First verify the file with a UTF-8-aware read or JSON parser.
- Prefer `rg` for searching Chinese text. It usually reads UTF-8 correctly and avoids dumping large garbled blocks.
- Use `apply_patch` for manual edits, especially any edit containing Chinese text.
- Do not rewrite Chinese JSON/Markdown files with PowerShell string redirection, `Set-Content`, `Out-File`, `cat >`, or ad hoc shell heredocs unless UTF-8 output is explicitly controlled.
- If a script must read/write files, use Node or Python with explicit UTF-8:
  - Node: `fs.readFileSync(path, 'utf8')` and `fs.writeFileSync(path, text, 'utf8')`
  - Python: `open(path, encoding='utf-8')` and `open(path, 'w', encoding='utf-8')`
- When printing Chinese from Python in PowerShell, set `PYTHONIOENCODING=utf-8` first if terminal inspection is required.
- Before and after editing Chinese files, check for mojibake markers:
  - `rg -n "\?\?|ï|å|ä|Ã|�" <files>`
- For JSON files, also verify parsing:
  - `node -e "JSON.parse(require('fs').readFileSync('<file>','utf8')); console.log('ok')"`

If terminal output is garbled but JSON parsing passes and `rg` does not find mojibake markers, assume the file is fine and the console display is the problem.
