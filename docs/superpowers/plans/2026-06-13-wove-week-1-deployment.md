# Wove Week 1 Marketing Deployment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> This plan is HYBRID: tasks marked **[CODE]** are agent-executable; tasks marked **[HUMAN]** require Luca to act in a browser / mobile app; **[OBSERVATIONAL]** tasks watch a previously scheduled event.

**Goal:** By end of Week 1, Wove's 6 brand-voice-compliant ads are scheduled and auto-publishing to TikTok, Instagram Reels, and YouTube Shorts via Metricool, with all dispersal artifacts version-controlled and a memory schema tracking what posted where.

**Architecture:** Code tasks produce three artifacts in `marketing/dispersal/` (captions.json, schedule-week-01.json, README runbook) plus a memory pointer for tracking. Human tasks cover account creation, OAuth connections, Metricool dashboard upload, and engagement seeding. No Remotion re-rendering needed — the 6 MP4s already produced from source have no platform watermarks, so the SAME files work on all three platforms; only the post-text captions differ per platform.

**Tech Stack:** Existing — Remotion 4 pipeline at `marketing/wove-ads/`, project memory at `~/.claude/projects/-Users-lucaclifton/memory/`. New — Metricool web dashboard (free tier), `marketing/dispersal/` artifact folder.

**Reference docs:**
- Strategy spec: `docs/superpowers/specs/2026-06-13-wove-deployment-strategy.md`
- Brand voice spec: `docs/superpowers/specs/2026-06-13-wove-brand-voice-design.md`
- Ad manifest: `marketing/ads/manifest.json`

---

## File structure

```
marketing/dispersal/
├── captions.json              # NEW — per-platform captions for all 6 ads
├── schedule-week-01.json      # NEW — Mon–Sun schedule mapping
└── README.md                  # NEW — usage + Metricool runbook

~/.claude/projects/-Users-lucaclifton/memory/
├── wove-dispersal-tracking.md # NEW — schema + log of posts
└── MEMORY.md                  # UPDATE — add pointer to tracking memory
```

---

## Task 1: Generate per-platform captions for all 6 ads [CODE]

**Files:**
- Create: `marketing/dispersal/captions.json`

- [ ] **Step 1: Create the dispersal directory**

```bash
mkdir -p ~/projects/swipefit/marketing/dispersal
```

- [ ] **Step 2: Write captions.json**

Use the Write tool. Path: `/Users/lucaclifton/projects/swipefit/marketing/dispersal/captions.json`. Content (exact):

