'use client';

import React, { useState } from 'react';

/* ─────────────────────────────────────────────
   Reusable glow button
───────────────────────────────────────────── */
function ActionButton({ children, size = 'md', glowColor, onClick }) {
  const [hovered, setHovered] = useState(false);

  const dim = size === 'sm' ? 52 : 64;
  const glowBase = `0 0 18px 6px ${glowColor}55, 0 0 36px 12px ${glowColor}22`;
  const glowHover = `0 0 28px 10px ${glowColor}88, 0 0 56px 20px ${glowColor}33`;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setTimeout(() => setHovered(false), 200)}
      style={{
        width: dim,
        height: dim,
        borderRadius: '50%',
        background: 'rgba(18, 18, 22, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.10)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: hovered ? glowHover : glowBase,
        transform: hovered ? 'scale(1.12)' : 'scale(1)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────
   SVG Icons
───────────────────────────────────────────── */
const UndoIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="rgba(190,190,200,0.9)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);

const XIcon = () => (
  <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#ff557a" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const HeartIcon = ({ filled }) => (
  <svg width="27" height="27" viewBox="0 0 24 24" fill={filled ? '#4ade80' : 'none'} stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const FlameIcon = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'white' : 'rgba(255,255,255,0.4)'}>
    <path d="M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13 4.85 13.95 3C13 3.23 12.17 3.75 11.46 4.32C8.87 6.4 7.85 10.07 9.07 13.22C9.11 13.32 9.15 13.42 9.15 13.55C9.15 13.77 9 13.97 8.8 14.05C8.57 14.15 8.33 14.09 8.14 13.93C8.08 13.88 8.04 13.83 8 13.76C6.87 12.33 6.69 10.28 7.45 8.64C5.78 10 4.87 12.3 5 14.47C5.06 14.97 5.12 15.47 5.29 15.97C5.43 16.57 5.7 17.17 6 17.7C7.08 19.43 8.95 20.67 10.96 20.92C13.1 21.19 15.39 20.8 17.03 19.32C18.86 17.66 19.5 15 18.56 12.72L18.43 12.46C18.22 12 17.66 11.2 17.66 11.2Z" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const HeartNavIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const ChatIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const PersonIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const PinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,0.55)">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);

const SlidersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
    <circle cx="8" cy="6" r="2" fill="white" stroke="none" />
    <circle cx="16" cy="12" r="2" fill="white" stroke="none" />
    <circle cx="10" cy="18" r="2" fill="white" stroke="none" />
  </svg>
);

const BoltIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#c084fc">
    <path d="M13 2L4.5 13.5H11.5L10.5 22L19.5 10.5H12.5L13 2Z" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
