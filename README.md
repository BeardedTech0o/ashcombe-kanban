# nullboard

A lightweight, single-page kanban board for organizing projects into tiles with subtask checklists. No build step, no backend — everything runs in the browser and saves to `localStorage`.

## Download

**Option A — clone with git:**

```bash
git clone https://github.com/BeardedTech0o/nullboard.git
cd nullboard
```

**Option B — download as a ZIP:**

1. Go to the [repository page](https://github.com/BeardedTech0o/nullboard).
2. Click **Code → Download ZIP**.
3. Unzip it anywhere on your computer.

**Option C — single file, no folder:**

If you'd rather keep just one file on your desktop instead of a folder of three, download [`nullboard.single.html`](nullboard.single.html) from the repo (open it and click **Download raw file**) and open that directly. It's the same app with the CSS and JS bundled inline.

## Running it

The app is three static files (`index.html`, `app.js`, `style.css`) with no dependencies to install — or one bundled file (`nullboard.single.html`, see Option C above). Just serve the folder and open it in a browser — opening `index.html` (or the single-file bundle) directly via `file://` also works, but a local server avoids any browser restrictions.

**Using Python (already installed on most systems):**

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

**Using Node.js:**

```bash
npx serve .
```

**Or just open the file directly:**

Double-click `index.html`, or open it from your browser with `File → Open`.

## Using the board

- **Create a project** — click **New Project** in the top bar, then choose **Blank Project** or **Choose From Template**.
- **Templates** — pick an existing template to prefill a project with tiles and subtasks, or click **Add Template** to define your own (one tile title + a list of subtasks per line).
- **Tiles start unplaced** — every tile you create (blank or from a template) lands in the project's list in the sidebar, numbered in order. Nothing is added to a board column automatically.
- **Move a tile onto the board** — drag a tile from the sidebar onto a column (**To Do**, **In Progress**, **Awaiting Sign-Off**, **Completed**) when you're ready to work on it. Tiles moved onto the board show which project they belong to, along with their tile number.
- **Subtasks** — expand a tile on the board to check off subtasks and track progress.
- **Subtask notes** — click the note icon next to a subtask to add one or more notes to it (press Enter or click **add** after typing each one). The icon shows a count once a subtask has notes, so you can tell at a glance which ones do.
- **Rename** — double-click a project or tile name to rename it inline.
- **Archive / delete** — use the icons on a project row to archive or delete it; archived projects are hidden from the sidebar but reachable from the **Archived** button at the bottom.
- **Themes** — open **Settings** to switch the accent color theme.
- **Font size** — open **Settings** and pick X-Small, Small, Medium, Large, or X-Large to scale text across the whole app.
- **Data storage** — everything (projects, tiles, templates, theme, font size) is saved to your browser's `localStorage`. Clearing your browser data or using a different browser/device will not carry your board over. Use **Settings → Clear Board** to reset projects and tiles while keeping templates and theme.

## Mobile / portrait use

On narrower screens (phones, portrait tablets) the layout adapts automatically:

- The sidebar collapses behind a menu button in the top bar and slides in as an overlay when tapped.
- Board columns become full-width and swipeable — swipe left/right to move between **To Do**, **In Progress**, **Awaiting Sign-Off**, and **Completed**.

## Updating to a new version

Your board data is saved in your browser's `localStorage`, keyed to the exact URL/file path you open the app from — not stored inside the files themselves. To update:

- **Git clone / folder setup:** `git pull`, then reload the page from the same URL/path you've been using. Data carries over automatically since the origin doesn't change.
- **Single-file bundle:** download the latest `nullboard.single.html` and **save it over the same file path and filename** you're already using. If you save it to a new location, some browsers treat that as a different origin and won't show your existing board — in that case, copy the `ashcombe-kanban-v1` entry from DevTools → Application → Local Storage on the old file before switching, and paste it in at the new one.
- To regenerate the single-file bundle yourself from the source files, run `node build-single-file.js` (requires Node.js) — this produces `nullboard.single.html`.

## Browser support

Any modern browser (Chrome, Firefox, Safari, Edge) with `localStorage` and drag-and-drop support.

## Design system

The visual design is driven by tokens in [`design-system/tokens.json`](design-system/tokens.json) (see [`design-system/README.md`](design-system/README.md) for the full rationale). The task-card family — board tiles, tags, and the progress bar — plus buttons, badges, and inputs across the app now use the locked radius, shadow, and colour tokens, and the typeface is Google Sans Flex throughout. The locked typography scale is applied where the mapping is unambiguous: the app title and modal titles use the H1 tier, and small metadata text (badge counts, the sidebar "Projects" heading, progress labels, etc.) uses the Label tier. The H2 and Body tiers are defined as CSS variables but not yet applied anywhere — the scale collapses the app's current ~9 body-text sizes down to a single 1rem, and there's no defined mapping for things like task tile titles, project names, or column labels, so applying it there needs a decision (and a visual pass) rather than a guess. Not yet retro-fitted, per the design system's own open questions: dark mode, the status colours (To Do / In Progress / Awaiting Sign-Off / Completed), the danger colour, and the accent theme picker (which offers four presets, none of them the locked teal) — these need a decision before they're touched.
