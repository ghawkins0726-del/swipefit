import React from "react";
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AdItem } from "../data/woveItems";

export type MessageBubble =
  | {
      kind: "text";
      side: "in" | "out";
      /** Frame the bubble appears (relative to MessageThread `from`). */
      at: number;
      text: string;
    }
  | {
      kind: "offer";
      side: "in" | "out";
      at: number;
      /** Item being offered/sold. */
      item: AdItem;
      /** Offered price (may be below list price). */
      offerPrice: number;
      /** Optional state — sent / accepted (shown as a stamp on the bubble). */
      state?: "sent" | "accepted";
    };

type MessageThreadProps = {
  from: number;
  to: number;
  /** Buyer/seller usernames for the chat header. */
  withUser: string;
  bubbles: MessageBubble[];
};

/**
 * Frame-driven chat thread. Bubbles spring in one by one at their `at` frame,
 * inbound from the left (gray), outbound from the right (wove-red). Supports
 * text bubbles + special "offer" bubbles that show item, price, and state.
 *
 * Stacks bottom-up like iMessage. Each bubble has a 12-frame entrance.
 */
export const MessageThread: React.FC<MessageThreadProps> = ({
  from,
  to,
  withUser,
  bubbles,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < from || frame > to) return null;

  const local = frame - from;

  return (
    <div className="absolute inset-0 bg-white">
      {/* Chat header */}
      <div
        className="px-6 pt-12 pb-4 flex items-center gap-4 border-b border-black/8"
        style={{ height: 130 }}
      >
        <div className="w-14 h-14 rounded-full bg-wove-red flex items-center justify-center text-white text-xl font-black">
          {withUser[1]?.toUpperCase() ?? "?"}
        </div>
        <div className="flex-1">
          <p className="text-wove-ink text-3xl font-black tracking-tight leading-none">
            {withUser}
          </p>
          <p className="text-[#00C851] text-lg font-semibold mt-1.5">● Active now</p>
        </div>
      </div>

      {/* Bubble stream */}
      <div className="absolute inset-x-0 top-[140px] bottom-0 px-6 flex flex-col justify-end pb-8 gap-4">
        {bubbles.map((b, i) => {
          const bubbleLocal = local - b.at;
          if (bubbleLocal < 0) return null;

          const enter = spring({
            frame: bubbleLocal,
            fps,
            config: { damping: 14, stiffness: 130 },
          });
          const translateY = interpolate(enter, [0, 1], [40, 0]);
          const isOut = b.side === "out";

          if (b.kind === "text") {
            return (
              <div
                key={i}
                className={`flex ${isOut ? "justify-end" : "justify-start"}`}
                style={{ opacity: enter, transform: `translateY(${translateY}px)` }}
              >
                <div
                  className="max-w-[78%] px-6 py-4 rounded-[28px] text-2xl font-semibold leading-tight"
                  style={{
                    background: isOut ? "#FF2E47" : "#F0F0F2",
                    color: isOut ? "white" : "#0A0A0A",
                    borderBottomRightRadius: isOut ? 8 : 28,
                    borderBottomLeftRadius: isOut ? 28 : 8,
                  }}
                >
                  {b.text}
                </div>
              </div>
            );
          }

          // offer bubble
          return (
            <div
              key={i}
              className={`flex ${isOut ? "justify-end" : "justify-start"}`}
              style={{ opacity: enter, transform: `translateY(${translateY}px)` }}
            >
              <div
                className="rounded-[28px] overflow-hidden"
                style={{
                  width: 540,
                  background: isOut ? "#FF2E47" : "#F0F0F2",
                  borderBottomRightRadius: isOut ? 8 : 28,
                  borderBottomLeftRadius: isOut ? 28 : 8,
                }}
              >
                <div className="flex gap-4 p-4 items-center">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                    <Img
                      src={staticFile(b.item.image)}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-2xl font-black tracking-tight leading-tight truncate"
                      style={{ color: isOut ? "white" : "#0A0A0A" }}
                    >
                      {b.item.title}
                    </p>
                    <p
                      className="text-lg font-bold uppercase tracking-widest mt-1"
                      style={{
                        color: isOut ? "rgba(255,255,255,0.65)" : "rgba(10,10,10,0.45)",
                      }}
                    >
                      Offer
                    </p>
                    <p
                      className="text-3xl font-black mt-1"
                      style={{ color: isOut ? "white" : "#0A0A0A" }}
                    >
                      ${b.offerPrice}
                      <span
                        className="ml-2 text-xl font-semibold line-through"
                        style={{
                          color: isOut ? "rgba(255,255,255,0.55)" : "rgba(10,10,10,0.35)",
                        }}
                      >
                        ${b.item.price}
                      </span>
                    </p>
                  </div>
                </div>

                {b.state && (
                  <div
                    className="px-5 py-3 text-center font-black uppercase tracking-widest text-xl"
                    style={{
                      background:
                        b.state === "accepted"
                          ? "rgba(0,200,81,0.18)"
                          : "rgba(255,255,255,0.18)",
                      color:
                        b.state === "accepted"
                          ? "#00C851"
                          : isOut
                            ? "rgba(255,255,255,0.85)"
                            : "rgba(10,10,10,0.55)",
                      borderTop: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {b.state === "accepted" ? "✓ Accepted" : "Sent"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