```json
{
  "$schema_note": "Per-platform caption variants for each shipped ad. Three platforms per ad. Each caption follows the brand voice spec at docs/superpowers/specs/2026-06-13-wove-brand-voice-design.md. TikTok = lowercase friendly + 3-4 hashtags max. Instagram = sentence case + 'send this to a friend' CTA (sends-per-reach beats likes as a ranking signal). YouTube Shorts = search-friendly title + 1-sentence description.",
  "url": "wove.shop/waitlist",
  "ads": {
    "wove-p1-va": {
      "title_internal": "Coin Flip + Style DNA + 90/10",
      "tiktok": {
        "caption": "send the seller a coin flip. win 50% off. real money on the line. spot #843 left.",
        "hashtags": ["#thrift", "#resale", "#vintagefashion", "#wove"]
      },
      "instagram": {
        "caption": "Coach bag, $68. Sent a coin flip. Won. Paid $34. Send this to a friend who thrifts. wove.shop/waitlist"
      },
      "youtube_shorts": {
        "title": "Coin flip the seller for 50% off — Wove",
        "description": "Vintage Coach $34 instead of $68. Send a Coin Flip on Wove, the Tinder-for-thrift app. Join the waitlist: wove.shop/waitlist"
      }
    },
    "wove-p1-vb": {
      "title_internal": "Liked wall + Stripe Pay",
      "tiktok": {
        "caption": "swipe right = saves to liked. tap once. shipped. that's the loop.",
        "hashtags": ["#thrift", "#resale", "#fashionresale", "#wove"]
      },
      "instagram": {
        "caption": "Your Liked wall fills as you swipe. Tap once. Shipped. Send this to a friend who needs a closet refresh. wove.shop/waitlist"
      },
      "youtube_shorts": {
        "title": "How buying on Wove works — tap once, shipped",
        "description": "Vintage Levi's $32, shipping tomorrow. Wove is Tinder for thrift. Swipe, save, buy. Join: wove.shop/waitlist"
      }
    },
    "wove-p2-va": {
      "title_internal": "Style DNA learning + match badge",
      "tiktok": {
        "caption": "the algorithm is psychic. five swipes = style profile = 94% match on a coach bag.",
        "hashtags": ["#styledna", "#thrift", "#fashionai", "#wove"]
      },
      "instagram": {
        "caption": "Vintage. Earth. Utility. Five swipes and the app knew. Send this to your most chronically online thrift friend. wove.shop/waitlist"
      },
      "youtube_shorts": {
        "title": "AI knows your style in 5 swipes — Wove Style DNA",
        "description": "Style DNA on Wove learns your taste after 5 likes. Vintage Streetwear archetype. 94% match. Join: wove.shop/waitlist"
      }
    },
    "wove-p3-va": {
      "title_internal": "Seller side — listing → sold → payout",
      "tiktok": {
        "caption": "your closet is sitting on cash. sold in 4 hrs. +$28.80 to your balance. wove takes 10.",
        "hashtags": ["#resell", "#sidehustle", "#thriftflip", "#wove"]
      },
      "instagram": {
        "caption": "$32 vintage sale. $28.80 into your balance. Wove takes 10, not 20. Send this to a friend with a closet to flip. wove.shop/waitlist"
      },
      "youtube_shorts": {
        "title": "How selling on Wove works — keep 90%",
        "description": "List in 60 seconds. Sold in 4 hours. Sellers keep 90% on Wove vs 80% on Depop. Join: wove.shop/waitlist"
      }
    },
    "wove-p4-va": {
      "title_internal": "Chat → offer → ship (closed loop)",
      "tiktok": {
        "caption": "no more dms and venmo links. chat. offer. accepted. shipped. all in one app.",
        "hashtags": ["#thrift", "#resale", "#fashionapp", "#wove"]
      },
      "instagram": {
        "caption": "Negotiate. Buy. Track. All in Wove. No more DMs and Venmo links. Send this to a friend who's tired of Depop chaos. wove.shop/waitlist"
      },
      "youtube_shorts": {
        "title": "Chat to delivered, one app — Wove",
        "description": "Coach bag, $48 offer, accepted in 12 min, shipped, delivered. The whole loop in Wove. Join: wove.shop/waitlist"
      }
    },
    "wove-p5-va": {
      "title_internal": "Waitlist FOMO",
      "tiktok": {
        "caption": "doors close at 1,000. 843 left. premium for life if you're first 1,000.",
        "hashtags": ["#earlyaccess", "#thrift", "#resale", "#wove"]
      },
      "instagram": {
        "caption": "Premium for life. Seller fees waived. First dibs on drops. 843 spots left before doors close. wove.shop/waitlist"
      },
      "youtube_shorts": {
        "title": "Wove early access — first 1,000 perks",
        "description": "Premium for life, seller fees waived, first dibs on drops. Only 843 spots left in the early-access waitlist. Join: wove.shop/waitlist"
      }
    }
  }
}
```

- [ ] **Step 3: Verify JSON valid**

Run: `python3 -c "import json; json.load(open('/Users/lucaclifton/projects/swipefit/marketing/dispersal/captions.json')); print('OK')"`
Expected output: `OK`

- [ ] **Step 4: Commit**

