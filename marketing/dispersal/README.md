# Wove Dispersal — week-by-week post artifacts

This folder is the operational handoff between Claude (generates captions + schedule)
and the human (uploads to Metricool dashboard for auto-publish).

## What's in here

- `captions.json` — 18 caption variants (6 ads × 3 platforms). Single source of truth.
- `schedule-week-NN.json` — one per week. Maps ad → platform → day/time.
- `README.md` — this file.

## Workflow per week

1. Claude generates the next week's `schedule-week-NN.json` based on which ads still have headroom in `captions.json.ads_used_count` and what performed last week (from `wove-dispersal-tracking.md` memory).
2. Human reviews the schedule; tweaks times/ads as needed.
3. Human opens Metricool dashboard at metricool.com.
4. For each entry in the schedule:
   a. Click "Create post" → select platform from the schedule entry.
   b. Upload the MP4 from `~/projects/swipefit/marketing/ads/raw/{ad_id}.mp4`.
   c. Paste the matching caption from `captions.json[ads][{ad_id}][{platform}]`.
   d. For TikTok: also paste the hashtags array.
   e. For YouTube: paste the title + description into the respective fields.
   f. Set publish time per schedule entry (Metricool handles timezone).
   g. Click "Schedule" — Metricool queues for auto-publish.
5. After all 8 entries are queued, verify Metricool's queue view shows 8 posts.

## Brand voice

All captions follow `docs/superpowers/specs/2026-06-13-wove-brand-voice-design.md`.

Key rules:
- No "we" — Wove in third person or no self-reference
- Specific over general (names, eras, prices, gestures)
- TikTok captions can be lowercase; IG must be sentence case; YT search-friendly
- IG CTA always includes "send this to a friend" variant (sends-per-reach is the Reels ranking signal)
- Hashtags: max 3-4 on TikTok; not used on IG (per 2026 Mosseri guidance, hashtags lost rank weight)

## Quota tracking

Metricool free tier = 50 posts/month. Plan = ~32/month. Track current consumption
weekly to avoid surprise blocks. Upgrade path: Starter $22/mo for unlimited.
