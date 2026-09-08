# Funny Hospital

A cute, original hospital and specialty-practice management comedy game, with a fully articulated cast based on the original OpenArt character designs.

**Play:** https://marcelweissgerberit.github.io/scrubssitel/

## Choose your practice

Every new hospital starts with **empty floor, no staff, no patients and $50,000**. Draw room shells, place their required furniture, hire their staff and open the clinic when reception, diagnosis and pharmacy are ready.

A new room is an empty shell with a door. Its editor lists the required equipment. Place, rotate, move and remove furniture on a quarter-tile grid; access markers show where people need to stand or sit. Overlaps, blocked doors and inaccessible workstations are rejected. An optional starter layout is available for empty rooms. Finish the room to activate it, or save an unfinished draft for later.

The furniture catalog shows actual game-model previews in the room’s colors, with names, prices and floor dimensions. Placed items retain a small preview in their saved orientation. Already placed equipment stays visible and labeled in the catalog.

Each visit first shows that empty floor with a short bilingual introduction. Choose **Start step by step** to build the first reception, or explicitly **Continue saved clinic** to load an existing hospital. Previewing the introduction, changing language, opening help and leaving the page never overwrite the saved clinic. A fresh start replaces an existing save only after confirmation; exporting from the introduction exports that existing save. Story and free play also begin empty and show a short setup briefing.

- **Guided tutorial:** Bea guides seventeen concrete steps: build and staff reception, diagnosis and pharmacy; build a real waiting area; open the clinic; read a personal patient chart; treat patients; provide a lounge, restrooms and maintenance; upgrade busy departments; earn **$100,000 actual profit in a completed financial year**. Suggested floor areas and one-click placement help beginners, while manual room drawing stays available.
- **Story 1 — A practice of your own:** establish a working community practice and reach treatment and reputation goals.
- **Story 2 — Head in the clouds:** develop a daydream specialty practice, complete twelve successful therapy cases and research better bedside manner.
- **Story 3 — A perfectly imperfect practice:** run a cosmetic specialty clinic, complete eighteen glow-up treatments for filteritis and smile-lock cases, and research more efficient paperwork.
- **Free play:** all departments available, no forced victory target. Reputation, queues, fatigue, upkeep and bankruptcy still apply.

Existing version-one through version-five hospitals are migrated without deleting rooms, cash or active patients. They are offered the new tutorial, and can instead continue their existing game. Export a save before replacing a hospital if you want to keep both. **Skip tutorial** continues the same clinic in free play without resetting cash, staff, patient records or room drafts. The start screen also offers a direct free-play button.

## Actual patient journeys and records

Every new patient must complete **staffed reception → diagnosis → the correct treatment → departure**. Choose a dedicated receptionist from three applicants. An empty reception or missing receptionist stops registration; doctors do not bypass it.

Every admitted person receives a permanent individual chart with a unique patient number, name, birth date, age, occupation, insurance, allergies, priority, complaint, diagnosis, admission/discharge details, itemized charges and a timestamped care timeline with staff and department names. Diagnosis stays hidden until it is completed. The patient directory includes active and discharged people, and records remain available after characters leave the floor and after reloading the game. Imported legacy patients have explicitly marked legacy records because earlier versions did not record their past care history.

The six staff archetypes, three adult patient appearances and three child appearances now use complete articulated models with visible front, back and side surfaces, rotating continuously through every heading. Knees, elbows, hands and feet move through a complete walk cycle; foot contact follows distance traveled at each adult or child model’s actual scale. Standing, sitting down, seated reading, standing up, reception typing, treatment, cleaning and celebration have distinct poses and blended transitions. Figures are smaller relative to doors and furniture.

The simulation still advances in fixed 50 ms steps, while patient positions interpolate between those steps at the display frame rate. Staff use the same doorway and interior paths, with no elapsed-time cap that loses movement at lower frame rates. Facing persists when someone stops. Break seats stay reserved until the employee leaves, and staff without a seat rest standing up. Click a character or use the patient directory to inspect it.

## Waiting rooms and recruitment

Build a **Waiting area** from the construction palette and furnish it with individually reserved chairs and sofa cushions, magazine tables or a toy corner. A clear central aisle keeps the entrance free. Larger floor plans leave room for more seats, but capacity comes from the chairs and sofas you actually place. Patients walk to their reserved chair, sit, and get up when called; each patient reaches a waiting position before being called. A department serves its oldest registered waiting appointment, regardless of its position in the patients array. The room stays reserved until its previous patient has exited. Full seating leaves patients standing at reachable queue positions. Sitting reduces patience loss by 65%; comfort upgrades add 5 percentage points each. A waiting area supplements treatment capacity: long journeys and slow rooms still cause queues. Busy areas cannot be demolished until patients have cleared them.

