import React from "react";
import { AbsoluteFill } from "remotion";
import { WoveFrame } from "../shared/WoveFrame";
import { HookText } from "../shared/HookText";
import { CTAOutro } from "../shared/CTAOutro";
import { MessageThread, MessageBubble } from "../shared/MessageThread";
import { OrderTracking } from "../shared/OrderTracking";
import { ITEMS } from "../data/woveItems";

/**
 * Ad 4A — "From DM to delivered. One app."
 *
 * Pillar 4 (closed loop). Shows the full buy-side flow inside a single chat:
 *   chat with seller → send offer → accepted → order tracking ticks through.
 *
 * 15s timeline @ 30fps (450 frames):
 *   0.0–1.5  (0–45)   : Hook "From DM to delivered. One app." over chat header
 *   1.5–8.0  (45–240) : Chat bubbles in sequence (buyer/seller/offer/accepted)
 *   8.0–11.0 (240–330): OrderTracking card slides in at Paid stage
 *   11.0–13.5(330–405): Tracking progresses → Shipped → Delivered
 *   13.5–15.0(405–450): CTA outro
 */

const item = ITEMS.find((i) => i.id === "i-coach-bag")!;

const BUBBLES: MessageBubble[] = [
  // Buyer's opener (inbound from your perspective = seller, but we frame
  // this ad as buyer-side, so buyer = "out" / wove-red).
  { kind: "text", side: "out", at: 0, text: "Still available?" },
  { kind: "text", side: "in", at: 22, text: "Yep, ships from NYC" },
  { kind: "text", side: "out", at: 50, text: "Would you take $48?" },
  // Buyer sends an offer card
  {
    kind: "offer",
    side: "out",
    at: 78,
    item,
    offerPrice: 48,
    state: "sent",
  },
  // Seller accepts
  {
    kind: "offer",
    side: "in",
    at: 115,
    item,
    offerPrice: 48,
    state: "accepted",
  },
];

export const Ad4A_DMtoDelivered: React.FC = () => {
  return (
    <AbsoluteFill className="bg-wove-ink">
      <WoveFrame
        backdrop={
          <AbsoluteFill className="flex items-center justify-center">
            <div
              className="rounded-full bg-wove-red"
              style={{
                width: 1100,
                height: 1100,
                filter: "blur(160px)",
                opacity: 0.22,
              }}
            />
          </AbsoluteFill>
        }
      >
        {/* Chat thread — runs the first 8 seconds */}
        <MessageThread
          from={0}
          to={235}
          withUser="@vintage.vault"
          bubbles={BUBBLES}
        />

        {/* Order tracking takes over the screen */}
        <OrderTracking
          from={235}
          to={400}
          item={item}
          stage={0}
          stageProgressAt={45}
        />
        {/* Second progression — Shipped → Delivered around frame 340 */}
        <OrderTracking
          from={335}
          to={400}
          item={item}
          stage={1}
          stageProgressAt={15}
        />
      </WoveFrame>

      {/* Hooks */}
      <HookText
        from={0}
        to={42}
        text="From DM to delivered. One app."
        variant="bold-center"
        color="white"
        yOffset={-700}
        sizeClass="text-6xl"
      />
      <HookText
        from={155}
        to={210}
        text="Accepted in 12 minutes."
        variant="bold-center"
        color="white"
        yOffset={-700}
        sizeClass="text-6xl"
      />

      <CTAOutro from={405} />
    </AbsoluteFill>
  );
};
