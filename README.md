# Scrubssitel

A cute, original hospital and specialty-practice management comedy game, with a fully articulated cast based on the original OpenArt character designs.

**Play:** https://marcelweissgerberit.github.io/scrubssitel/

## Choose your practice

Every new hospital starts with **empty floor, no staff, no patients and $50,000**. Place rooms, hire their staff and open the clinic when reception, diagnosis and pharmacy are ready.

- **Guided tutorial:** Bea guides seventeen concrete steps: build and staff reception, diagnosis and pharmacy; build a real waiting area; open the clinic; read a personal patient chart; treat patients; provide a lounge, restrooms and maintenance; upgrade busy departments; earn **$100,000 actual profit in a completed financial year**. Suggested floor areas and one-click placement help beginners, while manual room drawing stays available.
- **Story 1 — A practice of your own:** establish a working community practice and reach treatment and reputation goals.
- **Story 2 — Head in the clouds:** develop a daydream specialty practice, complete twelve successful therapy cases and research better bedside manner.
- **Story 3 — A perfectly imperfect practice:** run a cosmetic specialty clinic, complete eighteen glow-up treatments for filteritis and smile-lock cases, and research more efficient paperwork.
- **Free play:** all departments available, no forced victory target. Reputation, queues, fatigue, upkeep and bankruptcy still apply.

Existing version-one through version-four hospitals are migrated without deleting rooms, cash or active patients. They are offered the new tutorial, and can instead continue their existing game. Export a save before replacing a hospital if you want to keep both.

## Actual patient journeys and records

Every new patient must complete **staffed reception → diagnosis → the correct treatment → departure**. Choose a dedicated receptionist from three applicants. An empty reception or missing receptionist stops registration; doctors do not bypass it.

Every admitted person receives a permanent individual chart with a unique patient number, name, birth date, age, occupation, insurance, allergies, priority, complaint, diagnosis, admission/discharge details, itemized charges and a timestamped care timeline with staff and department names. Diagnosis stays hidden until it is completed. The patient directory includes active and discharged people, and records remain available after characters leave the floor and after reloading the game. Imported legacy patients have explicitly marked legacy records because earlier versions did not record their past care history.

The six staff archetypes, three adult patient appearances and three child appearances now use complete articulated models with visible front, back and side surfaces, rotating continuously through every heading. Knees, elbows, hands and feet move through a complete walk cycle; foot contact follows distance traveled. Standing, sitting down, seated reading, standing up, reception typing, treatment, cleaning and celebration have distinct poses and blended transitions. Figures are smaller relative to doors and furniture.

The simulation still advances in fixed 50 ms steps, while patient positions interpolate between those steps at the display frame rate. Staff use the same doorway and interior paths, with no elapsed-time cap that loses movement at lower frame rates. Facing persists when someone stops. Break seats stay reserved until the employee leaves, and staff without a seat rest standing up. Click a character or use the patient directory to inspect it.

## Waiting rooms and recruitment

Build a **Waiting area** from the construction palette: it has real, individually reserved waiting chairs and sofa cushions, magazine tables and a toy corner. A clear central aisle keeps the entrance free. Larger floor plans have more seats. Patients walk to their reserved chair, sit, and get up when called; each patient reaches a waiting position before being called. A department serves its oldest registered waiting appointment, regardless of its position in the patients array. The room stays reserved until its previous patient has exited. Full seating leaves patients standing at reachable queue positions. Sitting reduces patience loss by 65%; comfort upgrades add 5 percentage points each. A waiting area supplements treatment capacity: long journeys and slow rooms still cause queues. Busy areas cannot be demolished until patients have cleared them.

The **Staff** panel has three applicants per profession with fifteen distinct initial appearances. Hair, complexion, face details, glasses, facial hair and clothing distinguish the applicants. Portraits and live models use the same identity resolver, so a hired person looks the same on the floor and after loading a save. Later recruitment rounds vary their styling without altering existing employees. Legacy staff keep their original cast appearance. Contract choices remain: steady, inexpensive newcomer, and fast specialist. Compare skill, one-time hiring fee, monthly salary and fatigue rate. Skill affects treatment, lab research and maintenance. Applicants are consumed when hired; a new $250 advert replaces remaining applications with a new batch. Cheaper staffing can require further equipment upgrades to meet the profit goal.

## Staff journeys and real breaks

Staff positions and routes now belong to the saved simulation. New hires enter through the clinic entrance, open doors and walk to their assigned workplace. A department cannot call or treat a patient while its employee is still travelling. The renderer interpolates those actual positions and never advances a second, cosmetic staff simulation.

Regular staggered breaks, fatigue at 86%, or the **Take a break / Pause machen** button request a break. Staff first finish the full committed patient cycle, including call, entry, service and exit. They then reserve an available lounge seat and walk there. Fatigue recovers only after arrival. Lounge upgrades improve recovery in that particular room; a full or missing lounge produces a slower standing break at a reachable corridor position. Seats cannot be reserved twice. A break lasts at least twelve simulation seconds and until fatigue is at most 28%, then the employee walks back before accepting the next patient.

