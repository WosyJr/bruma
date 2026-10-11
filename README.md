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
| `DISCORD_WEBHOOK` | Optional. A Discord webhook address for the public news channel (channel settings, Integrations, Webhooks, New Webhook, Copy Webhook URL). |
| `DISCORD_OFFICERS_WEBHOOK` | Optional. A second webhook, for a channel only officers can see. |
| `DISCORD_WEBHOOK_A` … `DISCORD_WEBHOOK_F` | Optional. Up to six more channels. None of the webhook variables is needed any more: every channel's address can be pasted on `/discord` instead, where it is kept in `discord.json` on the volume and shown only masked. An address set on the site wins over the Railway variable for that slot. |
| `SITE_URL` | Optional. The site's own address, e.g. `https://bruma.up.railway.app`, so Discord posts link back and carry portraits. Learned from the first visit if not set. |
| `TIMEZONE` | The clock the County keeps: the day on the banner, the ballad's one line a day, the Face of the Day and the Herald's week all turn over at midnight here. Default `America/New_York`. |

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
| **Face of the Day** | The first thing under the County banner: one portrait each day in a gold frame, with the person's line. Anyone can **raise a cup** to them once a day, and the cups go in the Herald. |
| **Faces of Bruma** (`/faces`) | Officers put up their own portrait. Visitors can send one in, and it waits until an office with the town power puts it up or turns it away. Before sending, everyone drags and zooms their picture inside a portrait frame, so it goes up exactly as they placed it. Officers with no portrait get a nudge on their desk, and approvers see portraits waiting. |
| **The Jerall View Inn** (`/inn`) | Two tables against Old Brannoc, as many games as anyone likes, no septims involved. **Twenty-one** (`/inn/cards`) is blackjack: he draws to 17, and blackjack wins outright. **Bones** (`/inn/bones`) is three dice: build a pot, bank it before a single pip (frost) takes it, three alike is +10, and first to 50 wins. Each table shows a short tutorial the first time someone sits down, and *How to play* brings it back. The server deals and throws, so scores cannot be faked, and the dealer's hidden card never reaches the browser. Weekly boards go in the Herald. |
| **The Roll of Honour** (`/honours`) | Honours the County gives its officers, each a ribbon. Fifteen are on the roll from the start: Shield of the Pass, Iron of the North Gate, Frostfall Cross, Hearthkeeper's Ribbon, the Steward's Seal, the Star of the Jerall, the Bear of Bruma, the Wolf's Tooth, the Lantern-Bearer, the Quill of the Court, the Coin of the Treasury, the Chapel Ribbon, the Hammer of the Walls, the Shield-Wall and the Founder's Ribbon. The page has two forms. *Give an honour* picks the officer from a drop-down (yourself included), the honour from a drop-down whose ribbon shows in its own colours as it is picked, and takes a citation; it is written on the officer's Record of Service and can be withdrawn there. *Add an honour to the roll* picks from ten ready names (each with its colours and note filled in) or takes a name of your own with three chosen colours, previewing the ribbon as you go. Two honours are earned on their own: a Month of Service for each full four weeks sworn, and the Lantern of the Watch at 50, 150 and 400 hours. Ribbons show on the Record of Service, on Faces of Bruma and Face of the Day, beside office-holders on *Who sits at court*, and the week's honours go in the Herald. People are given honours as officers, so a new person is first added on *The Officers* page. |
| **The Jerall Herald** (`/herald`) | A weekly paper built from the site itself: watch hours, the top guard, gaps, the goal, figures caught, the ballad, proclamations, petitions, reports and the pass. An office with the Herald power adds a lead story. Past weeks stay readable. |

New powers to tick on offices, under **The Town**: *Set the town's goals and mark pledges handed over*, *Write the lead story of the Jerall Herald*, *Approve sent-in portraits, and take down ballad lines and portraits*, *Award honours to officers, withdraw them, and add new honours to the roll*. Data lives in `town-goals.json`, `town-ghost.json`, `town-ballad.json`, `town-faces.json` (pictures in `faces/`), `town-cheers.json`, `town-cards.json`, `town-bones.json`, `town-herald.json`, `honours.json` and `honour-types.json`.

## The top bar, the town's doors and the gate

Officers' pages have a grouped bar: *The Great Hall* and *The Watch* stay as plain links, and the rest sit under *The Coffers* (treasury, tax roll, licences, property), *Law* (court, gaol, reckoner, petitions), *The People* (people, guilds, service, officers) and *The County* (proclaim, archive, announcements, flourishes), each a menu with a one-line hint. *The Public Face* stays at the right. Visitors keep the flat public bar.

Under the Pale Pass line on every page, a row of six doors leads to the Herald, the ballad, the faces, the inn, the honours and the goal. An amber dot on a door means something is new there since that browser last looked.

On the Proclaim page, *Cry it at the gate* (ticked by default) makes the proclamation meet everyone who next opens the site, as a writ over the page. *I have read it* puts it away for good (remembered on the login for officers, in the browser for visitors, in `gate-seen.json`); *Later* keeps it away until tomorrow. Never more than one a visit; older unread ones wait their turn.

## Discord announcements

`/discord` (the new power *Choose what the County announces on Discord*) shows one card per channel (up to eight). On each the Steward pastes the channel's webhook address (or leaves it to Railway), names it, and sends a test to see where it lands; when an address is saved the site asks Discord what the webhook is called and shows that too. The Steward then tick which of 22 kinds of post run and choose the channel each kind goes to, previews each one exactly as Discord will show it, posts a test or a sample on demand, and lists what was lately sent. Any kind of post can also have a webhook of its own: pick *Its own channel…* in its drop-down, paste the address, save. Only that kind goes there, and it ignores the channel cards. The Herald goes out as a picture of the whole paper (`/herald.png`, drawn on the server with `@napi-rs/canvas` and the fonts in `vendor/fonts/`), attached to the post; if the picture cannot be drawn the stories go as text instead.

Every post carries its own banner from `public/discord/` (a 1200×300 painting for each kind, with the County's flag hanging on it), attached to the post itself so Discord never has to fetch it from the site. When a webhook address is saved on the site, the site also sets the County seal as that webhook's own face in Discord (only if the webhook had no face yet). Posts that fail are listed under *Lately sent* with Discord's reason, kept in `discord-log.json` across restarts, and counted in a red notice at the top of the page; proclamations, judgments and honours quote their text in a block, names are in bold, and each post ends with an arrow link back to the page it came from.

Sent to the public channel unless moved: proclamations, the Pale Pass changing state, judgments, the gaol (names and writ numbers only, never the grounds), new laws, town goals set and built, the pale figure caught, honours, oaths and raises, Lantern of the Watch milestones, five-in-a-row at Twenty-one, and on a schedule (Eastern time) the Face of the Day at 8 each morning, the Herald and the inn's champions on Sundas at 8 in the evening, and last week's ballad just after midnight on Morndas.

Sent to the officers' channel unless moved: new petitions, sent-in portraits waiting, the treasury going overdrawn, and each morning at 9 any guard who was on the rota yesterday and never clocked on.

Posts can never ping anyone (`allowed_mentions` is empty), they queue and wait out Discord's rate limits, and a failure never stops anything on the site. Without the webhook variables, nothing is sent.
