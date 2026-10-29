# YumSum

Your YumSum Pinterest board as a cookbook, hosted free on GitHub.

- A square grid of every pin, with Food / Drinks / Sweets filters and search.
- A page per food: the original photo or video, ingredients rescaled for however many people you're cooking
  for in Iranian kitchen units (پیمانه، قاشق غذاخوری، قاشق چای‌خوری، گرم), calories and macros per person,
  and the method. فارسی / English.
- **What can I cook?** List what's in your kitchen: it ranks your saved recipes by how much of each you can
  make and shows what's missing. Or ask the AI for a brand-new idea from those ingredients.

## How it works

Everything runs on GitHub, with no server:

- **GitHub Actions** (`.github/workflows/update.yml`) runs every 3 hours. `scripts/sync.ts` reads your
  public board, saves new pins to `data/pins.json`, and has the AI write recipes for new pins into
  `data/recipes.json`. Then it rebuilds the site.
- **GitHub Pages** serves the site. Scaling, unit conversion, calories and pantry matching all happen
  in the page itself.
- **AI ideas** (`.github/workflows/idea.yml`): the "Ask the AI" button opens a GitHub issue titled
  `Suggest: …`. The Action writes a recipe (`scripts/idea.ts`), replies on the issue and adds the recipe
  to the site. Only issues you open are answered.

The AI is any OpenAI-compatible API. The default is **Kimi K2.6 on NVIDIA's free developer tier**
(it reads images, which matters because most pins have no written recipe). To switch, for example to
Kimi K3 on Moonshot's own paid API, set the `AI_BASE_URL` and `AI_MODEL` variables.

## Pinterest notes

- The board must be **public**. No Pinterest developer account is needed.
- Pinterest's public feed only lists a board's newest ~50 pins. Everything the app sees is kept, so new
  pins keep arriving. For older pins, paste their links into `extra-pins.txt` (the "+ Add older pins"
  link at the bottom of the site opens it for editing).
- Videos play through Pinterest's own embedded player.

## Setup

1. **AI key:** sign up at https://build.nvidia.com and create an API key (starts with `nvapi-`).
2. **GitHub repo:** create a **public** repository (e.g. `yumsum`) and upload this folder
   (everything except `node_modules`, `.next`, `out` and `.env.local`).
3. In the repo's **Settings**:
   - *Secrets and variables → Actions → Secrets:* add `AI_API_KEY`.
   - *Secrets and variables → Actions → Variables:* add `PINTEREST_USERNAME` (and `PINTEREST_BOARD`
     if your board isn't called `yumsum`).
   - *Pages:* set **Source** to **GitHub Actions**.
4. **Actions** tab → **Update YumSum** → **Run workflow**. Your site appears at
   `https://YOUR-GITHUB-NAME.github.io/yumsum/` a few minutes later. With the free AI tier, recipes for a
   big board fill in over a few runs (about 25 per run).

On your phone, open the site and use "Add to Home Screen".

## Running locally

```
npm install
npm run sync      # reads the board and writes recipes (uses .env.local)
npm run dev       # http://localhost:3000
```
