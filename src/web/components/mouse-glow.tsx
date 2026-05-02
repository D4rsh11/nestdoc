import { useEffect, useRef } from "react";

/**
 * Mouse glow + cursor trail combo.
 * Soft glow follows mouse, tiny dots trail behind it.
 */
export function MouseGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<HTMLDivElement[]>([]);
  const positions = useRef<{ x: number; y: number }[]>(
    Array.from({ length: 8 }, () => ({ x: -100, y: -100 }))
  );

  useEffect(() => {
    let x = 0, y = 0;
    let targetX = 0, targetY = 0;
    let raf: number;

    const handleMove = (e: MouseEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const animate = () => {
      // Glow follows with lag
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${x - 200}px, ${y - 200}px)`;
      }

      // Trail dots — each follows the one before it
      const pts = positions.current;
      pts[0] = { x: targetX, y: targetY };
      for (let i = trailRefs.current.length - 1; i >= 0; i--) {
        const prev = pts[i];
        const curr = pts[i + 1] || prev;
        pts[i + 1] = {
          x: curr.x + (prev.x - curr.x) * (0.25 - i * 0.02),
          y: curr.y + (prev.y - curr.y) * (0.25 - i * 0.02),
        };
        const dot = trailRefs.current[i];
        if (dot) {
          dot.style.transform = `translate(${pts[i + 1].x}px, ${pts[i + 1].y}px)`;
          dot.style.opacity = `${0.25 - i * 0.03}`;
        }
      }

      raf = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    raf = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* Glow */}
      <div
        ref={glowRef}
        className="fixed top-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none z-[5] hidden md:block"
        style={{
          background: "radial-gradient(circle, rgba(30,58,95,0.06) 0%, transparent 70%)",
          willChange: "transform",
        }}
      />

      {/* Trail dots */}
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { if (el) trailRefs.current[i] = el; }}
          className="fixed top-0 left-0 rounded-full pointer-events-none z-[4] hidden md:block -translate-x-1/2 -translate-y-1/2"
          style={{
            width: `${5 - i * 0.5}px`,
            height: `${5 - i * 0.5}px`,
            background: "#1e3a5f",
            opacity: 0,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </>
  );
}
