# Ashcombe Board

A lightweight, single-page kanban board for organizing projects into tiles with subtask checklists. No build step, no backend — everything runs in the browser and saves to `localStorage`.

## Download

**Option A — clone with git:**

```bash
git clone https://github.com/BeardedTech0o/ashcombe-kanban.git
cd ashcombe-kanban
```

**Option B — download as a ZIP:**

1. Go to the [repository page](https://github.com/BeardedTech0o/ashcombe-kanban).
2. Click **Code → Download ZIP**.
3. Unzip it anywhere on your computer.

**Option C — single file, no folder:**

If you'd rather keep just one file on your desktop instead of a folder of three, download [`ashcombe-kanban.single.html`](ashcombe-kanban.single.html) from the repo (open it and click **Download raw file**) and open that directly. It's the same app with the CSS and JS bundled inline.

## Running it

The app is three static files (`index.html`, `app.js`, `style.css`) with no dependencies to install — or one bundled file (`ashcombe-kanban.single.html`, see Option C above). Just serve the folder and open it in a browser — opening `index.html` (or the single-file bundle) directly via `file://` also works, but a local server avoids any browser restrictions.

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
- **Single-file bundle:** download the latest `ashcombe-kanban.single.html` and **save it over the same file path and filename** you're already using. If you save it to a new location, some browsers treat that as a different origin and won't show your existing board — in that case, copy the `ashcombe-kanban-v1` entry from DevTools → Application → Local Storage on the old file before switching, and paste it in at the new one.
- To regenerate the single-file bundle yourself from the source files, run `node build-single-file.js` (requires Node.js) — this produces `ashcombe-kanban.single.html`.

## Browser support

Any modern browser (Chrome, Firefox, Safari, Edge) with `localStorage` and drag-and-drop support.
