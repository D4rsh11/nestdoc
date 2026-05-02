/**
 * Ambient floating particles — tiny circles drifting slowly.
 * Purely decorative, adds depth to the page.
 */
export function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: 2 + (i % 4) * 1.5,
    x: (i * 5.17) % 100,
    y: (i * 7.31) % 100,
    duration: 15 + (i % 5) * 4,
    delay: i * 0.8,
    opacity: 0.03 + (i % 3) * 0.015,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-[#1e3a5f]"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: p.opacity,
            animation: `particle-drift-${p.id % 4} ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