The **Staff** panel has three applicants per profession with fifteen distinct initial appearances. Hair, complexion, face details, glasses, facial hair and clothing distinguish the applicants. Portraits and live models use the same identity resolver, so a hired person looks the same on the floor and after loading a save. Later recruitment rounds vary their styling without altering existing employees. Legacy staff keep their original cast appearance. Contract choices remain: steady, inexpensive newcomer, and fast specialist. Compare skill, one-time hiring fee, monthly salary and fatigue rate. Skill affects treatment, lab research and maintenance. Applicants are consumed when hired; a new $250 advert replaces remaining applications with a new batch. Cheaper staffing can require further equipment upgrades to meet the profit goal.

## Renovating a running clinic

Choose **Furnish room** from a room or object panel. A busy department first stops taking new appointments, finishes its committed visit, and lets patients and staff leave. Called patients keep appointments in other departments when leaving a waiting room under renovation. Lounge occupants return to work. Only an empty room enters the editor; editing pauses simulation, animation and announcements. The renovation and any unfinished draft survive saving and reloading.

## Staff journeys and real breaks

Staff positions and routes now belong to the saved simulation. New hires enter through the clinic entrance, open doors and walk to their assigned workplace. A department cannot call or treat a patient while its employee is still travelling. The renderer interpolates those actual positions and never advances a second, cosmetic staff simulation.

Regular staggered breaks, fatigue at 86%, or the **Take a break / Pause machen** button request a break. Staff first finish the full committed patient cycle, including call, entry, service and exit. They then reserve an available lounge seat and walk there. Fatigue recovers only after arrival. Lounge upgrades improve recovery in that particular room; a full or missing lounge produces a slower standing break at a reachable corridor position. Seats cannot be reserved twice. A break lasts at least twelve simulation seconds and until fatigue is at most 28%, then the employee walks back before accepting the next patient.

Patient queues stay intact while staff are away. The staff and room panels distinguish travel, pending breaks, seated/standing breaks and work; the waiting-list panel explains unavailable departments. Laboratory research requires the researcher to be at the workplace. Cleaning requires a cleaner actively patrolling, not an employee sitting in the lounge. Construction cannot be placed over employees; an occupied or reserved lounge cannot be demolished. Save schema 6 also stores individual furniture positions, rotations, purchase values and unfinished/renovating rooms. Earlier saves keep their clinical and financial history; formerly decorative furniture is converted into an editable layout with safe routes. Existing actors are aligned with its workstations or safe floor positions once during migration. The save preserves staff travel, reservations, fatigue, pending breaks and timers. Schema 4 migration keeps current treatments and financial state.

## Children, objects, doors and announcements

Patients have stable individual clothing, hairstyles, complexions and age-appropriate details; their records use the same identity as their live model. About 23% of new patients are children aged 4–15. They have matching chart ages, school/kindergarten occupations, three distinct smaller character models, child portraits and seated teddy-bear poses. Seated children gain an extra 35% patience benefit when the waiting room actually contains a toy corner.

All room furnishings have a stable identity, a Canvas hit target and an explanation available by clicking them or selecting them from the room's object list. The room price buys the shell; furniture has separate catalog prices. A reception desk includes its matching chair, monitor, keyboard and bell. Moving furniture is free, and removing a purchased item refunds 75% of its furniture price. Patients, staff and their interpolated animation paths respect solid furniture. Seating allows only the reserved approach to that particular cushion. Descriptions distinguish decoration from actual effects. Doors swing open for passage and can be held open from their detail panel; an open door never authorizes a patient to skip the queue.

Reception creates the registration order. Completed diagnosis creates the follow-up order. A clinician explicitly calls the oldest waiting patient for that department, reserves the room, then starts service only when the patient reaches the treatment position. The **Waiting list** shows waiting, called and active visits; the latest call remains visible with a matching room number. Funny speech-bubble pictograms reflect actions and needs without depending on emoji font availability.

**Sound options → Spoken patient calls** performs an audible test inside a user click; opening or resuming a clinic also enables them unless explicitly muted. SpeechSynthesis announces names and rooms in the selected language, using available matching system voices. Voice availability depends on the browser and OS. Twelve bundled German/English recordings provide generic department announcements when synthesis is unavailable. A browser may require the enable button again if it blocks playback. Subtitles always show the named call. Calls never block simulation, repeat after loading, overlap, or accumulate at 3× speed. Pause, dialogs, hidden tabs, language changes and save imports clear pending speech. The recorded fallback cannot speak arbitrary patient names; it announces the department instead.

Live UI updates preserve existing buttons and focus. Tutorial guidance stays in its lesson card; normal play shows clinic information. Building, staff, records, research, finances, saving, language and audio options live in one icon wheel. The permanent top management tabs and bottom construction strip have been removed. Unstaffed rooms also offer the appropriate hiring shortcut, and staff views separate applicants from the existing team.

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

The animated menu wheel combines building, staff, patients and clinic management. Select an inner category, then an outer icon; hover or keyboard focus shows its label. M opens the wheel, B opens its building section, and Escape closes it. Space pauses; 1/2/3 change speed. Drag a rectangle of at least 3×3 tiles to build. Doorways must stay accessible. Mouse wheel zooms; right drag or arrows pan. With construction selected and the canvas focused, arrows move the cursor and Enter sets each corner. Select a room to inspect, upgrade or demolish it.

