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
| `MASTER_USERNAME` | The name the first account enters with, e.g. `wosy` |
| `MASTER_PASSWORD` | Its first word. Change it the moment you are in. |
| `MASTER_NAME` | The name shown on screen, e.g. `Wosy` |
| `DATA_DIR` | `/data` — must match the volume's mount path |
| `NODE_ENV` | `production` |
| `CURRENT_YEAR` | The year of the Fourth Era the County is in. Default 226. |

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

## The map

`public/county-map.png`. Pins are stored as a percentage across and down, so swapping
the map for a bigger one keeps every pin where it was.

## Running it locally

    npm install
    MASTER_USERNAME=wosy MASTER_PASSWORD=somethinglong npm start

Then open http://localhost:3000.