export default function SwipeCardDemo() {
  const [activeTab, setActiveTab] = useState('For You');
  const [liked, setLiked] = useState(false);

  return (
    <div
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        position: 'relative',
        width: '100%',
        height: '100dvh',
        overflow: 'hidden',
        background: '#000',
      }}
    >
      {/* ── Profile photo ── */}
      <img
        src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=900&q=80"
        alt="Tessa"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center top',
        }}
      />

      {/* ── Card edge glow ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          boxShadow:
            'inset 0 0 80px rgba(255,255,255,0.03), inset 0 0 160px rgba(120,80,255,0.04)',
        }}
      />

      {/* ── Top gradient scrim ── */}
      <div
        style={{
          position: 'absolute',
          inset: '0 0 auto 0',
          height: '220px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Bottom gradient scrim ── */}
      <div
        style={{
          position: 'absolute',
          inset: 'auto 0 0 0',
          height: '62%',
          background:
            'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 40%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Content overlay ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        {/* ── Top bar ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '52px 18px 12px',
          }}
        >
          {/* Sliders */}
          <button
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.25)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SlidersIcon />
          </button>

          {/* Pill tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              background: 'rgba(0,0,0,0.42)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.11)',
              borderRadius: 9999,
              padding: '4px 4px',
            }}
          >
            {['For You', 'Double Date', 'Astrology'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '6px 13px',
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  whiteSpace: 'nowrap',
                  ...(activeTab === tab
                    ? {
                        background: 'rgba(255,255,255,0.18)',
                        color: '#fff',
                        boxShadow: '0 0 14px rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(8px)',
                      }
                    : {
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.52)',
                      }),
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Lightning bolt */}
          <button
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.25)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BoltIcon />
          </button>
        </div>

        {/* ── Spacer ── */}
        <div style={{ flex: 1 }} />

        {/* ── Profile info ── */}
        <div style={{ padding: '0 20px 16px' }}>
          {/* Recently Active badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(0,0,0,0.48)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(74,222,128,0.42)',
              borderRadius: 9999,
              padding: '5px 12px',
              marginBottom: 12,
              boxShadow:
                '0 0 18px rgba(74,222,128,0.22), inset 0 0 10px rgba(74,222,128,0.07)',
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#4ade80',
                boxShadow: '0 0 8px rgba(74,222,128,1)',
              }}
            />
            <span
              style={{
                color: '#4ade80',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.01em',
              }}
            >
              Recently Active
            </span>
          </div>

          {/* Name + age row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 12,
              marginBottom: 6,
            }}
          >
            <h1
              style={{
                fontSize: 38,
                fontWeight: 800,
                color: '#fff',
                margin: 0,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              Tessa
            </h1>
            <span
              style={{
                fontSize: 38,
                fontWeight: 300,
                color: 'rgba(255,255,255,0.88)',
                lineHeight: 1.1,
              }}
            >
              22
            </span>
            {/* Info expand button */}
            <div style={{ marginLeft: 'auto' }}>
              <button
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ChevronUpIcon />
              </button>
            </div>
          </div>

          {/* Location */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              marginBottom: 7,
            }}
          >
            <PinIcon />
            <span style={{ color: 'rgba(255,255,255,0.58)', fontSize: 13.5 }}>
              27 miles away
            </span>
          </div>

          {/* Bio */}
          <p
            style={{
              color: 'rgba(255,255,255,0.78)',
              fontSize: 13.5,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            I like the outdoors and the ocean :)
          </p>
        </div>

        {/* ── Action buttons ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            padding: '4px 20px 18px',
          }}
        >
          {/* Undo */}
          <ActionButton size="sm" glowColor="rgba(160,160,175,1)">
            <UndoIcon />
          </ActionButton>

          {/* X / Dislike */}
          <ActionButton size="md" glowColor="rgba(255,60,110,1)">
            <XIcon />
          </ActionButton>

          {/* Heart / Like */}
          <ActionButton
            size="md"
            glowColor="rgba(74,222,128,1)"
            onClick={() => setLiked((v) => !v)}
          >
            <HeartIcon filled={liked} />
          </ActionButton>
        </div>

        {/* ── Bottom nav ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            padding: '10px 8px',
            paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
            background: 'rgba(8,8,10,0.88)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(255,255,255,0.065)',
          }}
        >
          {/* Swipe (active) */}
          <NavItem label="Swipe" active>
            <FlameIcon active />
          </NavItem>

          {/* Events */}
          <NavItem label="Events">
            <CalendarIcon />
          </NavItem>

          {/* Likes (with badge) */}
          <NavItem label="Likes" badge="99+">
            <HeartNavIcon />
          </NavItem>

          {/* Chat */}
          <NavItem label="Chat">
            <ChatIcon />
          </NavItem>

          {/* Profile */}
          <NavItem label="Profile">
            <PersonIcon />
          </NavItem>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Nav item
───────────────────────────────────────────── */
function NavItem({ children, label, active, badge }) {
  return (
    <button
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px 14px',
        position: 'relative',
      }}
    >
      {/* Badge */}
      {badge && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 6,
            background: '#ff3b5c',
            color: '#fff',
            fontSize: 9,
            fontWeight: 700,
            borderRadius: 9999,
            padding: '1px 5px',
            lineHeight: 1.5,
            boxShadow: '0 0 8px rgba(255,59,92,0.6)',
          }}
        >
          {badge}
        </div>
      )}

      {children}

      <span
        style={{
          fontSize: 10,
          fontWeight: 500,
          color: active ? '#fff' : 'rgba(255,255,255,0.38)',
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </span>
    </button>
  );
}
