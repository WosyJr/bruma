# The County of Bruma

The seat of County Bruma, kept on the web: its watch, its holdings, its purse,
its guilds, its court and its archive. Node and Express, flat JSON files, no database.

## Running it on Railway

Add it as a second service in the same project as the Ministry Portal
(**Add New Service -> GitHub Repo -> WosyJr/bruma**). Each service keeps its own
domain, its own variables and its own volume.

### Variables

| Name | What it is |
|---|---|
| `SESSION_SECRET` | A long random string. Changing it signs everybody out. |
| `IDLE_MINUTES` | How long someone may sit idle before the hall closes on them. Default 30. |
| `AUDIT_KEY` | The same long random string as on the Ministry. Its **Every Hand** page then reads this site's sign-ins, strikes and doings from `/audit.json`. |
| `MASTER_USERNAME` | The name the first account enters with, e.g. `wosy` |
| `MASTER_PASSWORD` | Its first word. Change it the moment you are in. |
| `MASTER_NAME` | The name shown on screen, e.g. `Wosy` |
| `DATA_DIR` | `/data` — must match the volume's mount path |
| `NODE_ENV` | `production` |
| `CURRENT_YEAR` | The year of the Fourth Era the County is in. Default 226. |
| `GHOST_ODDS` | How rare the pale figure is: one page in this many. Default 200. |

### The volume

Attach a volume mounted at **`/data`**. Everything the County records lives there:
people, offices, shifts, holdings, the ledger, guild rolls, court matters and the archive.
Without it, a redeploy wipes the County clean.

The first account is made only when `people.json` does not yet exist. After that the
variables are ignored, and accounts are made in **The Officers**.

## The offices

Three offices **hold the County** — they reach every hall and every power, including
anything added later:

- **Count of Bruma**
- **Countess of Bruma**
- **Steward of Bruma**

A fourth, **Master of the Hold**, also holds the County and cannot be struck or stripped.
That is the account the variables above create.

Below them: Captain of the Watch, Guardsman, the three Guild Masters, Clerk of the County
and Citizen. Offices are not fixed in the code — make, amend or strike them in
**The Officers -> The offices**, ticking exactly what each one opens.

## The halls

| Hall | What it does |
|---|---|
| **The Watch** | Guards clock on and off at a named post. Every shift is logged with its hours; the Captain keeps the roster, amends the log and writes the day book. |
| **The Property Roll** | The county map with every holding pinned on it. Click the map to drop a pin, set who holds it, what rent it renders, and record rents as they come in. |
| **The Treasury** | An append-only ledger in septims. Nothing is ever edited or deleted — a mistake is put right by a counter-entry, so the books always audit. Views by month and by head. |
| **The Guilds** | The Synod, the Miners and the Fighters. Each has its charter, its roll by grade, and its tithes to and from the Treasury. A Guild Master sees only his own. |
| **The Court** | Matters laid before the County, papers entered upon them, hearings set and judgments given. Anyone may lay a matter; only the court may judge. |
| **The Archive** | Every charter, law, deed, order and dispatch, on labelled shelves, searchable, held as text or as a link. |

## What is public, and what is not

Anyone may read these without an account:

**Proclamations** · **The Pale Pass** · **Laws & Charters** (the archive's law and charter shelves only)
· **Who Holds What** (holdings and their holders — never their rents) · **Judgments** (verdicts once given,
never open matters) · **The Court** (offices and who holds them) · **Lay a Petition** (anyone may petition
the County with no account)

Everything else is behind the hall door, and deliberately so. **The watch is never public** — not who is
standing, not the roster, not the log, not the hours. Nor is the Treasury, the guild rolls and tithes, the
matters still before the bench, or the officer admin. What happens in Bruma is found out in Bruma.

An office is named on the public court page only when **Named publicly** is ticked for it in
*The Officers → The offices*. Guardsman and Citizen start unticked, so the watch is not readable as a roster.

## The map

`public/county-map.png`. Pins are stored as a percentage across and down, so swapping
the map for a bigger one keeps every pin where it was.

## Running it locally

    npm install
    MASTER_USERNAME=wosy MASTER_PASSWORD=somethinglong npm start

Then open http://localhost:3000.

## Added lately

- **Who stands where** (`/watch/week`): the watch as a week grid, one row per post, one column per day. Past days show what was stood; today and ahead show who is set. A gap is red with *Take this post*; a stand over sixteen hours gets an amber edge. Postings live in `watch-rota.json`.

## The town

The front page carries **Bruma tonight** and a few things that belong to everyone.

| Part | What it does |
|---|---|
| **Bruma tonight** | A drawing of the town at night. A window lights for each officer signed in within ten minutes; visitors see the light, officers see whose it is. A wall lamp burns for each guard on watch. What the town has built is drawn in. |
| **The town's goal** (`/goal`) | An office with *Set the town's goals* names a goal and its sum, and may tie it to something drawn in the town: a bell, a beacon, banners, a statue or a new North Gate. Anyone may pledge. A pledge counts once the Steward marks it paid, after the septims change hands in game. When paid reaches the sum, it is built. |
| **The pale figure** | Now and then a figure walks across the page for a few moments. Catch it and your name goes in the Herald. |
| **The ballad** (`/ballad`) | One line a day from anyone. Each week has its own song; past weeks are sealed and kept. An office with the town power strikes a line. |
| **Faces of Bruma** (`/faces`) | Anyone with the Hall puts up one portrait of their character with a line. One is shown on the front page each day. |
| **The Jerall Herald** (`/herald`) | A weekly paper built from the site itself: watch hours, the top guard, gaps, the goal, figures caught, the ballad, proclamations, petitions, reports and the pass. An office with the Herald power adds a lead story. Past weeks stay readable. |

New powers to tick on offices, under **The Town**: *Set the town's goals and mark pledges handed over*, *Write the lead story of the Jerall Herald*, *Take down ballad lines and portraits*. Data lives in `town-goals.json`, `town-ghost.json`, `town-ballad.json`, `town-faces.json` (pictures in `faces/`) and `town-herald.json`.
