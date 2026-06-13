# Wove Cross-Platform Deployment Strategy

**Date:** 2026-06-13
**Status:** Approved scope → ready to execute
**Reference research:** Deep-research run wf_cfeeadbf-361 (27 sources, 18 confirmed claims, 7 refuted)

---

## 0. TL;DR

1. **Channels:** TikTok + Instagram Reels + YouTube Shorts. Skip X and Threads in batch 1. Each platform gets natively rendered versions of the 6 ads (no cross-platform watermarks — Instagram actively demotes them, confirmed by Mosseri).
2. **Cadence:** 2–3 TikToks/week, 3–4 Reels/week, 2–3 Shorts/week — total ~8 posts/week. Stretches the 6-ad pool ~2 weeks before new creative is needed.
3. **Automation stack:** **Metricool free tier** as the scheduling hub (50 posts/mo, auto-publishes, works with Personal TikTok accounts) + claude-mem to track what posted where + Higgsfield/Claude for per-platform variants. Human-in-loop only at caption approval. Optional Upload-Post MCP ($16/mo) for Claude Code conversational posting once volume justifies it.

## 0.1. Decisions locked (2026-06-13)

| Open question | Decision |
|---|---|
| TikTok Shop integration day 1? | **No.** Waiting on EIN. Start as Personal/Creator account; upgrade to TikTok Business when EIN clears (likely month 2+). |
| Postiz / TikTok auto-publish | **Drop Postiz.** Use Metricool free tier — it's an official TikTok partner, auto-publishes for Personal accounts, and 50 posts/month covers our ~32/month cadence with headroom. Postiz only makes sense once we have Business + >50/month volume. |
| Referral landing page tech | **Business partner is handling.** I'll wire integration points when their build is ready. |

---

## 1. Audience matrix

