<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Spreadsheet data is processed only in the browser and held in React memory (src/lib/store.tsx); never persist or transmit operational data — privacy is the top requirement.
- Calculation rules live as pure functions in src/lib/analysis.ts with tests in src/test/analysis.test.ts — keeps accuracy verifiable.
- All exports go through safeCell in src/lib/files.ts — prevents formula injection.