```bash
cd ~/projects/swipefit
git add marketing/dispersal/captions.json
git commit -m "$(cat <<'EOF'
feat(marketing): add per-platform captions for week 1 dispersal

6 ads × 3 platforms = 18 caption variants. All brand-voice
compliant (no "we", specific over general, lowercase OK for
TikTok). IG captions include "send this to a friend" CTA
since sends-per-reach is the dominant 2026 Reels ranking signal.
YouTube Shorts have search-friendly titles + descriptions.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create week 1 schedule mapping [CODE]

**Files:**
- Create: `marketing/dispersal/schedule-week-01.json`

- [ ] **Step 1: Write the schedule file**

Use the Write tool. Path: `/Users/lucaclifton/projects/swipefit/marketing/dispersal/schedule-week-01.json`. Content (exact):

```json
{
  "$schema_note": "Week 1 dispersal schedule. 8 posts across TikTok, IG Reels, YouTube Shorts. Times are local (assume US Pacific unless overridden). Times chosen per strategy spec §3 (consensus from Hootsuite/Buffer/SocialPilot 2026 analyses). Mon = day 1.",
  "week_starts": "2026-06-15",
  "timezone": "America/Los_Angeles",
  "platform_caps": {
    "tiktok": 3,
    "instagram": 4,
    "youtube_shorts": 3
  },
  "posts": [
    { "day": "Mon", "time": "19:00", "platform": "instagram", "ad_id": "wove-p1-vb", "rationale": "Strong product-loop opener. IG audience leans fashion-curated; 1B's clean buy flow lands here." },
    { "day": "Tue", "time": "19:00", "platform": "tiktok", "ad_id": "wove-p1-vb", "rationale": "Same ad re-cut for TikTok. 'Tinder, but for thrift' = made for TikTok." },
    { "day": "Wed", "time": "17:00", "platform": "youtube_shorts", "ad_id": "wove-p1-va", "rationale": "Coin Flip is the most novel feature. YT search benefits from explainer weight." },
    { "day": "Thu", "time": "11:00", "platform": "instagram", "ad_id": "wove-p3-va", "rationale": "Seller side — millennial closet-flipper audience reachable on IG." },
    { "day": "Fri", "time": "21:00", "platform": "tiktok", "ad_id": "wove-p2-va", "rationale": "Style DNA = TikTok-native hook (AI-knows-you genre)." },
    { "day": "Sat", "time": "13:00", "platform": "instagram", "ad_id": "wove-p5-va", "rationale": "Waitlist FOMO peaks on weekend scroll. Send-this-to-a-friend CTA primed." },
    { "day": "Sat", "time": "21:00", "platform": "youtube_shorts", "ad_id": "wove-p4-va", "rationale": "Closed-loop story (DM → delivered) reads as explainer on YT." },
    { "day": "Sun", "time": "20:00", "platform": "tiktok", "ad_id": "wove-p5-va", "rationale": "FOMO on Sunday night = scarcity primer for the week ahead." }
  ],
  "ads_used_count": {
    "wove-p1-va": 1,
    "wove-p1-vb": 2,
    "wove-p2-va": 1,
    "wove-p3-va": 1,
    "wove-p4-va": 1,
    "wove-p5-va": 2
  }
}
```

- [ ] **Step 2: Verify JSON valid**

Run: `python3 -c "import json; json.load(open('/Users/lucaclifton/projects/swipefit/marketing/dispersal/schedule-week-01.json')); print('OK')"`
Expected output: `OK`

- [ ] **Step 3: Commit**

```bash
cd ~/projects/swipefit
git add marketing/dispersal/schedule-week-01.json
git commit -m "$(cat <<'EOF'
feat(marketing): add week 1 dispersal schedule

8 posts mapped across Mon-Sun: 3 TikTok, 3 IG, 2 YT Shorts.
Times follow consensus from strategy spec §3. Each post tagged
with the rationale for the ad/platform pairing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Write dispersal README + Metricool runbook [CODE]

**Files:**
- Create: `marketing/dispersal/README.md`

- [ ] **Step 1: Write the README**

Use the Write tool. Path: `/Users/lucaclifton/projects/swipefit/marketing/dispersal/README.md`. Content (exact):

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
cd ~/projects/swipefit
git add marketing/dispersal/README.md
git commit -m "$(cat <<'EOF'
docs(marketing): add dispersal runbook for Metricool upload flow

Documents the artifacts in marketing/dispersal/ and the per-week
workflow handoff between Claude (captions + schedule) and human
(Metricool dashboard upload).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Add dispersal tracking memory schema [CODE]

**Files:**
- Create: `/Users/lucaclifton/.claude/projects/-Users-lucaclifton/memory/wove-dispersal-tracking.md`
- Modify: `/Users/lucaclifton/.claude/projects/-Users-lucaclifton/memory/MEMORY.md`

- [ ] **Step 1: Write the tracking memory file**

Use the Write tool. Path: `/Users/lucaclifton/.claude/projects/-Users-lucaclifton/memory/wove-dispersal-tracking.md`. Content (exact):

