# Wove marketing pipeline — partner brief

Wove now has a launch-ready content engine — six vertical ads, platform-tailored captions, and a Week 1 posting calendar that can go live Monday June 15 without any engineering hand-holding. Week 1 splits cleanly: Luca stands up the accounts and wires Metricool to auto-publish; partner ships the referral landing page so the 8 scheduled posts land on a waitlist that actually compounds.

## What's already built

Zero to a full creative sprint in under a week: polished vertical ads, brand-voice captions tailored for each platform, and a Week 1 posting schedule ready to upload. In practical terms, Wove can start putting itself in front of real users on Monday June 15.

- 6 short-form vertical (9:16) ads shipped covering all 5 marketing pillars: swipe mechanic ('Resale, but you have fun.' + 'Tinder, but for thrift.'), Style DNA ('Your taste, in 10 swipes.'), seller payouts ('Your closet is sitting on cash.'), chat-to-ship ('From DM to delivered.'), and waitlist FOMO ('You're early. Doors close at 1,000.')
- 20 reusable on-brand video building blocks (swipe card, Style DNA card, coin flip, payout chip, Stripe checkout sheet, sold notification, message thread, order tracking, waitlist counter, and more) so new ads can be assembled in hours instead of days
- 18 platform-tailored captions written in Wove brand voice — one TikTok caption (with hashtags), one Instagram caption (with 'send this to a friend' CTA), and one YouTube Shorts title+description for every ad, all pointing to wove.shop/waitlist
- Week 1 posting calendar locked in: 8 posts across TikTok, Instagram Reels, and YouTube Shorts, each scheduled to a specific day, time, and platform based on 2026 best-practice timing research
- A documented upload runbook (via Metricool) so posting can be handed off and executed without engineering involvement, plus a 2026 cross-platform deployment strategy that rations the 6-ad pool across roughly 2 weeks before new creative is needed
- Everything version-controlled and shipped over 10 commits in the last sprint, with a clear list of next-up ads and primitives (listing form, payout comparison, big-number frames) already queued

## How the workflow runs each week

Each week is a tight loop of one short content session and one short scheduling session, with Metricool's free tier doing the actual publishing. Claude drafts the per-platform captions and the day/time grid; Luca spends maybe an hour in the Metricool dashboard uploading the 6 MP4s and queueing 8 posts; from there Metricool auto-publishes to TikTok, Instagram Reels, and YouTube Shorts at the scheduled times with no further touch. The only live human work during the week is replying to early comments and a Friday 5pm retro that decides what gets re-run next week — keeping the operation under ~2 hours of hands-on time per week and inside the 50-post free-tier ceiling.

- Sun–Mon — Claude writes the next week's schedule-week-NN.json (8 posts mapped across TikTok/IG/YT with day, time, ad_id, rationale) based on which ads still have headroom in captions.json.ads_used_count and what landed in last week's wove-dispersal-tracking memory
- Mon–Tue — Claude generates or refreshes per-platform caption variants in captions.json (TikTok lowercase + 3–4 hashtags, IG sentence-case with 'send this to a friend' CTA, YouTube Shorts search-friendly title + description); Luca eyeballs and approves
- Tue–Wed — Luca opens Metricool dashboard at metricool.com, clicks Create post for each of the 8 entries, drags in the matching MP4 from marketing/ads/raw/{ad_id}.mp4, pastes caption + hashtags (or YT title/description), and sets publish time per the schedule
- Wed — Luca verifies Metricool's Planning calendar shows all 8 scheduled posts color-coded by platform, then closes the laptop
- Thu–Sun — Metricool auto-publishes to TikTok, IG Reels, and YouTube Shorts at the scheduled times (Mon 7pm IG, Tue 7pm TikTok, Wed 5pm YT, Thu 11am IG, Fri 9pm TikTok, Sat 1pm IG + 9pm YT, Sun 8pm TikTok); Luca replies to comments within ~1 hour during the first 48h per post and DMs the link to ~3 thrift-friends per platform to seed sends
- Throughout the week — Luca (or /loop) logs 12h / 48h / 7d metrics per post into wove-dispersal-tracking.md (views, completion rate, sends, likes, comments) and checks the Metricool free-tier post counter against the 50/month ceiling
- Friday 5pm — Luca runs the weekly retro: which ad had highest completion rate, which platform drove the most signups via UTM, which hook copy got quoted in comments, what flopped — feeds straight into next week's schedule-week-NN.json

## Why this works

- Zero recurring cost while volume fits the Metricool free tier — no SaaS bill until growth demands it
- Content generation runs in minutes, not hours, because the building blocks and brand voice are already specced
- Captions stay on-voice across TikTok, IG, and YT because the Wove tone is locked into a written spec, not in someone's head
- Every asset, caption, and schedule is version-controlled in the repo and tracked in memory — nothing lives in a Notion doc that goes stale
- Humans only touch the moments that matter: caption approval, comment replies, referral decisions, Friday retro
- Pipeline scales cleanly: upgrade path to Metricool Starter ($22/mo) or self-hosted Postiz the moment volume justifies it

## Going forward — week-over-week

The engine improves itself each Friday. Retros pull real numbers — which hook copy got shared, which platform converted via UTM, which ad burned out — and feed straight into the next week's schedule, so the calendar gets sharper instead of staler.

- Friday retros review what actually landed (shared hooks, converting platforms) and rewrite next week's grid against real data
- Ad batch 2 queued by week 2–3 once the first 6-ad pool starts to burn down
- When EIN clears: upgrade TikTok to a Business account and add TikTok Shop integration for higher discovery weight
- When the referral mechanic compounds, organic share-driven signups become the dominant channel and paid creative becomes optional

## Action items this week

This week is the Wove launch sprint: stand up the social presence, wire Metricool to auto-publish, and ship the referral landing page so the 8 scheduled posts (Mon–Sun) drive traffic into a working waitlist with skip-the-line mechanics. Luca handles accounts + scheduling infrastructure; the business partner owns the landing page and incentive ladder.

### Luca

- Reserve @wove handles on TikTok, Instagram, and YouTube (Mon) — same bio across all three: 'Tinder, but for thrift. Waitlist open — wove.shop/waitlist'
- Toggle TikTok to a Creator account (Settings → Account → Business Account → Creator, category 'Apps') and switch Instagram to Business/Creator so Metricool OAuth can connect (Mon)
- Sign up Metricool free tier and OAuth-connect TikTok, Instagram (via Facebook link), and YouTube; verify all 3 show connected in Planning view (Mon–Tue)
- Upload all 6 MP4s from marketing/ads/raw/ into Metricool with per-platform captions from captions.json and queue the 8 Mon–Sun posts per schedule-week-01.json (Wed)
- Run a sacrificial 5-minute-out test post on each of TikTok, IG, and YouTube to confirm Metricool actually auto-publishes (not silent-failing to drafts); delete after verifying (Thu)
- Be on phone Friday 9pm PT for first scheduled post (wove-p2-va Style DNA on TikTok); log post ID + first-10-min engagement to wove-dispersal-tracking.md memory (Fri)
- Weekend engagement seeding: reply to every comment within 1 hour for first 48h per post, DM the link to 3 thrift-friendly friends per platform, log 12h metrics (Sat–Sun); Friday 5pm retro to feed week 2 schedule

### Partner

- Build referral landing page at wove.shop/waitlist (this exact URL — it's hardcoded in every ad caption and bio) with skip-the-line mechanic: every friend who signs up via your referral link moves you up 100 spots in the queue
- Implement the 4-tier incentive ladder: first 100 = founding-member badge (visible in-app) + premium for life + direct line to founder; first 1,000 = free seller fees forever (0% not 10%) + premium for life + first dibs on Daily Drop; 1,001–5,000 = premium 1 year + early app access; 5,000+ = standard early access
- Show-don't-tell on the page: live signup counter, the user's current position post-signup, visible tier perks, and 'Doors close at 1,000' language matching ad 5A
- Confirm UTM parameter support on the bio link (?utm_source={platform}&utm_medium=organic&utm_campaign=batch01) so per-platform signup attribution works in Friday retros
- (Partner + Luca) Sync to confirm URL is wove.shop/waitlist, UTM tracking is live, referral link auto-generates on signup, position counter is visible, and tier perks auto-grant — Luca logs the answers in wove-dispersal-tracking.md (Tue)

## Open questions for you (partner)

- Is wove.shop/waitlist the final URL? (it's already hardcoded in every ad CTA, caption, and bio — easier to confirm now than rewrite later)
- Will UTM parameters be supported on the bio link? (?utm_source={platform}&utm_medium=organic&utm_campaign=batch01 — needed for per-platform attribution in Friday retros)
- Confirming the referral mechanic: every friend who signs up via your link moves you up 100 spots, first 1,000 unlock free seller fees + premium for life, first 100 unlock founding-member badge + direct founder line?
- Target launch date for the landing page? (Week 1 goal is Fri/Sat — if it slips, posts still drive traffic, but the referral compounding starts the moment the page is live)

Once the page is live and Metricool is connected, the engine runs itself. Let me know if anything in the action list needs to shift.