In the furniture editor, **R** rotates, arrow keys make quarter-tile adjustments, **Enter** places, and **Escape** cancels the current placement. Wall clocks and posters snap to supporting walls.

English/German follow the browser automatically, with a persistent manual override. Saves are local to this browser/device. Settings provides JSON import/export, optional musical effects, and a new-hospital menu. Use Menu → Clinic → Sound options to enable or mute spoken patient announcements independently from sound effects. The menu also provides automatic/English/German selection and saving; Settings contains save import/export. The simulation pauses when its tab is hidden. The wheel adapts to small screens; tutorial guidance remains accessible in a compact card.

## Art

Version 2.7 introduces continuous character silhouettes, shaped hair in every direction and head-and-shoulders portraits. Sofas sort against both seating positions and speech bubbles clear the hairstyle. Three additional counters and eight practice furnishings add round and modern reception desks, a working pharmacy sales counter, writing and round tables, medicine shelving, a gumball machine, a newspaper stand, water, coats and sanitizer. Waiting-area gumballs, newspapers and water each reduce seated patience loss by 5%, once per type, up to 15%; the other additions are decoration or workplace alternatives. All can be moved and rotated and share their actual collision geometry.

Version 2.6 adds distinct room palettes and flooring, individual patient styling and movable furniture with four orientations. Reception keyboards face the seated employee. The room layout is the source of both rendering and collision geometry.

Version 2.5 gives the cast fuller silhouettes, softer shaded faces, expressive eyes, layered hair, scrub collars, pockets and name badges. Portrait framing includes the tallest hairstyles. Seat poses share the furniture’s actual cushion height; children’s feet dangle. The receptionist sits on a rolling chair behind the counter, with typing hands above the worktop. People and furniture share a depth-sorted scene, including desktop objects, so the counter correctly hides the seated lower body.

Twenty furnishing types have rounded surfaces and extra practice details: stitched cushions, wooden chair legs, magazine covers, blocks and a teddy, leafy plants, cabinet supplies, faucets, a queue monitor and keyboard, wall clocks and duck-themed posters. Machines show scan sweeps, glass bubbles, steam, mirror lights, an animated iron or drifting sleepy letters during real staffed treatment. The lab animates only during staffed research; the coffee machine steams when staff actually reach a lounge break. These details use the paused simulation animation clock. Placed furniture keeps stable identities when moved; seats and workplace positions follow its saved layout. Legacy saves retain their clinical and financial history and are aligned to the new furniture geometry on import.

The original ensemble and both new full-body sprite sheets were generated through the owner's signed-in **OpenArt** account using GPT Image 2. See [`PROVENANCE.md`](public/assets/PROVENANCE.md) and [`PROVENANCE-V2.md`](public/assets/PROVENANCE-V2.md) for prompts, layout and processing details. The procedural room geometry and comedy machines are interactive Canvas game scenery. Version 2.2 replaced the old sliced bitmap gait with procedurally shaded, articulated character geometry. OpenArt concept sheets remain the cast reference. Version 2.6 patient portraits use each patient’s own articulated model and appearance. Version 2.4 staff portraits are rendered from each applicant’s own articulated model. Version 2.3 adds code-drawn interactive furniture and children based on that original style. No new OpenArt furniture/turnaround generation is claimed: Chrome was in concurrent use. Bundled fallback announcements use eSpeak NG formant voices (`de` / `en-us`), rendered to AAC. No Apple system-voice recordings are distributed. Texts, source/license notes and verification hashes are in `public/assets/voice/PROVENANCE.md` and `provenance.json`. Fonts ship with their SIL Open Font Licenses.

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

Automated tests cover empty starts, guide progression, staffed reception, persistent patient charts, real year-end accounting, loan principal/interest, modifiers, all tutorial seeds and story goals, real seat reservations, overflow, continuous movement, applicant contracts, access constraints, deterministic saves, imported-state validation, legacy migration and bilingual completeness. Additional tests exercise FIFO across multiple doctors, explicit calls, door gates, service-at-destination, child identity/comfort, furniture-seat agreement and speech cancellation/fallback races. Animation tests cover planted feet, complete cycles, all headings, pose transitions, retained facing, interpolation of simulated staff positions, doorway passage and stable break-seat reservations. Staff tests include scheduled/manual breaks, arrival gates, requests during calls and entry, lounge overflow, no recovery while travelling, paused research/cleaning, real v4 migration, and deterministic saves through each break phase. Furnishing tests cover empty shells, required equipment, blocked doors and furniture, rotations, real movement segments, costs, busy-room renovations, calls preserved during waiting-room evacuation, and saved drafts. Tutorial skipping preserves the entire clinic. A separate DOM/native-Canvas smoke exercise covers the complete guide setup, personal charts/archive, language switching, annual accounts and free play with the current live character renderer.
