# Images: what the site needs, where to put it, and prompts to generate it

Every picture the site uses has a named **slot**. Generate or shoot the image, save it as
`images/_inbox/<slot>.png` (any size, any of png/jpg/webp), then run:

```bash
npm install            # once — installs sharp (resizing) and playwright (share images)
npm run images         # resizes/crops/compresses each inbox file into its slot and deletes the inbox copy
npm run images -- --list   # see every slot and whether a file is in place
```

Nothing else needs editing: the HTML already points at each slot's destination. Blog heroes
are the one dynamic case, covered at the bottom.

Rules that keep this honest and legal:

- **Never generate a face to stand in for a real person.** `about-portrait` is a real photo of Artem, full stop.
- No text, logos, badges, or certification marks inside images. B Lab's mark is trademarked; the wordmark is added by code.
- Ask the generator for **landscape 3:2 or 16:9** output (ChatGPT: "1536×1024"); the script crops to the slot.
- Keep the shared style block at the top of every prompt so the set looks like one photographer and one illustrator.

---

## Shared style block (paste this first, every time)

```
Brand context: Candor, a one-person sustainability-certification consultancy in Vancouver, BC.
Palette: warm off-white paper #ECEAE2, deep forest green #2D6B42, mid green #3D8A57,
near-black ink #0D1610, stone grey #C8C3B5. Mood: quiet, honest, field-notebook,
Pacific Northwest. No text, no letters, no logos, no watermarks, no badges.
```

### Illustration style (hero, 404, share-image background)

```
Style: ink-and-wash topographic illustration. Thin hand-drawn contour lines in forest green
ink on warm paper, occasional darker ridgelines, very sparse colour, soft paper grain, lots of
empty paper. Looks like a page from a surveyor's notebook, not a vector logo. Flat lighting,
no 3D, no gradients, no glow, no photorealism.
```

### Photography style (section breaks, industry cards)

```
Style: 35 mm film photograph, natural light, muted saturation, soft shadows, fine grain,
slightly faded blacks, a lot of negative space on one side. Candid and unposed. Pacific
Northwest light. No faces in focus, no brand names, no packaging text legible.
```

---

## Slots

| Slot (inbox filename) | Final size | Used where | Prompt (after the style blocks) |
|---|---|---|---|
| `hero-art` | 1400×1400 webp | Home hero, right half, faded into the paper | A single mountain-and-coast contour map in green ink, drawn as if surveying a small valley: nested contour rings, one dotted trail winding from bottom-left to a summit marker near the top-right, a tiny flag at the summit. Composition sits in the right two-thirds; the left third is almost blank paper. Square. |
| `lost-trail` | 1600×1000 webp | 404 page | The same surveyor's style: a contour map where the dotted trail stops at a torn edge of the paper, a small compass rose top-right, a question-mark-shaped bend in a river. Right two-thirds, blank paper left. |
| `og-bg` | 1200×630 webp | Background of all generated share cards | Very faint contour lines in green ink drifting in from the right edge over blank warm paper. Must stay almost empty: text will be drawn on top of the left two-thirds. Wide landscape. |
| `break-1` | 1920×1080 webp | Full-width break, upper page | Low morning mist over a stand of Douglas fir on a BC hillside, seen across a valley. Horizontal, horizon in the lower third, muted greens and greys. |
| `break-2` | 1920×1080 webp | Full-width break before About | Looking straight up a forest canopy from a trail, overcast sky, soft silhouettes of hemlock and cedar, slight lens softness at the edges. |
| `cta-bg` | 1920×1080 webp | Final call-to-action background (a dark overlay sits on top, so keep it mid-tone) | A ridge line at dusk, coastal mountains receding in layers, moody but not black, a sliver of water at the bottom. Nothing in the lower-left quadrant, where text sits. |
| `who-cannabis` | 1600×900 jpg | Industry card | Hands in gardening gloves tending young plants under soft greenhouse light, shot from above, soil and leaves, no product, no packaging. |
| `who-outdoor` | 1600×900 jpg | Industry card | Two hikers from behind on a coastal trail, packs and rain shells in muted colours, mist on the water below. |
| `who-food` | 1600×900 jpg | Industry card | A small café kitchen pass at opening time: steel counter, herbs in jars, flour dust in a shaft of window light, no visible faces. |
| `who-beauty` | 1600×900 jpg | Industry card | Unlabelled amber glass bottles and a ceramic dish of dried botanicals on linen, overhead, soft daylight. |
| `who-coffee` | 1600×900 jpg | Industry card | A roaster's workbench: green beans in a hessian sack, a cooling tray, a weathered notebook, morning light through an industrial window. |
| `who-studio` | 1600×900 jpg | Industry card | A small design studio table seen from above: tracing paper, a material sample board, a single plant, a laptop closed. Calm and tidy. |
| `about-portrait` | 1200×1200 jpg | About section | **Real photo only.** Shoot in soft window light, plain wall or workspace behind, head and shoulders, looking at camera. Drop it in the inbox as `about-portrait.jpg` and the script will crop it square. |