| Platform | Who's there | What they want | Wove angle |
|---|---|---|---|
| **TikTok** | Gen Z 18–25 thrifters, Depop-native; 7M Depop customers ~90% under 34, 39% bought secondhand via social commerce in past 12 months ([ThredUp 13th Resale Report](https://newsroom.thredup.com/news/thredup-13th-resale-report), [eBay/Depop](https://investors.ebayinc.com/investor-news/press-release-details/2026/eBay-to-Acquire-Depop-from-Etsy/default.aspx)) | Mechanic demos, hooks, "Tinder for thrift" framing, virality | Lead with **1A, 1B, 2A** — feature walkthroughs |
| **Instagram Reels** | Style-aware 22–34, fashion crossover, follows Aimé Leon Dore / Reformation / TheRealReal | Polish, aspiration, "send this to a friend who thrifts" | Lead with **3A (seller side), 5A (FOMO)**, mix in 1B |
| **YouTube Shorts** | Older bleed (25–34), search-driven, long-tail discovery | Less about virality, more about explainer + product clarity | Lead with **1A (feature-dense), 4A (closed loop)** — narrative weight |

**Audience nuance:** Depop's "under 34" is heavily skewed Gen Z within that bucket. Your 25–34 millennial half needs the TheRealReal/Vestiaire authentication-trust framing more than the Depop-drama framing — that's why pillars 3 (seller payouts) and 4 (chat → ship) lean millennial-friendly while 1, 2, 5 lean Gen Z.

## 2. Content rotation map (week 1)

You have 6 ads × 3 platforms = up to 18 placements. Run each ad twice on its strongest platform, once on a secondary, over 2 weeks.

| Ad | Primary | Secondary | Don't post on |
|---|---|---|---|
| 1A Coin Flip + 90/10 (18s) | YT Shorts | TikTok | — |
| 1B Tinder for thrift (15s) | TikTok | IG Reels | — |
| 2A Style DNA / "It clocks you" (15s) | TikTok | IG Reels | — |
| 3A Closet sitting on cash (15s) | IG Reels | YT Shorts | — |
| 4A DM to delivered (15s) | YT Shorts | IG Reels | — |
| 5A You're early — waitlist FOMO (15s) | IG Reels | TikTok | — |

## 3. Posting cadence + times

**Cadence (consensus from Hootsuite, Buffer, Later, SocialPilot 2026 analyses; one refuted claim: "4–5/wk for new TikTok accounts" — actual safer cadence below extends creative runway):**

- **TikTok:** 2–3/week (algorithm rewards consistency over volume; first 3 sec is the gate)
- **IG Reels:** 3–4/week (Mosseri-cited sweet spot)
- **YouTube Shorts:** 2–3/week (long-tail discovery, less time-sensitive)

**Posting times (consensus, all local-time):**

| Day | Slot 1 | Slot 2 |
|---|---|---|
| Mon | IG Reels · 7pm | — |
| Tue | TikTok · 7pm | — |
| Wed | YT Shorts · 5pm | — |
| Thu | IG Reels · 11am | — |
| Fri | TikTok · 9pm | — |
| Sat | IG Reels · 1pm | YT Shorts · 9pm |
| Sun | TikTok · 8pm | — |

= 8 posts/week. With 6 ads each running ~2× over 2 weeks, this gives 2 weeks of runway before new creative is required.

## 4. Caption strategy per platform (brand voice applied)

Per the [Wove brand voice spec](./2026-06-13-wove-brand-voice-design.md), the brand voice is SSENSE × Liquid Death blend; no "we"; specific over general. Captions adapt per platform but stay in the same voice.

| Platform | Caption tone | Length | CTA |
|---|---|---|---|
| TikTok | Punchy, opinionated, lowercase friendly in caption (not in burned-in hook). Hashtags: 3–4 max. | ≤2 sentences | "Link in bio. 843 spots left." |
| IG Reels | Slightly more polished. Sends-per-reach is the ranking signal — CTA must say **"send this to a friend who thrifts"**. | ≤3 sentences | "DM this to your thrifty friend. wove.shop/waitlist" |
| YT Shorts | Search-friendly description (keyword density). Title repeats hook copy. | Title ≤60 char, desc 1 sentence | "Join the waitlist — wove.shop/waitlist" |

**Watermark rule (Mosseri, Oct 2024; reinforced 2026):** Never export from TikTok and re-upload to IG. Render each ad's MP4 natively from the Remotion source per platform. Strip platform-specific caption styling.

## 5. Incentive ladder (waitlist conversion)

Modeled on Superhuman's referral-to-skip mechanic — 180k+ on waitlist for a $30/mo product, 70% of new users came viral per founder ([Acquired podcast](https://www.acquired.fm/episodes/superhuman)).

```
Tier              Mechanic                                    Perk
───────────────────────────────────────────────────────────────────────────
First 100         Auto-granted by signup order                Founding-member badge in-app (visible to others)
                                                              + Premium for life
                                                              + Direct line to founder
First 1,000       Auto-granted by signup order                Free seller fees forever (0/10 not 10/90 split)
                                                              + Premium for life
                                                              + First dibs on Daily Drop
1,001–5,000       Earn via referrals                          Premium for 1 year
                                                              + Early app access (1 week before public)
5,000+            Earn via referrals OR wait                  Standard early-access
```

**The mechanic:** Every friend who signs up via your link moves you up **100 spots**. This is the share lever — every signup becomes a recruiter.

**Show, don't tell:** Ad 5A already plants "Doors close at 1,000." The landing page should mirror the language: live counter + your current position + perks visible.

## 6. Automation architecture

### Current capability (already in hand)

- `Higgsfield` — generate per-platform caption variants / thumbnails / future avatar content
- `TinyFish` — web automation + search (fallback if MCP doesn't exist for a platform)
- `schedule` skill — cron-scheduled remote agents (weekly batch trigger)
- `loop` skill — recurring polling (engagement checks)
- `claude-mem` — track what posted when, what performed
- `Workflow` — multi-agent orchestration (this strategy doc was built with one)
- Our **Remotion pipeline** — produces 9:16 ads; per-platform versions take ~30 sec to re-render

### Recommended additions (in order)

#### 1. Metricool (free tier) — **set up first**

- URL: [metricool.com](https://metricool.com)
- Why: The only OSS-or-free option that actually auto-publishes to TikTok on a **Personal** account without an EIN-gated Business upgrade. Official TikTok partner — passed the Content Posting API audit that Postiz failed.
- Cost: **Free tier** = 50 posts/month, 2 connected social profiles per platform, basic analytics. Covers our ~32/month cadence with headroom. Paid Starter ($22/mo) bumps to unlimited posts + more analytics; defer until needed.
- Capability matrix for Wove: ✅ TikTok auto-publish, ✅ IG Reels (Personal or Business), ✅ YouTube Shorts, ✅ carousels (TikTok Studio doesn't), ✅ desktop + mobile.
- Setup: Sign up → connect each platform via OAuth → import schedule from §3 timetable. ~20 minutes wall-clock.

#### 2. TikTok Studio (native, zero-config fallback)

- URL: [tiktok.com/studio](https://tiktok.com/studio) — desktop/browser only
- Why: Native, free, no third-party dependency. Schedule up to 10 days out from the official tool. Handy for ad-hoc one-off posts when Metricool's free quota is approaching limit.
- Requirement: Creator account (free upgrade from Personal, no EIN needed; just toggle in app settings).
- Limitation: 10 days ahead max, videos only (no carousels), browser only.

#### 3. Upload-Post MCP (Claude Code conversational layer) — **defer until needed**

- Repo: [`upload-post.com`](https://www.upload-post.com) (free tier excludes TikTok; TikTok requires $16/mo Basic plan)
- MCP install: `claude mcp add upload-post -- npx -y @upload-post/mcp` then paste API key
- Why: Lets you say "post the Coin Flip ad to TikTok at 7pm" inside Claude Code and the publishing actually happens — 40 MCP tools covering publish/schedule/analyze across 8 platforms.
- When to install: Only when the manual Metricool dashboard workflow gets tedious (week 3+). For week 1, Metricool dashboard is faster than wiring this up.

#### 4. n8n + claude-mem (orchestration, when batching grows)

- Tool: n8n via Docker (self-host, free)
- Why: Once you're producing >8 posts/week and want a "generate captions → approve → schedule" loop, n8n + Metricool API + Claude API becomes worth it. Defer to month 2 — week 1 doesn't need orchestration.

```bash
# When ready (not week 1):
docker run -d --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

### Full architecture (week 1 — minimal viable)

```
                  ┌──────────────────────┐
                  │  Claude Code session │
                  │  + brand voice spec  │
                  └──────────┬───────────┘
                             │
                             │ "Generate next week's captions"
                             ▼
                  ┌──────────────────────┐
                  │  Higgsfield + Claude │  ── per-platform variants
                  │  + Remotion renders  │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  HUMAN APPROVAL      │  ── caption check (off-brand catches)
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  Metricool dashboard │  ── queue + auto-publish
                  │  (free tier)         │
                  └──────────┬───────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ TikTok   │   │ IG Reels │   │ YT Shorts│
        │ (auto ✓) │   │ (auto ✓) │   │ (auto ✓) │
        └──────────┘   └──────────┘   └──────────┘
              │              │              │
              └──────────────┴──────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  claude-mem          │  ── records what posted when
                  │  + /loop analytics   │  ── checks engagement every 12h
                  └──────────────────────┘
```

### Architecture upgrades (month 2+)

When weekly volume exceeds Metricool free tier OR you want fully conversational posting from Claude Code:

- **+ Upload-Post MCP** ($16/mo) — Claude Code can post directly via natural language
- **+ n8n** (self-hosted, free) — automated "generate → approve → schedule" pipeline
- **+ Metricool Starter** ($22/mo) — unlimited posts, more analytics
- **Postiz** (self-host) — only worth it once on Business account AND volume >100 posts/month

### Human-in-loop checkpoints

1. **Caption approval** — Claude generates per-platform variants; you tap approve before scheduling (the SSENSE × Liquid Death voice is hard to auto-generate consistently).
2. **Comment/DM responses** — out of scope for this pipeline. Belongs in a separate Jarvis-style agent layer (your existing Jarvis project).
3. **Watermark verification** — automated check needed; for now eyeball each export.
4. **Metricool quota monitoring** — at 50 posts/month free tier and ~32/month plan, headroom is comfortable but check counter weekly to avoid surprise blocks.

## 7. Launch plan

### Week 1 — infrastructure + first drops

| Day | Action | Owner |
|---|---|---|
| Mon | Stand up TikTok, IG, YouTube accounts under @wove handles. Switch TikTok to Creator account in settings. | You |
| Mon | Sign up for Metricool free tier. Connect TikTok, IG, YouTube via OAuth. | You |
| Tue | Re-render 6 ads × 3 platforms = 18 native versions (TikTok / IG / YT) — strip watermarks, platform-native caption styling. | Claude (automated via Remotion) |
| Tue | Coordinate with business partner on referral landing page integration points (current waitlist position + invite link tracking). | You + partner |
| Wed | Generate per-platform captions (3 variants/ad/platform) via Claude using brand voice spec. You approve. | Claude + you |
| Wed | Upload + schedule week 1 posts in Metricool per timetable in §3. | You via dashboard |
| Thu | Test post 1 ad to each platform to confirm Metricool actually auto-publishes (TikTok especially). | Metricool |
| Fri | First full scheduled day fires (TikTok 9pm). | Metricool |
| Sat–Sun | Watch engagement; respond to first comments manually to seed conversation. | You |

### Week 2 — iterate + add automation

- Run loop skill every 12h to scrape engagement stats; save to claude-mem
- Mid-week retrospective: which ads are landing? Which platforms?
- Adjust week 2 schedule: double down on best-performing ads, retire underperformers
- Begin sketching ads 6–10 (Pillar 2 variant B, Pillar 3 variant B, founder content if Soul ID is ready)

### Week 3+ — sustainable cadence

- Weekly batch trigger via `/schedule`: every Sunday, Claude Code agent generates next week's captions + queues posts in Postiz
- Monthly retro: claude-mem queries "what hooks landed in top 10% engagement" → feed into next batch creative brief

## 8. Metrics + retro cadence

| Metric | Target (month 1) | Source |
|---|---|---|
| Waitlist signups | 1,000 | Landing page analytics |
| Referral signups (of total) | ≥40% | Landing page referral tracking |
| TikTok completion rate (3 sec) | ≥85% | TikTok Studio |
| IG Reels send-per-reach | ≥1.5% | IG Insights |
| YouTube Shorts retention curve | ≥50% at midpoint | YT Studio |
| Posts shipped per week | 8 | Postiz logs |

**Retro cadence:**
- **Weekly:** Friday 5pm — review week's posts, what performed, what didn't, adjust next week's schedule
- **Monthly:** Review hook patterns, retire underperforming ads, plan next creative batch

## 9. Open questions — resolved

All three deferred questions from the original v1 draft have been answered. Logged in §0.1 above. Leaving this section for future revisits.

## 10. Risks + caveats

- **Cross-posting penalty:** Instagram's watermark-demotion includes TikTok caption styling, not just the corner logo. Always export ads directly from Remotion source per platform — never re-encode from a TikTok upload.
- **Creative pool burn:** With only 6 ads and 8 posts/week, the pool burns in ~2 weeks. Plan ad batch 2 by week 2 latest.
- **Metricool free tier ceiling:** 50 posts/month. At ~32/month planned cadence we have ~36% headroom — fine for week 1–4, but if we double cadence or run paid promotion variants, we'll hit the ceiling. Upgrade path: Starter $22/mo for unlimited.
- **TikTok account type:** Toggle to Creator account before connecting Metricool (free, no EIN needed). Personal account works for most schedulers but Creator unlocks TikTok Studio + better analytics.
- **EIN dependency for later upgrades:** TikTok Business account (and TikTok Shop integration) requires EIN. Plan to upgrade once partner files paperwork.
- **Source quality:** Most posting-time and cadence claims are marketing-blog tier (Hootsuite, Buffer, SocialPilot). Consensus is strong across 5+ independent 2026 analyses but treat numbers as guideposts, not laws. Adjust based on Wove's actual analytics after 2–4 weeks.

---

## Implementation note

After this strategy is approved, the next step is the `writing-plans` skill to produce a detailed week-1 implementation plan covering:
- Account creation checklist (TikTok, IG, YouTube)
- Postiz + n8n + PostEverywhere install + config
- Per-platform Remotion render variants
- Postiz schedule import (8 posts)
- Referral landing page integration with Wove app
- claude-mem schema for tracking what posted where
- Engagement monitoring loop via /loop skill
