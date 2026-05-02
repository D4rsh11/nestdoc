import { useEffect, useState } from "react";

/**
 * Subtle film grain texture overlay — adds premium feel.
 */
export function GrainOverlay() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[2] opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
      }}
    />
  );
}

/**
 * Page load curtain — slides up to reveal content.
 */
export function PageLoadCurtain() {
  const [phase, setPhase] = useState<"loading" | "revealing" | "done">("loading");

  useEffect(() => {
    // Small delay then reveal
    const t1 = setTimeout(() => setPhase("revealing"), 100);
    const t2 = setTimeout(() => setPhase("done"), 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
      style={{
        background: "#f0f4f8",
        opacity: phase === "revealing" ? 0 : 1,
        transform: phase === "revealing" ? "translateY(-100%)" : "translateY(0)",
        transition: "transform 0.7s cubic-bezier(0.77, 0, 0.175, 1), opacity 0.5s ease-out 0.2s",
      }}
    >
      <div className="flex items-center gap-3 animate-pulse">
        <img src="/logo.png" alt="" className="w-10 h-10 object-contain" />
        <span className="text-xl font-semibold text-[#1e3a5f] font-serif">NestDoc</span>
      </div>
    </div>
  );
}

/**
 * Wavy SVG section divider.
 */
export function WaveDivider({ flip = false, color = "#f0f4f8" }: { flip?: boolean; color?: string }) {
  return (
    <div
      className="relative w-full overflow-hidden pointer-events-none -my-px"
      style={{ height: "50px", transform: flip ? "rotate(180deg)" : undefined }}
    >
      <svg
        viewBox="0 0 1440 50"
        fill="none"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        <path
          d="M0 25 C240 0, 480 50, 720 25 C960 0, 1200 50, 1440 25 L1440 50 L0 50Z"
          fill={color}
          opacity="0.5"
        >
          <animate
            attributeName="d"
            dur="8s"
            repeatCount="indefinite"
            values="
              M0 25 C240 0, 480 50, 720 25 C960 0, 1200 50, 1440 25 L1440 50 L0 50Z;
              M0 20 C240 45, 480 5, 720 30 C960 50, 1200 10, 1440 30 L1440 50 L0 50Z;
              M0 25 C240 0, 480 50, 720 25 C960 0, 1200 50, 1440 25 L1440 50 L0 50Z
            "
          />
        </path>
        <path
          d="M0 30 C360 5, 720 45, 1080 20 C1260 10, 1380 35, 1440 20 L1440 50 L0 50Z"
          fill={color}
        >
          <animate
            attributeName="d"
            dur="10s"
            repeatCount="indefinite"
            values="
              M0 30 C360 5, 720 45, 1080 20 C1260 10, 1380 35, 1440 20 L1440 50 L0 50Z;
              M0 35 C360 45, 720 10, 1080 35 C1260 45, 1380 15, 1440 30 L1440 50 L0 50Z;
              M0 30 C360 5, 720 45, 1080 20 C1260 10, 1380 35, 1440 20 L1440 50 L0 50Z
            "
          />
        </path>
      </svg>
    </div>
  );
}
