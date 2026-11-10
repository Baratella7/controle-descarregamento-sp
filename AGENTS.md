## Architecture
- Spreadsheet data is processed only in the browser and held in React memory (src/lib/store.tsx); never persist or transmit operational data — privacy is the top requirement.
- Calculation rules live as pure functions in src/lib/analysis.ts with tests in src/test/analysis.test.ts — keeps accuracy verifiable.
- All exports go through safeCell in src/lib/files.ts — prevents formula injection.
