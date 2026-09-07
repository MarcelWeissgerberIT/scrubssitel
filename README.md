# Scrubssitel

A cute, original hospital and specialty-practice management comedy game, with OpenArt characters animated directly on the playable floor.

**Play:** https://marcelweissgerberit.github.io/scrubssitel/

## Choose your practice

Every new hospital starts with **empty floor, no staff, no patients and $50,000**. Place rooms, hire their staff and open the clinic when reception, diagnosis and pharmacy are ready.

- **Guided tutorial:** Bea guides seventeen concrete steps: build and staff reception, diagnosis and pharmacy; build a real waiting area; open the clinic; read a personal patient chart; treat patients; provide a lounge, restrooms and maintenance; upgrade busy departments; earn **$100,000 actual profit in a completed financial year**. Suggested floor areas and one-click placement help beginners, while manual room drawing stays available.
- **Story 1 — A practice of your own:** establish a working community practice and reach treatment and reputation goals.
- **Story 2 — Head in the clouds:** develop a daydream specialty practice, complete twelve successful therapy cases and research better bedside manner.
- **Story 3 — A perfectly imperfect practice:** run a cosmetic specialty clinic, complete eighteen glow-up treatments for filteritis and smile-lock cases, and research more efficient paperwork.
- **Free play:** all departments available, no forced victory target. Reputation, queues, fatigue, upkeep and bankruptcy still apply.

Existing version-one and version-two hospitals are migrated without deleting rooms, cash or active patients. They are offered the new tutorial, and can instead continue their existing game. Export a save before replacing a hospital if you want to keep both.

## Actual patient journeys and records

Every new patient must complete **staffed reception → diagnosis → the correct treatment → departure**. Choose a dedicated receptionist from three applicants. An empty reception or missing receptionist stops registration; doctors do not bypass it.

Every admitted person receives a permanent individual chart with a unique patient number, name, birth date, age, occupation, insurance, allergies, priority, complaint, diagnosis, admission/discharge details, itemized charges and a timestamped care timeline with staff and department names. Diagnosis stays hidden until it is completed. The patient directory includes active and discharged people, and records remain available after characters leave the floor and after reloading the game. Imported legacy patients have explicitly marked legacy records because earlier versions did not record their past care history.

The six original staff archetypes and three patient appearances use processed OpenArt sprites with independently pivoted legs, seated poses, directional facing, breathing, working motion and work/rest reactions. Staff walk between assigned departments and their breaks. Click a character or use the patient directory to inspect it.

## Waiting rooms and recruitment

Build a **Waiting area** from the construction palette: it has real, individually reserved seats and magazine tables. Larger floor plans have more seats. Patients walk to their reserved chair, sit, and get up when called; people can also be called while still walking to a seat. Full seating leaves patients standing at reachable queue positions. Sitting reduces patience loss by 65%; comfort upgrades add 5 percentage points each. A waiting area supplements treatment capacity: long journeys and slow rooms still cause queues. Busy areas cannot be demolished until patients have cleared them.

The **Staff** panel has three applicants per profession: steady, inexpensive newcomer, and fast specialist. Compare skill, one-time hiring fee, monthly salary and fatigue rate. Skill affects treatment, lab research and maintenance. Applicants are consumed when hired; a new $250 advert replaces remaining applications with a new batch. Cheaper staffing can require further equipment upgrades to meet the profit goal.

## Comedy with consequences

The Quack-o-Scan spins around a rubber duck, the Decaf 3000 bubbles and steams, the Smile Press lights its mirror, and the dream machine exhales sleepy letters. These animated Canvas devices react to actual treatment activity. Patients walk through doorways both before and after appointments, with no post-treatment teleport.

Comic events affect the simulation:

- **Don Fusilli and the Towel Family** offer $12,000 financing, repaid as eight monthly $2,250 installments: $18,000 total. Principal is financing; the $6,000 interest is an expense. Accepting is optional.
- A **self-aware printer** can be repaired or allowed to slow diagnosis for two months.
- A **rubber-duck inspection** rewards cleanliness or costs reputation.
- A **beauty-vlogger group** produces a specialty-patient rush.
- Coffee incidents, donations and ordinary patient surges create further decisions.

Events pause the simulation while the player chooses. Tutorial events begin after the basic lessons, so they do not interrupt initial construction.

## Calendar and finances

A game year contains **twelve 30-second simulation months**: six minutes at 1×, three minutes at 2×, or two minutes at 3×, plus paused planning and decisions. The initial planning phase does not advance the calendar or generate patients.

The game's simplified profit is **income minus operating costs, supplies, building, recruitment, upgrades and research**. Initial capital and loan principal are excluded. Monthly bills, including December's, are charged before an annual report closes. The tutorial checks a completed annual result and the completed lessons; it does not use a projected run rate or the cash balance. Missing the first year's target allows another year. Income, operating expenses, investment, loan obligations and completed annual reports can be inspected in Finances.

Less than −$5,000 cash or zero reputation ends a shift.

## Controls and saves

Space pauses; 1/2/3 change speed; B toggles construction; Escape cancels. Drag a rectangle of at least 3×3 tiles to build. Doorways must stay accessible. Mouse wheel zooms; right drag or arrows pan. With construction selected and the canvas focused, arrows move the cursor and Enter sets each corner. Select a room to inspect, upgrade or demolish it.

English/German follow the browser automatically, with a persistent manual override. Saves are local to this browser/device. Settings provides JSON import/export, optional synthesized audio, and a new-hospital menu. The simulation pauses when its tab is hidden. The mobile layout keeps the guide and room palette accessible.

## Art

The original ensemble and both new full-body sprite sheets were generated through the owner's signed-in **OpenArt** account using GPT Image 2. See [`PROVENANCE.md`](public/assets/PROVENANCE.md) and [`PROVENANCE-V2.md`](public/assets/PROVENANCE-V2.md) for prompts, layout and processing details. The procedural room geometry and comedy machines are interactive Canvas game scenery. Version 2.1 rigs the existing OpenArt artwork; it adds no newly generated raster assets. Fonts ship with their SIL Open Font Licenses.

The cast, setting, dialogue and illnesses are original. This game is not affiliated with an existing television series or hospital game and contains no copied series audio, scripts or game assets.

## Development and publishing

Node.js 20+; no npm runtime dependencies.

```sh
npm run dev
# http://127.0.0.1:4173
npm run check
npm run build
```

Serve `dist/` with any static HTTP server. The GitHub Actions workflow validates and publishes pushes to `main` using GitHub Pages. Asset paths support the `/scrubssitel/` project path.

Automated tests cover empty starts, guide progression, staffed reception, persistent patient charts, real year-end accounting, loan principal/interest, modifiers, all tutorial seeds and story goals, real seat reservations, overflow, continuous movement, applicant contracts, access constraints, deterministic saves, imported-state validation, legacy migration and bilingual completeness. A separate DOM/native-Canvas smoke exercise covers the complete guide setup, personal charts/archive, language switching, annual accounts and free play with the actual OpenArt sprites.
