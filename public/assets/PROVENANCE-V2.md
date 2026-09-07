# OpenArt hospital sprite originals

Generated through the owner's signed-in OpenArt account in Google Chrome on 2026-09-07. No subscription changes or purchases. Only existing generation credits used.

Project: **Scrubssitel – Hospital Sprites**

Project URL: https://openart.ai/suite/create-image/gpt-image-2?projectId=jVHudIA6BRrUlIK7VAK6

## Staff atlas

- Original: `staff-atlas-original.png`
- OpenArt asset ID: `F7VRQE5GhS5B7UkWNNiw`
- Model: GPT Image 2
- Requested output: 3:4, 2k, High quality, one image
- Creation time displayed by OpenArt: 2026-09-07 20:25:07 (browser local time, Europe/Berlin)
- Credits charged: 150
- Download: PNG through OpenArt Download menu
- Downloaded original filename: `openart-gpt-image-2-1_1788805619549_b68c2aaf.png`
- Actual dimensions: 1344 × 1792 pixels
- SHA-256: `cc95e9f9cb3f382b7379d0f030704b13f2a13618b6022f1b16f3d3ee671d05b0`
- Prompt: `staff-prompt.txt`, visibly verified in OpenArt before submission
- No uploaded image reference; the previous ensemble was inspected locally to inform the text description.

### Layout and visual verification

Exactly 3 columns × 4 rows, 448 × 448 pixels per logical cell. Zero-based (column,row):

| Person | Pose A | Pose B |
|---|---|---|
| Curly-haired teal-scrubs male doctor, glasses | (0,0) | (0,1) |
| Stocky red-haired blue-scrubs nurse | (1,0) | (1,1) |
| Brown-skinned bob-haired receptionist, orange waistcoat | (2,0) | (2,1) |
| Black woman surgeon, plum scrubs | (0,2) | (0,3) |
| Older East Asian male doctor, white coat | (1,2) | (1,3) |
| Older silver-haired maintenance man, mustard jumpsuit | (2,2) | (2,3) |

All 12 figures are complete from hair to shoes, independently spaced on magenta. Identity and clothing are consistent between paired cells. The model does **not** consistently reverse the legs between requested poses: the teal doctor and receptionist are near duplicates, while other second frames vary arm placement and stride. This is a material animation limitation of the source. It should not be described as a perfect opposite-step walking cycle. The figures are polished 3D chibi art with large heads and visible shoes. Original files have not been edited.

## Patient atlas

- OpenArt asset ID: `fCcyIH6ogb8tLjxmJiyR`
- Model: GPT Image 2
- Requested output: 3:2, 2k, High quality, one image
- Creation time displayed by OpenArt: 2026-09-07 20:29:57 (browser local time, Europe/Berlin)
- Credits charged: 160 (balance changed from 95,850 to 95,690)
- Prompt: `patient-prompt.txt`, visibly verified in OpenArt before submission
- Original: `patient-atlas-original.png`
- Download: PNG through OpenArt Download menu. It appeared locally after a delay while native Chrome UI observations were stale.
- Downloaded original filename: `openart-gpt-image-2-1_1788805889517_331d38de.png`
- Actual dimensions: 2016 × 1344 pixels (3 columns × 2 rows; 672 × 672 pixels per logical cell)
- SHA-256: `4f2540effe10b4b493e4ccfa9efe1edd9ad8e56eb0c99a3f816d6c10d8716b95`
- Columns left to right: young coral-cardigan woman; round middle-aged man with violet shirt and mustard trousers; elderly brown-skinned woman with turquoise dress and silver bun.
- Row 1 is requested pose A and row 2 requested pose B. All six figures are fully contained and independently spaced on magenta. The second-row coral-cardigan woman has an extra rear arm/hand and should not be used without correction; use her row-1 base. Other pose pairs vary subtly and are not perfect opposite-step cycles. Original file has not been edited.

## Furniture atlas

Prompt prepared in `props-prompt.txt`. Not submitted. The optional request was stopped because Chrome was being used interactively for other work; the parent agent confirmed it would use enriched procedural furniture. No furniture-generation credits were spent.

Total credits spent on these two completed atlases: **310**. Chrome control released at handoff. No game checkout files were modified by this asset-generation subtask.

## Game integration

The OpenArt sheets were mechanically split into their grid cells, keyed from magenta to transparency, cropped to their visible bounds and scaled to 192×256 PNGs. The first coral-cardigan patient frame is reused for the second slot because the generated second pose contained an extra arm. No redrawn character artwork or alternate image-generation service was used. Canvas animation adds directional facing, gait bob, leaning, resting motion and pose changes while treating patients. Source sheets remain in the owner's local `scrubssitel-assets/v2` folder.
