# Wove Cross-Platform Deployment Strategy

**Date:** 2026-06-13
**Status:** Approved scope → ready to execute
**Reference research:** Deep-research run wf_cfeeadbf-361 (27 sources, 18 confirmed claims, 7 refuted)

---

## 0. TL;DR

1. **Channels:** TikTok + Instagram Reels + YouTube Shorts. Skip X and Threads in batch 1. Each platform gets natively rendered versions of the 6 ads (no cross-platform watermarks — Instagram actively demotes them, confirmed by Mosseri).
2. **Cadence:** 2–3 TikToks/week, 3–4 Reels/week, 2–3 Shorts/week — total ~8 posts/week. Stretches the 6-ad pool ~2 weeks before new creative is needed.
3. **Automation stack:** Postiz (OSS, Docker) as the scheduling hub + PostEverywhere MCP in Claude Code as the conversational layer + claude-mem to track what posted where. Human-in-loop only at TikTok publish (Postiz API rejected by TikTok audit) and caption approval.

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

### Recommended additions (top 3, install order)

#### 1. Postiz (OSS scheduling hub) — **install first**

- Repo: [`github.com/gitroomhq/postiz-app`](https://github.com/gitroomhq/postiz-app) (AGPL-3.0, 31.9k ⭐, v2.21.8 May 2026)
- Why: Native support for all 3 of our platforms + 10 more, "agentic" with a CLI built for AI agents, has an official n8n node, self-hosted.
- AGPL-3.0 caveat: if Wove ever offers Postiz-derived functionality as SaaS to third parties, source-disclosure obligations attach. For internal Wove use this is fine.
- **Known risk:** [Issue #1362](https://github.com/gitroomhq/postiz-app/issues) — Postiz's TikTok Direct Post API has been rejected by TikTok's UX-compliance audit. **TikTok posts may land as private drafts requiring manual publish until Postiz passes the audit.** Monitor that issue weekly.

```bash
git clone https://github.com/gitroomhq/postiz-app
cd postiz-app
docker compose up -d
# Access at http://localhost:5000 — connect TikTok, IG, YouTube via OAuth
```

#### 2. PostEverywhere MCP (Claude Code conversational layer) — **install second**

- Repo: [`github.com/posteverywhere/mcp`](https://github.com/posteverywhere/mcp) (MIT, npm `@posteverywhere/mcp` v1.3.0 published 2026-06-10)
- Why: Lets you say "post the Coin Flip ad to TikTok at 7pm tonight" in Claude Code and it just happens. Covers our 3 platforms + 5 more.
- Cost: ~$19/mo for the API key (the MCP install + tool surface is free; actual posting is gated).
- Refuted claim during research: PostEverywhere does NOT replace Postiz's queue — it's the conversational front-end, Postiz remains the queue/analytics backbone.

```bash
claude mcp add posteverywhere -- npx -y @posteverywhere/mcp
# Then set API key per posteverywhere.ai docs
```

#### 3. n8n + workflow #7992 (the actual pipeline) — **install third**

- Workflow: [n8n.io/workflows/7992](https://n8n.io/workflows/7992-auto-caption-and-post-videos-to-instagram-and-tiktok-with-submagic-postiz-and-openai/)
- Why: Already templates Google Drive → caption gen → Postiz → IG/TikTok publish. **Don't build this from scratch.** Adapt by:
  - Drop Submagic (Wove ads already have burned-in captions)
  - Replace OpenAI caption step with a Claude Code call that uses the brand voice spec
  - Wire to claude-mem so we don't double-post the same ad to the same platform

```bash
docker run -it --rm \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
# Import workflow JSON from #7992 page; edit nodes per above
```

### Full architecture

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
                  │  (caption gen + voice│
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  HUMAN APPROVAL      │  ── caption check (off-brand catches)
                  │  (Postiz draft queue)│
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  Postiz (Docker)     │  ── queue + schedule
                  │  + n8n workflow #7992│
                  └──────────┬───────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ TikTok   │   │ IG Reels │   │ YT Shorts│
        │ (manual  │   │ (API ✓)  │   │ (API ✓)  │
        │  publish)│   │          │   │          │
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

### Human-in-loop checkpoints

1. **Caption approval** — Claude generates variants per platform, you tap approve before /schedule fires (the SSENSE × Liquid Death voice is hard to auto-generate consistently).
2. **TikTok publish** — until Postiz #1362 resolves, you'll get a notification when a TikTok draft is queued, then manually publish in the TikTok app (~30 sec/post).
3. **Comment/DM responses** — out of scope for this pipeline. Belongs in a separate Jarvis-style agent layer (your existing Jarvis project).
4. **Watermark verification** — automated check needed; for now eyeball each export.

## 7. Launch plan

### Week 1 — infrastructure + first drops

| Day | Action | Owner |
|---|---|---|
| Mon | Stand up TikTok, IG, YouTube accounts under @wove handles. Set up landing page with referral/skip-line mechanic. | You |
| Mon | Install Postiz via Docker; connect IG + YouTube via OAuth. | You with Claude |
| Tue | Install PostEverywhere MCP in Claude Code. Add $19/mo API key. | You |
| Tue | Re-render 6 ads × 3 platforms = 18 native versions. Strip watermarks. | Claude (automated via Remotion) |
| Wed | Schedule week 1 posts in Postiz per timetable in §3. | Claude + your approval |
| Wed | Set up n8n + clone workflow #7992; adapt to drop Submagic, swap OpenAI for Claude. | You with Claude |
| Thu | Test post 1 ad to each platform manually to confirm pipeline works end-to-end. | You |
| Fri | First scheduled post fires (Tinder for thrift → TikTok 9pm). | Postiz |
| Sat–Sun | Watch engagement; manually respond to first comments to seed conversation. | You |

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

## 9. Open questions (worth deciding before week 1)

1. **TikTok Shop integration day 1?** TikTok Shop is now the dominant resale discovery surface for under-25 buyers per ThredUp 2025. Adding it changes algorithm treatment significantly. Recommendation: stay waitlist-only initially; add TikTok Shop in month 2 if conversion is the bottleneck.
2. **Postiz #1362 status:** Check if resolved before committing to Postiz as the TikTok leg. If still open, plan for manual TikTok publish (or evaluate PostEverywhere paid path for that platform only).
3. **Referral landing page tech:** the in-app counter ("you're #847, refer to move up") needs a real backend. Build alongside the marketing app or use a service like Prefinery/Waitlister.

## 10. Risks + caveats

- **Single biggest risk:** Postiz TikTok Direct Post audit failure (issue #1362). Mitigation: manual publish workflow ready; PostEverywhere as paid fallback.
- **Cross-posting penalty:** Instagram's watermark-demotion includes TikTok caption styling, not just the corner logo. Always export ads directly from Remotion source per platform — never re-encode from a TikTok upload.
- **Creative pool burn:** With only 6 ads and 8 posts/week, the pool burns in ~2 weeks. Plan ad batch 2 by week 2 latest.
- **AGPL exposure:** If Wove ever wraps Postiz functionality into a hosted Wove SaaS offering for third parties, AGPL source-disclosure obligations apply. For internal use only this is fine.
- **PostEverywhere cost:** $19/mo isn't large but recurring — confirm with budget owner before committing.
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
