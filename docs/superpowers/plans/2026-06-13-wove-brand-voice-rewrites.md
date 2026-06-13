# Wove Brand Voice Rewrites — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved brand-voice spec to all 8 audited captions across the 3 shipped ads, re-render them, and propagate the spec via memory + brief.

**Architecture:** Pure string-edits to existing Remotion compositions + one primitive default. Re-render with `npx remotion render`. No new components, no test framework — visual verification per render.

**Tech Stack:** Remotion 4.0.397, TypeScript, Tailwind v4. All edits in `~/projects/swipefit/marketing/wove-ads/src/`.

**Reference spec:** `~/projects/swipefit/docs/superpowers/specs/2026-06-13-wove-brand-voice-design.md` — section 9 lists every exact rewrite.

---

## Task 1: Ad 1A — three caption updates

**Files:**
- Modify: `marketing/wove-ads/src/compositions/Ad1A_StopScrolling.tsx`

- [ ] **Step 1: Replace the open hook**

Use Edit tool:

```
old_string:
        text="Swipe. Match. Buy."
new_string:
        text="Resale, but you have fun."
```

- [ ] **Step 2: Replace the Style DNA mid-hook**

```
old_string:
        text="The app learns your taste."
new_string:
        text="5 swipes. Calibrated."
```

- [ ] **Step 3: Replace the Coin Flip mid-hook**

```
old_string:
        text="Send a Coin Flip 🪙"
new_string:
        text="Flip the seller for 50% off."
```

- [ ] **Step 4: Verify only those 3 strings changed**

Run: `cd ~/projects/swipefit && grep -E "Swipe\. Match\. Buy\.|The app learns|Send a Coin Flip" marketing/wove-ads/src/compositions/Ad1A_StopScrolling.tsx`
Expected: no output (all 3 old strings are gone).

Run: `grep -E "Resale, but you have fun|5 swipes\. Calibrated|Flip the seller for 50% off" marketing/wove-ads/src/compositions/Ad1A_StopScrolling.tsx`
Expected: 3 matches.

---

## Task 2: PayoutChip — change default subline

**Files:**
- Modify: `marketing/wove-ads/src/shared/PayoutChip.tsx`

- [ ] **Step 1: Replace the default subline**

