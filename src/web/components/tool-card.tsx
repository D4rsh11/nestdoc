import { Link } from "wouter";
import { useRef, useCallback } from "react";
import type { Tool, Category } from "../lib/tools";

interface ToolCardProps {
  tool: Tool;
  category: Category;
  index: number;
}

export function ToolCard({ tool, category, index }: ToolCardProps) {
  const Icon = tool.icon;
  const cardRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);

  // 3D tilt on mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;
    card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;

    // Move shine
    if (shineRef.current) {
      shineRef.current.style.left = `${x}px`;
      shineRef.current.style.top = `${y}px`;
      shineRef.current.style.opacity = "1";
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (card) {
      card.style.transform = "perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)";
    }
    if (shineRef.current) {
      shineRef.current.style.opacity = "0";
    }
  }, []);

  // Ripple on click
  const handleClick = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    const ripple = rippleRef.current;
    if (!card || !ripple) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.classList.remove("animate-ripple");
    // Force reflow
    void ripple.offsetWidth;
    ripple.classList.add("animate-ripple");
  }, []);

  return (
    <Link href={`/tool/${tool.id}`}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="group relative bg-card rounded-xl border border-border p-4 cursor-pointer overflow-hidden card-stagger card-gradient-border"
        style={{
          transitionProperty: "transform, box-shadow, border-color",
          transitionDuration: "0.3s",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
          animationDelay: `${index * 0.06}s`,
          willChange: "transform",
        }}
      >
        {/* Shine spotlight — follows mouse */}
        <div
          ref={shineRef}
          className="absolute w-[200px] h-[200px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300"
          style={{
            background: "radial-gradient(circle, rgba(30,58,95,0.08) 0%, transparent 70%)",
            opacity: 0,
            willChange: "left, top, opacity",
          }}
        />

        {/* Ripple */}
        <div
          ref={rippleRef}
          className="absolute w-0 h-0 rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{
            background: "rgba(30,58,95,0.08)",
          }}
        />

        {/* Hover gradient overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
          style={{ background: `linear-gradient(135deg, ${category.bgColor}, transparent 60%)` }}
        />

        {/* Top shine sweep on hover */}
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -skew-x-12 group-hover:animate-shine-sweep" />
        </div>

        <div className="flex items-start gap-3 relative z-10">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md"
            style={{ backgroundColor: category.bgColor }}
          >
            <Icon className="w-[18px] h-[18px] transition-transform duration-300 group-hover:rotate-[-6deg]" style={{ color: category.color }} />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-sm text-foreground mb-0.5 group-hover:text-[#1e3a5f] transition-colors">{tool.name}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{tool.description}</p>
          </div>
          <svg className="w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-[#1e3a5f] shrink-0 mt-1 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
