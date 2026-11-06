# AGENTS.md

## Repo status
- Greenfield: only `Projeto_Inventario_Patrimonial_OpenCode.md` (product spec) and `Patrimonio App (2).xlsx` (legacy reference data). No app code, `package.json`, lockfile, tests, CI, or git repo yet — do not assume `npm test`/`npm run build` exist.
- The spec is the source of truth. Do not invent rules for ambiguous fields; record open questions in docs.
- Required before app code (spec "Instrução inicial"): create `docs/ANALISE_DA_PLANILHA.md`, `docs/ARQUITETURA.md`, `docs/REGRAS_DE_NEGOCIO.md`, plus the proposed folder structure and implementation sequence.

## Fixed scope and stack
- React + TypeScript + Vite, installable PWA, IndexedDB via Dexie, Service Worker.
- Offline-first; reads must never be lost for lack of connection.
- No backend, PostgreSQL, or Google Sheets API in v1, and never write to Senior.
- Keep persistence behind a repository + sync queue so a backend can be added later.
- Build/test local import and conferência before touching Google integration or remote sync.

## Domain rules that are easy to break
- Plaqueta is text, never a number; preserve leading zeros.
- Imports must show a preview (counts, duplicates, errors) before applying, and back up before overwriting the active cadastro.
- Never delete `InventoryEvent` history. Repeated reads are valid events, not cadastro duplicates.
- Duplicated plaquetas in the cadastro require manual review; never pick one arbitrarily.
- A read in a different room flags a divergence and may log a transfer request; never change the official location automatically.
- "Conferido" is computed for the active inventory session; past sessions remain queryable.
- `PENDENCIAS_FINAIS` and `RESUMO_SALAS` are derived views: recompute them, do not import them as source tables.

## Reference spreadsheet (`Patrimonio App (2).xlsx`)
- Filename contains a space and parentheses; on Windows/PowerShell use `-LiteralPath`.
- It is an XLSX zip: sheet names in `xl/workbook.xml`, cells in `xl/worksheets/sheetN.xml`, strings in `xl/sharedStrings.xml`.
- Sheet order: 1 `Conferencia`, 2 `Patrimonio`, 3 `Config`, 4 `ITENS_NOVOS`, 5 `PENDENCIAS_FINAIS`, 6 `RESUMO_SALAS`.
- `Patrimonio` has ~19k rows, including ~2k empty/formula rows with no plaqueta — skip them as assets.
- `ITENS_NOVOS` has headers only, and cached formula values elsewhere are unreliable; never evaluate Google Sheets formulas in the browser.
- `Config` currently holds only `Sala_Atual = 0589 - PRAIA PARK - CASCATAS`; treat it as an editable operational setting, not a hard-coded constant.

## Conventions
- Spec, UI copy, and domain fields are pt-BR: keep terms such as plaqueta, sala, conferência, divergência, pendência.
- Put analysis and design notes in `docs/*.md`; keep README/spec in sync only when behavior changes.