```markdown
---
name: wove-dispersal-tracking
description: Schema + running log of Wove ad dispersal — what posted to which platform when, plus engagement notes for retros
metadata:
  type: project
---

Wove ad dispersal tracking lives here. Updated after each scheduled post fires and after weekly retros.

**Spec:** `~/projects/swipefit/docs/superpowers/specs/2026-06-13-wove-deployment-strategy.md`
**Schedule artifacts:** `~/projects/swipefit/marketing/dispersal/schedule-week-NN.json`

## Schema

Each posting event:
- `ad_id`: e.g., wove-p1-va
- `platform`: tiktok | instagram | youtube_shorts
- `scheduled_for`: ISO timestamp (local)
- `published_at`: ISO timestamp when Metricool confirmed publish
- `metricool_post_id`: from Metricool dashboard
- `caption_hash`: short hash of caption used (for deduping)
- `12h_metrics`: views, completion_rate, sends/likes/comments at 12 hours
- `48h_metrics`: same at 48 hours
- `7d_metrics`: same at 7 days
- `retro_notes`: free-text observations for the next weekly retro

## Log

(populated as posts fire)

---

## How to apply

- Update this file after each scheduled post is confirmed published
- Update again at 12h / 48h / 7d metric checkpoints (use `/loop` skill or manual)
- Reference during weekly Friday retro to decide next week's schedule
- If an ad consistently underperforms across 3+ posts, retire it and prioritize next-batch creative

Related: [[wove-project]], [[wove-ad-content-stack]], [[wove-brand-voice]]
```

- [ ] **Step 2: Add pointer to MEMORY.md**

Use the Edit tool on `/Users/lucaclifton/.claude/projects/-Users-lucaclifton/memory/MEMORY.md`:

- old_string: `- [Wove Brand Voice](wove-brand-voice.md) — SSENSE × Liquid Death blend; no "we"; spec at docs/superpowers/specs/2026-06-13-wove-brand-voice-design.md`
- new_string:
```
- [Wove Brand Voice](wove-brand-voice.md) — SSENSE × Liquid Death blend; no "we"; spec at docs/superpowers/specs/2026-06-13-wove-brand-voice-design.md
- [Wove Dispersal Tracking](wove-dispersal-tracking.md) — schema + log of which ad posted to which platform when; updates after each scheduled post
```

- [ ] **Step 3: Verify**

Run: `grep "wove-dispersal-tracking" /Users/lucaclifton/.claude/projects/-Users-lucaclifton/memory/MEMORY.md`
Expected: 1 match.

Memory files don't go in the swipefit repo — they persist in your home directory.

---

## Task 5: Stand up social accounts under @wove [HUMAN]

**No code. Browser/mobile work only.**

- [ ] **Step 1: Reserve TikTok handle**

1. Go to tiktok.com or open TikTok app
2. Sign up with the Wove email
3. Set username: `@wove` (or closest available — `@wove.app`, `@joinwove`, etc.)
4. Add profile photo: use the Wove logo from `~/projects/swipefit/public/logo.png` if exists, or export from the app
5. Bio: "Tinder, but for thrift. Waitlist open — wove.shop/waitlist"
6. Link in bio: `wove.shop/waitlist`

- [ ] **Step 2: Reserve Instagram handle**

1. Sign up at instagram.com with same Wove email
2. Set username: same as TikTok
3. Profile photo + bio: same as TikTok
4. **Important:** Once created, switch to Business or Creator account in Settings → Account type. Required for Metricool integration. Free, no EIN.

- [ ] **Step 3: Reserve YouTube channel**

1. Sign in to YouTube with Wove email (creates channel)
2. Set channel name: Wove
3. Handle: `@wove` if available
4. Channel art / banner: defer to next session, basic logo for now is fine
5. Description: "Tinder for thrift. Join the waitlist: wove.shop/waitlist"

- [ ] **Step 4: Confirm all 3 handles point to the same brand identity**

Spot-check that the bios all say the same thing and the link goes to the same place.

---

## Task 6: Toggle TikTok to Creator account [HUMAN]

Creator account is free, requires no EIN, and unlocks TikTok Studio + analytics. Required before Metricool can connect.

- [ ] **Step 1: Open TikTok app**

- [ ] **Step 2: Switch account type**