The current default `subline = "We take 10%."` violates the no-"we" rule. The default is what renders in Ad 1A (it doesn't pass an override).

Use Edit tool:

```
old_string:
  subline = "We take 10%.",
new_string:
  subline = "Wove takes 10.",
```

- [ ] **Step 2: Verify**

Run: `grep "Wove takes 10" marketing/wove-ads/src/shared/PayoutChip.tsx`
Expected: 1 match.

Run: `grep "We take 10" marketing/wove-ads/src/shared/PayoutChip.tsx`
Expected: no output.

---

## Task 3: Ad 1B — two caption updates

**Files:**
- Modify: `marketing/wove-ads/src/compositions/Ad1B_TinderForThrift.tsx`

- [ ] **Step 1: Replace the Stripe-sheet mid-hook**

```
old_string:
        text="Tap. Pay. Done."
new_string:
        text="One tap. Shipped."
```

- [ ] **Step 2: Replace the Order Placed subline**

```
old_string:
          sublineOverride={`${buyItem.title} · shipping to you`}
new_string:
          sublineOverride="Vintage Levi's. Shipping tomorrow."
```

Note: dropping the template literal because the line is now a fixed editorial sentence — naming the brand explicitly, not derived from data.

- [ ] **Step 3: Verify**

Run: `grep -E "Tap\. Pay\. Done|shipping to you" marketing/wove-ads/src/compositions/Ad1B_TinderForThrift.tsx`
Expected: no output.

Run: `grep -E "One tap\. Shipped|Vintage Levi's\. Shipping tomorrow" marketing/wove-ads/src/compositions/Ad1B_TinderForThrift.tsx`
Expected: 2 matches.

---

## Task 4: Ad 2A — two caption updates

**Files:**
- Modify: `marketing/wove-ads/src/compositions/Ad2A_TasteIn10Swipes.tsx`

- [ ] **Step 1: Replace the open hook**

```
old_string:
        text="We learn what you like."
new_string:
        text="It clocks you in 5 swipes."
```

- [ ] **Step 2: Replace the DNA reveal hook**

```
old_string:
        text="Now we get you."
new_string:
        text="Calibrated to your taste."
```

- [ ] **Step 3: Verify**

Run: `grep -E "We learn what you like|Now we get you" marketing/wove-ads/src/compositions/Ad2A_TasteIn10Swipes.tsx`
Expected: no output.

Run: `grep -E "It clocks you in 5 swipes|Calibrated to your taste" marketing/wove-ads/src/compositions/Ad2A_TasteIn10Swipes.tsx`
Expected: 2 matches.

---

## Task 5: Re-render Ad 1A

**Files:**
- Output: `marketing/ads/raw/wove_p1_va.mp4` (overwrites)

- [ ] **Step 1: Render**

Run from `~/projects/swipefit/marketing/wove-ads/`:

```bash
npx remotion render wove-p1-va ../ads/raw/wove_p1_va.mp4 --log=info
```

Expected: "Rendered 540/540" then "Encoded 540/540" then file size summary. Render time ~30-45 sec.

- [ ] **Step 2: Spot-check the new captions on three frames**

```bash
cd ~/projects/swipefit/marketing/ads/raw
for t in 0.5 5.5 9.0 12.5; do
  ffmpeg -y -i wove_p1_va.mp4 -ss "$t" -vframes 1 -vf scale=540:-1 -loglevel error "v6-t${t}.jpg"
done
```

Read each frame using the Read tool and confirm:
- **t=0.5s** shows "Resale, but you have fun." (NOT "Swipe. Match. Buy.")
- **t=5.5s** shows "5 swipes. Calibrated."
- **t=9.0s** shows "Flip the seller for 50% off."
- **t=12.5s** shows "Wove takes 10." on the PayoutChip subline

If any frame still shows the old caption, revisit the corresponding task before proceeding.

- [ ] **Step 3: Clean up scratch frames**

```bash
rm ~/projects/swipefit/marketing/ads/raw/v6-t*.jpg
```

---

## Task 6: Re-render Ad 1B

**Files:**
- Output: `marketing/ads/raw/wove_p1_vb.mp4` (overwrites)

- [ ] **Step 1: Render**

```bash
cd ~/projects/swipefit/marketing/wove-ads
npx remotion render wove-p1-vb ../ads/raw/wove_p1_vb.mp4 --log=info
```

Expected: "Rendered 450/450" then "Encoded 450/450". Render time ~25-40 sec.

- [ ] **Step 2: Spot-check the new captions**

```bash
cd ~/projects/swipefit/marketing/ads/raw
for t in 9.0 13.2; do
  ffmpeg -y -i wove_p1_vb.mp4 -ss "$t" -vframes 1 -vf scale=540:-1 -loglevel error "v3-t${t}.jpg"
done
```

Read each frame and confirm:
- **t=9.0s** shows "One tap. Shipped." over the Stripe sheet
- **t=13.2s** shows "Vintage Levi's. Shipping tomorrow." as the Order Placed subline

- [ ] **Step 3: Clean up**

```bash
rm ~/projects/swipefit/marketing/ads/raw/v3-t*.jpg
```

---

## Task 7: Re-render Ad 2A

**Files:**
- Output: `marketing/ads/raw/wove_p2_va.mp4` (overwrites)

- [ ] **Step 1: Render**

```bash
cd ~/projects/swipefit/marketing/wove-ads
npx remotion render wove-p2-va ../ads/raw/wove_p2_va.mp4 --log=info
```

Expected: "Rendered 450/450" then "Encoded 450/450". Render time ~25-40 sec.

- [ ] **Step 2: Spot-check the new captions**

```bash
cd ~/projects/swipefit/marketing/ads/raw
for t in 0.5 11.0; do
  ffmpeg -y -i wove_p2_va.mp4 -ss "$t" -vframes 1 -vf scale=540:-1 -loglevel error "v2-t${t}.jpg"
done
```

Read each frame and confirm:
- **t=0.5s** shows "It clocks you in 5 swipes." (NOT "We learn what you like.")
- **t=11.0s** shows "Calibrated to your taste." (NOT "Now we get you.")

- [ ] **Step 3: Clean up**

```bash
rm ~/projects/swipefit/marketing/ads/raw/v2-t*.jpg
```

---

## Task 8: Update manifest with new versions

**Files:**
- Modify: `marketing/ads/manifest.json`

- [ ] **Step 1: Bump Ad 1A version + update captions**

Use Edit tool:

```
old_string:
      "hook_open": "Swipe. Match. Buy.",
      "hook_mid": [
        "The app learns your taste.",
        "Send a Coin Flip 🪙"
      ],
new_string:
      "hook_open": "Resale, but you have fun.",
      "hook_mid": [
        "5 swipes. Calibrated.",
        "Flip the seller for 50% off."
      ],
```

```
old_string:
      "version": 5,
      "status": "shipped",
      "notes": "Hook uses 'Match' rhetorically for 3-beat rhythm; no match UI appears. Feature-dense walkthrough of Wove's full value loop."
new_string:
      "version": 6,
      "status": "shipped",
      "notes": "Captions rewritten per brand-voice spec (2026-06-13). Feature-dense walkthrough of Wove's full value loop."
```

- [ ] **Step 2: Bump Ad 1B version + update captions**

```
old_string:
      "hook_mid": [
        "Tap. Pay. Done."
      ],
new_string:
      "hook_mid": [
        "One tap. Shipped."
      ],
```

```
old_string:
      "output": "raw/wove_p1_vb.mp4",
      "file_size_mb": 6.0,
      "version": 2,
new_string:
      "output": "raw/wove_p1_vb.mp4",
      "file_size_mb": 6.0,
      "version": 3,
```

- [ ] **Step 3: Bump Ad 2A version + update captions**

```
old_string:
      "hook_open": "We learn what you like.",
      "hook_mid": [
        "Now we get you."
      ],
new_string:
      "hook_open": "It clocks you in 5 swipes.",
      "hook_mid": [
        "Calibrated to your taste."
      ],
```

```
old_string:
      "output": "raw/wove_p2_va.mp4",
      "file_size_mb": 5.6,
      "version": 1,
new_string:
      "output": "raw/wove_p2_va.mp4",
      "file_size_mb": 5.6,
      "version": 2,
```

- [ ] **Step 4: Verify the JSON is still valid**

Run: `python3 -c "import json; json.load(open('marketing/ads/manifest.json'))" && echo OK`
Expected: `OK`

---

## Task 9: Save memory pointer to the voice spec

**Files:**
- Create: `/Users/lucaclifton/.claude/projects/-Users-lucaclifton/memory/wove-brand-voice.md`
- Modify: `/Users/lucaclifton/.claude/projects/-Users-lucaclifton/memory/MEMORY.md`

- [ ] **Step 1: Write the memory file**

Use Write tool. Path: `/Users/lucaclifton/.claude/projects/-Users-lucaclifton/memory/wove-brand-voice.md`

Content:

```markdown
---
name: wove-brand-voice
description: Wove brand voice — SSENSE × Liquid Death blend, third-person self-reference, no "we", specific over general; full spec at ~/projects/swipefit/docs/superpowers/specs/2026-06-13-wove-brand-voice-design.md
metadata:
  type: project
---

Wove ad copy and in-product captions follow a defined brand voice. **Always check the full spec before writing or rewriting captions.**

**Spec location:** `~/projects/swipefit/docs/superpowers/specs/2026-06-13-wove-brand-voice-design.md`

**Why:** First ad-iteration captions defaulted to "we" register and generic phrasing ("Now we get you" → felt smug). Spec was approved 2026-06-13 after a brainstorming session with the user.

**How to apply (cheat sheet — defer to full spec for edge cases):**
- Personality: SSENSE × Liquid Death balanced — confident through specificity, with quotable edge
- Audience: eclectic (no heavy slang, no millennial gloss)
- **No "we"** — Wove in third person or no self-reference. "Wove takes 10." not "We take 10."
- Specific > general — drop names, eras, regions, prices, gestures
- Trust the reader — don't explain the joke or product
- Punch up at boring incumbents, never at the user
- Hook (0–1.5s): lean Liquid Death — punchy, opinion-having
- Mid-ad (2–10s): lean SSENSE — specific, terse
- UI toasts: functional system voice
- Celebration toasts: ALL CAPS single phrase, no exclamation
- CTA outro: brand voice OFF, pragmatic
- Casing: sentence case default, no all-lowercase, no exclamation marks ever
- Vocabulary: banned terms include "revolutionizing", "journey", "ecosystem", "curated", "vibe", "iconic", "obsessed", "main character"

**Exception:** Founder-persona ads can use first person — that's a real person talking, not the brand.

Related: [[wove-project]], [[wove-ad-content-stack]], [[wove-ui-surface]]
```

- [ ] **Step 2: Add the pointer to MEMORY.md**

Use Edit tool on `/Users/lucaclifton/.claude/projects/-Users-lucaclifton/memory/MEMORY.md`:

```
old_string:
- [Wove UI Surface](wove-ui-surface.md) — Discovery is swipe-only (Tinder-style single card); no grid view except in personal Liked section
new_string:
- [Wove UI Surface](wove-ui-surface.md) — Discovery is swipe-only (Tinder-style single card); no grid view except in personal Liked section
- [Wove Brand Voice](wove-brand-voice.md) — SSENSE × Liquid Death blend; no "we"; spec at docs/superpowers/specs/2026-06-13-wove-brand-voice-design.md
```

- [ ] **Step 3: Verify**

Run: `grep "wove-brand-voice" /Users/lucaclifton/.claude/projects/-Users-lucaclifton/memory/MEMORY.md`
Expected: 1 match.

---

## Done

After all tasks complete, present the user with three video files:

```
~/projects/swipefit/marketing/ads/raw/wove_p1_va.mp4  (Ad 1A v6 — re-captioned)
~/projects/swipefit/marketing/ads/raw/wove_p1_vb.mp4  (Ad 1B v3 — re-captioned)
~/projects/swipefit/marketing/ads/raw/wove_p2_va.mp4  (Ad 2A v2 — re-captioned)
```

…with a summary of the 8 caption changes, and ask whether to commit the spec + plan + memory + composition updates to git (currently held back per user's "no commits without ask" rule).