Everything already live is a placeholder stock image. Replace in this order for the most visible gain:
`hero-art` → `og-bg` → the three breaks → the six industry cards.

---

## Blog post heroes (picked up automatically)

Name the file `blog-<slug>.png`, where `<slug>` is the post's filename without `.html`.
Example: `images/_inbox/blog-how-long-does-b-corp-certification-take.png`.

`npm run images` writes it to `blog/images/<slug>.webp` (1600×900). Then `npm run rebuild`
(or the normal `npm run publish` for a new post) inserts the figure under the article header,
points the post's share tags at it, and uses it as the background of the featured card on the
blog index if that post is the newest. Posts that already have a hero figure are left alone.

### Blog hero prompt (current, approved style)

The user approved the soft, misty "still lake" look (it matches the blog index hero), not the
ink-and-wash style above. Use this for every new post hero; change only the SCENE line.

```
Wide 16:9 landscape illustration for a blog header. Soft, quiet, misty Pacific Northwest scene,
painted in a gentle soft-3D style: smooth matte forms, subtle depth, soft diffused morning light,
no harsh shadows, no glow, no hyper-detail. Looks hand-made and calm, not like glossy AI art or a photo.

SCENE: <one concrete object or place that stands for the post's idea, placed in the right third,
e.g. a weathered dock with a blank plaque on a post, mirrored in still water>. Layered mountain
ridges fade into low mist behind it, a few dark evergreens on the far right for depth.

The left half is mostly open soft mist over pale water and sky, so text can sit on it.

Palette: dominated by warm off-white #ECEAE2, muted sage and forest greens #5AA672 / #2D6B42,
soft stone grey #C8C3B5, small touches of warm wood. Low contrast; the edges fade into #ECEAE2.

No text, no letters, no numbers, no logos, no badges, no flags, no people, no watermark,
no border, no vignette.
```

Older prompt pattern (ink-and-wash, kept for reference):

```
A single-idea illustration for an article titled "<TITLE>". Depict <one concrete object or
scene that stands for the idea> as a surveyor's sketch: contour lines, one dotted path, a
small annotation mark where the key point is. Wide 16:9, subject in the right half, blank
paper on the left.
```

---

## Share images (LinkedIn, Slack, iMessage previews)

```bash
npx playwright install chromium     # once
npm run og -- --all                 # one branded card per post → blog/images/og/<slug>.jpg
npm run og -- --site                # the generic site card → images/heroes/webshare.jpg
```

Each card carries the Candor mark, the post's tag, its title with the last two words in green,
the URL and the month. If `og-bg` is in place it becomes the card background.

---

## Generated textures (not slots)

| File | Made by | Used where |
|---|---|---|
| `images/textures/grain.png` | static asset | Paper-grain overlay on every page (`sync-shared.js`) |
