# Store assets – TabMaster

Everything for the store listings of TabMaster in one place: images, logo sources and the store texts, for the Chrome Web Store and Microsoft Edge Add-ons at once. One image set serves both stores (the sizes are accepted by both).

This folder is not part of the extension package. The packager (`.github/scripts/package-extension.mjs`) skips `store-assets/`, and changes here do not start a release.

## Contents

```
store-assets/
├─ listing.md                          store texts, search terms and field values (both stores; store-only parts are marked)
├─ screenshots/                        5 × 1280×800, PNG without alpha
├─ promo-small-440x280.png             small promo tile
├─ promo-marquee-1400x560.png          large promo tile (Chrome "marquee", Edge "large")
├─ brand/
│  ├─ logo.svg                         logo master (128 px grid, artwork 96 px + 16 px margin)
│  ├─ logo-small.svg                   version for 16, 32 and 48 px (the tile fills the area)
│  ├─ logo-300x300.png                 Edge logo
│  └─ logo-512.png
├─ _source/                            generator for all images and icons
│  ├─ build.mjs                        screenshots and promo tiles
│  ├─ make-icons.mjs                   icons and logos from brand/*.svg
│  └─ render.mjs                       helper (headless Edge or Chrome)
└─ TabMaster-<version>.zip             built package (git-ignored)
```

## Which file goes where

| Store field | File | Chrome | Edge |
|---|---|---|---|
| Extension icon 128 × 128 | `../icons/icon128.png` (inside the package) | store icon | automatic |
| Logo 300 × 300 | `brand/logo-300x300.png` | – | logo |
| Screenshots | `screenshots/screenshot-1-…` to `screenshot-5-…` | up to 5 | up to 6 |
| Small tile 440 × 280 | `promo-small-440x280.png` | optional, but listings without it rank further down | optional |
| Large tile 1400 × 560 | `promo-marquee-1400x560.png` | optional | optional |
| Package | `TabMaster-<version>.zip` | built by the release pipeline | upload by hand the first time, pipeline afterwards |

The screenshots, in the recommended order (1 is the main image): rename tabs and icons, quick rule popup, rules dashboard, the five URL conditions, private and synced backup. The tiles cannot be localised in either store.

## File naming

Files that apply to one store only carry the store in their name (`…-chrome.…` or `…-edge.…`). Everything without such a suffix is shared by both stores.

## Regenerate the images

Needs Node 20 and Microsoft Edge (or Chrome). From the extension folder:

```
node store-assets/_source/build.mjs            # all screenshots and both tiles
node store-assets/_source/build.mjs 3 promo    # only screenshot 3 and the tiles
node store-assets/_source/make-icons.mjs       # icons/icon16/32/48/128.png and brand/logo-*.png
```

- Popup and dashboard in the screenshots are the real `popup/popup.html` and `options/options.html` with their CSS and JS, filled with example data (only `example.com`). After a change to the interface, run `build.mjs` again.
- Headlines, background and texts are in `_source/build.mjs`. Only the tab strips in screenshot 1 and in the large tile are a simplified illustration, labelled as such.
- The right-click dialog (`content.js`) is not shown: it still has the old purple design, which does not match the blue rest.
