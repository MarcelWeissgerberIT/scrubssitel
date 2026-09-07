# Scrubssitel

A playable, original hospital management comedy game. Build a clinic, hire an eccentric team, cure absurd illnesses, and try to keep the coffee budget under control.

**Play:** https://marcelweissgerberit.github.io/scrubssitel/

## Included

- Three campaign episodes with treatment and reputation objectives and sequential unlocks.
- Free play with every department available and $35,000 starting funds.
- Interactive isometric hospital: drag to build rooms, automatic accessible doors, animated patients, diagnosis and treatment queues, and automatic staff assignment.
- Seven departments: diagnosis, pharmacy, daydream clinic, odd surgery, staff lounge, restrooms, and research lab.
- Five original staff archetypes, hiring, wages, breaks, fatigue, maintenance, room upgrades, and demolition refunds.
- Six imaginary illnesses, treatment income, daily operating costs, reputation, and bankruptcy.
- Three research projects and comic events with meaningful decisions.
- English and German, detected from the browser with a persistent manual override.
- Pause and three speeds, zoom and pan, optional synthesized sound, a guide, automatic local saves, and JSON import/export.
- Responsive desktop and mobile layout. Touch users drag room footprints; desktop users can also build with keyboard controls.

## Play

The first diagnosis room, pharmacy, staff lounge, doctor, nurse, and maintenance worker are included. Build restrooms, then watch patient queues. New departments need the appropriate staff. Start new campaign episodes or free play by clicking the hospital name at the top.

**Controls:** Space pauses; 1/2/3 change speed; B toggles diagnosis construction; Escape cancels. Drag a rectangle of at least 3×3 tiles to construct a room. Doors must remain reachable. Mouse wheel zooms; right drag or arrow keys pan. With construction selected and the canvas focused, arrow keys move the tile cursor and Enter sets each corner. Select a room for details, upgrades, or demolition.

One game day lasts 90 simulation seconds. Wages and room upkeep are billed daily. Free play has no victory target, but finances and reputation still matter. Reaching less than −$5,000 or zero reputation ends a shift. Events pause the simulation until a response is chosen. The game pauses when its tab is hidden.

Saves are local to the current browser/device. Export a save from Settings to transfer it. Game state, including deterministic random state, survives reloads. Starting a new hospital asks before replacing the current shift.

## Run locally

Requires Node.js 20+; the game has no npm or runtime API dependencies.

```sh
npm run dev
# http://127.0.0.1:4173
npm run check
npm run build
```

Serve `dist/` with any static HTTP server. Opening `index.html` as a `file://` URL will not load ES modules reliably.

## GitHub Pages

`.github/workflows/pages.yml` runs syntax checks and simulation tests, builds the static output, and deploys it through GitHub Actions. In repository Settings → Pages, the source is **GitHub Actions**. Every push to `main` publishes the checked version. All asset paths are relative to support the `/scrubssitel/` project path.

## Art and originality

The ensemble artwork was generated in the owner's signed-in **OpenArt** account, with GPT Image 2. The exact prompt and generation details are in [`public/assets/PROVENANCE.md`](public/assets/PROVENANCE.md). The five figures have original names, designs, roles, and dialogue. The hospital is a procedural interactive game scene. Fonts are bundled with their SIL Open Font Licenses in `public/assets/fonts/`.

This is an independent game with its own setting and assets, not an official adaptation of a television series or an existing game. No series audio, scripts, actor likeness assets, character names, or copied game assets are included.

## Validation

Node tests cover treatment and money flow, collision/access checks, the financial ledger, events at negative balances, all campaign goals, sandbox behavior, support-room upgrades, deterministic save continuation, malformed imports, occupied-room safety, pause behavior, and translation completeness. Additional simulations exercised 30-minute sessions with research, events, construction, and 90 save/restore cycles.
