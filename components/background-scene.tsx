"use client";

import { motion } from "framer-motion";

const particles = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  size: index % 3 === 0 ? 6 : 4,
  left: `${8 + ((index * 11) % 84)}%`,
  top: `${10 + ((index * 13) % 76)}%`,
  duration: 6 + (index % 5) * 1.4
}));

export function BackgroundScene() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="topo-lines" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(23,20,18,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(23,20,18,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-60" />
      <svg
        viewBox="0 0 1000 700"
        className="absolute inset-0 h-full w-full opacity-50"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="signal-line" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(23,20,18,0.10)" />
            <stop offset="45%" stopColor="rgba(249,115,22,0.38)" />
            <stop offset="100%" stopColor="rgba(23,20,18,0.06)" />
          </linearGradient>
        </defs>
        <path
          d="M60 480C190 340 250 280 360 320C500 372 556 180 690 222C792 254 850 168 960 96"
          stroke="url(#signal-line)"
          strokeWidth="1.5"
          fill="none"
          className="route-dash"
        />
        <path
          d="M110 610C240 550 290 430 392 428C522 428 620 540 770 460C852 416 910 470 980 540"
          stroke="url(#signal-line)"
          strokeWidth="1.1"
          fill="none"
          className="route-dash"
        />
      </svg>
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute rounded-full bg-ember/70 shadow-[0_0_20px_rgba(249,115,22,0.35)]"
          style={{
            width: particle.size,
            height: particle.size,
            left: particle.left,
            top: particle.top
          }}
          animate={{
            y: [0, -18, 0],
            opacity: [0.2, 1, 0.25],
            scale: [0.9, 1.15, 0.95]
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_52%,rgba(246,241,234,0.92)_100%)]" />
    </div>
  );
}