1. Profile tab → ☰ menu (top right)
2. Settings and Privacy → Account
3. Switch to Business Account → choose **Creator** (not Business; Business requires EIN)
4. Pick category: "Apps"
5. Confirm

- [ ] **Step 3: Verify**

Profile should now show analytics tab. No more conversion needed when Metricool prompts for account type during OAuth.

---

## Task 7: Sign up Metricool + connect all 3 platforms [HUMAN]

- [ ] **Step 1: Sign up**

1. Go to metricool.com
2. Sign up with the Wove email (free tier, no credit card)
3. Confirm email

- [ ] **Step 2: Connect TikTok**

1. Dashboard → "Connect a brand" → select TikTok
2. Click "Connect TikTok account" → OAuth redirect
3. Log in with the @wove TikTok account → authorize Metricool
4. Back in Metricool, confirm @wove appears in connected accounts

- [ ] **Step 3: Connect Instagram**

1. Dashboard → "Connect" → Instagram
2. Important: Instagram OAuth runs through Facebook. You may need to link the IG account to a Facebook account first if it isn't already
3. Authorize all the requested permissions (scheduling requires several)
4. Confirm @wove IG appears

- [ ] **Step 4: Connect YouTube**

1. Dashboard → "Connect" → YouTube
2. Google OAuth → select the Wove channel
3. Authorize
4. Confirm Wove YouTube channel appears

- [ ] **Step 5: Sanity check**

Open the "Planning" view in Metricool. All 3 platforms should show as connected with no warnings.

---

## Task 8: Upload 6 ads + week 1 schedule to Metricool [HUMAN]

This is the actual deployment moment. Open both `marketing/dispersal/captions.json` and `marketing/dispersal/schedule-week-01.json` in side-by-side editor tabs for reference.

- [ ] **Step 1: Open Metricool → Planning view → Create new post**

For each of the 8 entries in `schedule-week-01.json[posts]`, follow steps 2–6.

- [ ] **Step 2: Set platform from schedule entry**

Click the platform icon (TikTok, IG, or YouTube). The post creation panel adapts.

- [ ] **Step 3: Upload the MP4**

File path on disk: `~/projects/swipefit/marketing/ads/raw/{ad_id}.mp4` — replace `{ad_id}` with the value from the schedule entry. Drag into Metricool's upload zone.

- [ ] **Step 4: Paste the caption**

Look up the caption: `captions.json[ads][{ad_id}][{platform}]`.

- TikTok: paste `caption` field. Then add the `hashtags` array as space-separated `#tags` at the end.
- Instagram: paste `caption` field only.
- YouTube Shorts: paste `title` into title field, `description` into description field.

- [ ] **Step 5: Set publish time**

Schedule entry has `day` and `time` (24-hour). Pick the next occurrence of that weekday at that time. Metricool's date picker handles the calendar.

- [ ] **Step 6: Click Schedule**

Repeat steps 1–6 for the remaining entries.

- [ ] **Step 7: Verify queue**

Metricool → Planning → calendar view should show 8 scheduled posts across the week, color-coded by platform.

---

## Task 9: Coordinate referral landing page with partner [HUMAN]

Partner is building the landing page. This task makes sure the integration points are agreed in advance.

- [ ] **Step 1: Share the strategy spec with partner**

Send: `docs/superpowers/specs/2026-06-13-wove-deployment-strategy.md` §5 (Incentive ladder).

- [ ] **Step 2: Agree on the URL**

Confirm: `wove.shop/waitlist` is the URL that goes in every ad CTA, every caption, every bio. If partner uses a different URL, update `captions.json` `url` field + all caption strings.

- [ ] **Step 3: Confirm the referral mechanic**

Per strategy: every friend who signs up moves you up 100 spots; first 100 = founding member badge + premium for life + direct line to founder; first 1,000 = free seller fees forever + premium for life + first dibs on Daily Drop. Confirm partner is implementing this.

- [ ] **Step 4: Agree on UTM tracking**

Partner should support `?utm_source={platform}&utm_medium=organic&utm_campaign=batch01` parameters on the bio link so we can attribute signups per platform in retros. If they're not built in, surface this gap now.

- [ ] **Step 5: Document the agreed integration in tracking memory**

Edit `~/.claude/projects/-Users-lucaclifton/memory/wove-dispersal-tracking.md`, append a section under `## How to apply`:

```markdown
## Referral landing page integration (agreed with partner)

- URL: wove.shop/waitlist (confirmed)
- UTM support: yes/no (fill in)
- Position counter visible in-app post-signup: yes/no
- Referral link generated on signup: yes/no
- Tier auto-grant: yes/no
```

---

## Task 10: Test auto-publish end-to-end with a sacrificial post [HUMAN]

Before scheduled posts start firing, prove Metricool actually auto-publishes (not silent-failing into drafts).

- [ ] **Step 1: Pick a low-stakes test post**

Use `ad_id: wove-p5-va` (the waitlist FOMO ad — even if it goes live early, it just brings traffic; no harm). Or create a placeholder post with "test" caption and delete after.

- [ ] **Step 2: Schedule for 5 minutes from now on TikTok only**

In Metricool → create post → TikTok → upload MP4 → caption: "test — ignore" → publish time: now + 5 min → schedule.

- [ ] **Step 3: Wait 6 minutes**

Set a timer. Don't refresh aggressively — Metricool's confirmation can lag a minute.

- [ ] **Step 4: Open TikTok app → @wove profile → confirm post is live**

If live: ✅ Metricool auto-publish works. Delete the test post immediately.
If not live: open Metricool → check the post status. If "draft" or "failed", the OAuth scope may be insufficient or Metricool may be in degraded mode for personal accounts. Escalate to Metricool support before depending on auto-publish for real posts.

- [ ] **Step 5: Repeat for IG and YouTube**

Same drill — schedule 5 min out, verify, delete. Total time: 20 min for all 3.

---

## Task 11: First scheduled post fires (Friday 9pm TikTok) [OBSERVATIONAL]

- [ ] **Step 1: Be near a phone at the scheduled time**

Per `schedule-week-01.json`: Friday 21:00 PT, TikTok, `wove-p2-va` (Style DNA).

- [ ] **Step 2: Confirm post hits**

Open @wove TikTok profile within 5 minutes after 21:00. Confirm the Style DNA ad is live.

- [ ] **Step 3: Update tracking memory**

Append to `wove-dispersal-tracking.md` log section:

```markdown
### 2026-06-19 21:00 PT — wove-p2-va → TikTok
- platform_post_id: (paste from TikTok URL)
- metricool_post_id: (paste from Metricool)
- caption_hash: (short md5 of caption used)
- initial_observation: (any immediate engagement, e.g., 12 views in first 5 min)
```

- [ ] **Step 4: Watch first 10 minutes of engagement**

Note: views, completion rate (if shown), early comments. Just absorb data; don't reply yet (Task 12 handles that).

---

## Task 12: Engagement seeding — weekend [HUMAN]

The first 48 hours decides whether the algorithm pushes the post wider. Comments + sends in the first day matter disproportionately.

- [ ] **Step 1: Reply to every comment within 1 hour**

For the first 48 hours per post, reply to every single comment. Even one-word replies count.

- [ ] **Step 2: DM seed**

Send the post link to 3 friends per platform who actually thrift / care about fashion resale. Ask them to send it to one more person if they think it's interesting. Don't beg — "saw this, made me think of you" works.

- [ ] **Step 3: Log 12h metrics**

12 hours after each post fires, open the platform's native analytics and log to tracking memory:

```markdown
- 12h_metrics: { views: N, completion_rate: %, sends: N, likes: N, comments: N }
```

- [ ] **Step 4: Friday 5pm retro**

End of week 1. Open tracking memory + Metricool analytics dashboard. Note:
- Which ad had the highest completion rate?
- Which platform delivered the most signups (UTM attribution)?
- Which hook copy got the most quoted in comments / shared in DMs?
- Anything that flopped — and why?

Feed this into next week's `schedule-week-02.json` (separate plan, generated post-retro).

---

## Done

After Task 12 is complete, you have:
- 8 posts shipped to 3 platforms across week 1
- All artifacts version controlled in `marketing/dispersal/`
- Full audit trail in `wove-dispersal-tracking.md` memory
- Data to make week 2's schedule evidence-based

**Next plan:** Friday Week 1 → generate `schedule-week-02.json` from retro findings. Will be a separate, lighter plan (just Task 2-style schedule generation + Task 8-style Metricool upload). I'll write it then.