Patient queues stay intact while staff are away. The staff and room panels distinguish travel, pending breaks, seated/standing breaks and work; the waiting-list panel explains unavailable departments. Laboratory research requires the researcher to be at the workplace. Cleaning requires a cleaner actively patrolling, not an employee sitting in the lounge. Construction cannot be placed over employees; an occupied or reserved lounge cannot be demolished. Save schema 5 preserves staff travel, reservations, fatigue, pending breaks and timers. Schema 4 migration keeps current treatments and financial state.

## Children, objects, doors and announcements

About 23% of new patients are children aged 4–15. They have matching chart ages, school/kindergarten occupations, three distinct smaller character models, child portraits and seated teddy-bear poses. Seated children in a waiting area lose 35% less patience in addition to the seating bonus.

All room furnishings have a stable identity, a Canvas hit target and an explanation available by clicking them or selecting them from the room's object list. Waiting chairs, sofas, blocks, toy ducks, plants, books, desks, monitors, bells, cupboards, sinks and comedy devices belong to the room price. Descriptions distinguish decoration from actual effects. Doors swing open for passage and can be held open from their detail panel; an open door never authorizes a patient to skip the queue.

Reception creates the registration order. Completed diagnosis creates the follow-up order. A clinician explicitly calls the oldest waiting patient for that department, reserves the room, then starts service only when the patient reaches the treatment position. The **Waiting list** shows waiting, called and active visits; the latest call remains visible with a matching room number. Funny speech-bubble pictograms reflect actions and needs without depending on emoji font availability.

**Enable announcements** performs an audible test inside a user click; opening the clinic also enables them. SpeechSynthesis announces names and rooms in the selected language, using available matching system voices. Voice availability depends on the browser and OS. Twelve bundled German/English recordings provide generic department announcements when synthesis is unavailable. A browser may require the enable button again if it blocks playback. Subtitles always show the named call. Calls never block simulation, repeat after loading, overlap, or accumulate at 3× speed. Pause, dialogs, hidden tabs, language changes and save imports clear pending speech. The recorded fallback cannot speak arbitrary patient names; it announces the department instead.

Live UI updates preserve existing buttons and focus. Tutorial guidance stays in its lesson card; normal play shows clinic information. The room palette opens only when choosing **Build**, leaving more space for the clinic.

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

The tutorial uses a gentler treatment failure rate than story/free play; registration, walking, staffing, bills and the actual profit calculation still apply.

Less than −$5,000 cash or zero reputation ends a shift.

## Controls and saves

Space pauses; 1/2/3 change speed; B toggles construction; Escape cancels. Drag a rectangle of at least 3×3 tiles to build. Doorways must stay accessible. Mouse wheel zooms; right drag or arrows pan. With construction selected and the canvas focused, arrows move the cursor and Enter sets each corner. Select a room to inspect, upgrade or demolish it.

English/German follow the browser automatically, with a persistent manual override. Saves are local to this browser/device. Settings provides JSON import/export, optional musical effects, and a new-hospital menu. Use the separate speaker button to enable or mute spoken patient announcements. The simulation pauses when its tab is hidden. The mobile layout keeps the guide and room palette accessible.

## Art

The original ensemble and both new full-body sprite sheets were generated through the owner's signed-in **OpenArt** account using GPT Image 2. See [`PROVENANCE.md`](public/assets/PROVENANCE.md) and [`PROVENANCE-V2.md`](public/assets/PROVENANCE-V2.md) for prompts, layout and processing details. The procedural room geometry and comedy machines are interactive Canvas game scenery. Version 2.2 replaced the old sliced bitmap gait with procedurally shaded, articulated character geometry. OpenArt concept sheets remain the cast reference; adult patient directory portraits still use the original artwork. Version 2.4 staff portraits are rendered from each applicant’s own articulated model. Version 2.3 adds code-drawn interactive furniture and children based on that original style. No new OpenArt furniture/turnaround generation is claimed: Chrome was in concurrent use. Bundled fallback announcements use eSpeak NG formant voices (`de` / `en-us`), rendered to AAC. No Apple system-voice recordings are distributed. Texts, source/license notes and verification hashes are in `public/assets/voice/PROVENANCE.md` and `provenance.json`. Fonts ship with their SIL Open Font Licenses.

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

Automated tests cover empty starts, guide progression, staffed reception, persistent patient charts, real year-end accounting, loan principal/interest, modifiers, all tutorial seeds and story goals, real seat reservations, overflow, continuous movement, applicant contracts, access constraints, deterministic saves, imported-state validation, legacy migration and bilingual completeness. Additional tests exercise FIFO across multiple doctors, explicit calls, door gates, service-at-destination, child identity/comfort, furniture-seat agreement and speech cancellation/fallback races. Animation tests cover planted feet, complete cycles, all headings, pose transitions, retained facing, interpolation of simulated staff positions, doorway passage and stable break-seat reservations. Staff tests include scheduled/manual breaks, arrival gates, requests during calls and entry, lounge overflow, no recovery while travelling, paused research/cleaning, real v4 migration, and deterministic saves through each break phase. A separate DOM/native-Canvas smoke exercise covers the complete guide setup, personal charts/archive, language switching, annual accounts and free play with the current live character renderer.
