import { Header, Footer, BackToTop } from "../components/layout";
import { ToolCard } from "../components/tool-card";
import { ScrollProgress } from "../components/scroll-bird";
import { MouseGlow } from "../components/mouse-glow";
import { FloatingParticles } from "../components/floating-particles";
import { GrainOverlay, PageLoadCurtain, WaveDivider } from "../components/page-effects";
import { useSmoothScroll } from "../hooks/use-smooth-scroll";
import { categories, getToolsByCategory, tools } from "../lib/tools";
import { Search, Shield, Zap, Globe, ArrowRight } from "lucide-react";
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { useAnalytics } from "../hooks/use-analytics";
import { useReveal, useCountUp } from "../hooks/use-reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";

/* ===== GRADIENT MESH BLOBS ===== */
function GradientMesh() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-[0.06] blur-3xl"
        style={{
          background: "radial-gradient(circle, #1e3a5f 0%, transparent 70%)",
          top: "-10%", left: "20%",
          animation: "mesh-float-1 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-[0.05] blur-3xl"
        style={{
          background: "radial-gradient(circle, #3b6fa0 0%, transparent 70%)",
          top: "10%", right: "10%",
          animation: "mesh-float-2 25s ease-in-out infinite",
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-[0.04] blur-3xl"
        style={{
          background: "radial-gradient(circle, #5a8ab5 0%, transparent 70%)",
          bottom: "0%", left: "40%",
          animation: "mesh-float-3 18s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/* ===== FLOATING DOTS ===== */
function FloatingDots() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-[#1e3a5f]"
          style={{
            width: `${3 + (i % 3) * 2}px`,
            height: `${3 + (i % 3) * 2}px`,
            top: `${10 + (i * 7.5) % 85}%`,
            left: `${5 + (i * 8.3) % 90}%`,
            opacity: 0.06 + (i % 3) * 0.02,
            animation: `dot-float-${(i % 3) + 1} ${8 + i * 0.7}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ===== STAGGERED LETTER ANIMATION ===== */
function AnimatedLetters({ text, className = "" }: { text: string; className?: string }) {
  const { ref, visible } = useReveal(0.3);
  return (
    <span ref={ref} className={className} aria-label={text}>
      {text.split("").map((char, i) => (
        <span
          key={i}
          className={visible ? "letter-animate" : "opacity-0"}
          style={{
            animationDelay: visible ? `${i * 0.03}s` : "0s",
            display: char === " " ? "inline" : "inline-block",
          }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}

/* ===== TYPEWRITER ===== */
function TypeWriter({ words, className }: { words: string[]; className?: string }) {
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[wordIndex];
    const speed = isDeleting ? 40 : 70;
    const timer = setTimeout(() => {
      if (!isDeleting) {
        setText(word.slice(0, text.length + 1));
        if (text.length + 1 === word.length) setTimeout(() => setIsDeleting(true), 2000);
      } else {
        setText(word.slice(0, text.length - 1));
        if (text.length === 0) {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % words.length);
        }
      }
    }, speed);
    return () => clearTimeout(timer);
  }, [text, isDeleting, wordIndex, words]);

  return (
    <span className={className}>
      {text}
      <span className="inline-block w-[2px] h-[1em] bg-[#1e3a5f] ml-0.5 align-middle" style={{ animation: "typing-cursor 0.8s step-end infinite" }} />
    </span>
  );
}

/* ===== ANIMATED STAT ===== */
function AnimatedStat({ value, label, suffix = "" }: { value: number; label: string; suffix?: string }) {
  const { ref, visible } = useReveal(0.3);
  const count = useCountUp(value, 1200, visible);

  return (
    <div ref={ref} className="text-center group">
      <div className="text-2xl font-bold text-foreground stat-number cursor-default">{count}{suffix}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

/* ===== SEARCH WAVE VISUALIZER ===== */
function SearchWaves({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="flex items-end gap-[3px] h-4 ml-2">
      {[0.1, 0.25, 0.4, 0.15, 0.35].map((delay, i) => (
        <div
          key={i}
          className="search-wave-line"
          style={{
            height: `${8 + (i % 3) * 4}px`,
            opacity: 0.3,
            animationDelay: `${delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ===== HERO ===== */
function Hero() {
  const [searchActive, setSearchActive] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const birdRef = useRef<HTMLImageElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      if (birdRef.current) {
        birdRef.current.style.transform = `translateY(${y * 0.15}px) rotate(${y * 0.01}deg) scale(${1 + y * 0.0002})`;
      }
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${y * 0.04}px)`;
        heroRef.current.style.opacity = `${Math.max(0, 1 - y * 0.001)}`;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative overflow-hidden">
      <GradientMesh />
      <FloatingDots />

      {/* Bird watermark with parallax + rotation */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img
          ref={birdRef}
          src="/bird-bg.png"
          alt=""
          className="w-[420px] h-[420px] sm:w-[500px] sm:h-[500px] object-contain opacity-[0.12] select-none animate-pulse-soft will-change-transform"
          draggable={false}
        />
      </div>

      <div ref={heroRef} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-14 sm:pt-28 sm:pb-20 relative will-change-transform">
        <div className="text-center max-w-2xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#1e3a5f]/5 border border-[#1e3a5f]/15 rounded-full px-4 py-1.5 mb-8 animate-fade-up animate-badge-float badge-shadow-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f] animate-pulse" />
            <span className="text-xs font-medium text-[#1e3a5f]">
              Free forever &middot; No signup required
            </span>
          </div>

          {/* Staggered letter animation h1 */}
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-normal leading-[1.12] mb-2">
            <AnimatedLetters text="Every file. Every format." />
          </h1>

          {/* Typing line */}
          <div className="text-4xl sm:text-5xl lg:text-[3.5rem] font-normal leading-[1.12] mb-5 animate-fade-up stagger-2 h-[1.3em]">
            <TypeWriter
              words={["Handled with care.", "Converted instantly.", "Compressed smartly.", "Merged seamlessly."]}
              className="text-[#1e3a5f]"
            />
          </div>

          <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto mb-9 leading-relaxed animate-fade-up stagger-3">
            Convert, compress, merge and transform your files online.
            Fast, free and secure — right in your browser.
          </p>

          {/* Search */}
          <div className="max-w-md mx-auto animate-fade-up stagger-4 relative z-30 search-glow">
            <SearchBar onResultsChange={setSearchActive} onFocusChange={setSearchFocused} />
          </div>

          {/* Stats */}
          <div className={`flex items-center justify-center gap-8 sm:gap-12 mt-10 relative z-10 transition-all duration-300 ${searchActive ? "opacity-0 pointer-events-none translate-y-2" : "opacity-100 translate-y-0"}`}>
            <AnimatedStat value={tools.length} suffix="+" label="Free Tools" />
            <div className="w-px h-8 bg-border" />
            <AnimatedStat value={100} suffix="%" label="Browser-based" />
            <div className="w-px h-8 bg-border" />
            <AnimatedStat value={0} suffix="" label="Files Stored" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===== SEARCH BAR ===== */
function SearchBar({ onResultsChange, onFocusChange }: { onResultsChange?: (active: boolean) => void; onFocusChange?: (f: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const { trackEvent } = useAnalytics();
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return tools.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.category.includes(q)
    ).slice(0, 6);
  }, [query]);

  React.useEffect(() => {
    onResultsChange?.(results.length > 0);
  }, [results.length, onResultsChange]);

  return (
    <div className="relative">
      <div className={`flex items-center bg-card border rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${focused ? "ring-2 ring-[#1e3a5f]/15 border-[#1e3a5f]/30 shadow-md" : "border-border"} animate-glow-border`}>
        <Search className={`w-4 h-4 ml-4 shrink-0 transition-colors duration-300 ${focused ? "text-[#1e3a5f]" : "text-muted-foreground"}`} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { setFocused(true); onFocusChange?.(true); }}
          onBlur={() => { setFocused(false); onFocusChange?.(false); }}
          placeholder="Search tools... (e.g. merge PDF, compress image)"
          className="flex-1 px-3 py-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50 text-foreground"
        />
        <SearchWaves active={focused} />
      </div>
      {results.length > 0 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-scale-in">
          {results.map((tool, i) => {
            const cat = categories.find((c) => c.id === tool.category)!;
            const Icon = tool.icon;
            return (
              <Link
                key={tool.id}
                href={`/tool/${tool.id}`}
                onClick={() => { setQuery(""); trackEvent("search_click", { tool_id: tool.id, query }); }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary transition-all duration-150"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform hover:scale-110"
                  style={{ backgroundColor: cat.bgColor }}
                >
                  <Icon className="w-4 h-4" style={{ color: cat.color }} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{tool.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ===== REVEAL SECTION ===== */
function RevealSection({ children, className = "", direction }: { children: React.ReactNode; className?: string; direction?: "left" | "right" }) {
  const { ref, visible } = useReveal();
  const dirClass = direction === "left" ? "reveal-left" : direction === "right" ? "reveal-right" : "reveal";
  return (
    <div ref={ref} className={`${dirClass} ${visible ? "visible" : ""} ${className}`}>
      {children}
    </div>
  );
}

/* ===== PARALLAX CARD GRID ===== */
function ParallaxCardGrid({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      const cards = ref.current.querySelectorAll<HTMLElement>(".parallax-card");
      cards.forEach((card, i) => {
        const rect = card.getBoundingClientRect();
        const viewH = window.innerHeight;
        if (rect.top < viewH && rect.bottom > 0) {
          const progress = (viewH - rect.top) / (viewH + rect.height);
          const offset = (progress - 0.5) * (6 + (i % 3) * 3);
          card.style.transform = `translateY(${offset}px)`;
        }
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return <div ref={ref}>{children}</div>;
}

/* ===== TOOLS GRID ===== */
function ToolsGrid() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <RevealSection>
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl text-foreground mb-3">
            <AnimatedLetters text="All the tools you need" />
          </h2>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            {tools.length} free tools to convert, compress and transform any file format
          </p>
        </div>
      </RevealSection>

      <ParallaxCardGrid>
        <div className="space-y-14">
          {categories.map((cat, catIndex) => {
            const catTools = getToolsByCategory(cat.id);
            const slideDir = catIndex % 2 === 0 ? "left" : "right";
            return (
              <React.Fragment key={cat.id}>
                {/* Bird swoosh divider */}
                {catIndex > 0 && (
                  <RevealSection>
                    <div className="flex items-center gap-3 py-2 opacity-[0.15]">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#1e3a5f] to-transparent" />
                      <img src="/bird-bg.png" alt="" className="w-6 h-6 object-contain bird-divider-spin" draggable={false} />
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#1e3a5f] to-transparent" />
                    </div>
                  </RevealSection>
                )}
                <RevealSection direction={slideDir as "left" | "right"}>
                  <div id={cat.id} className="scroll-mt-24">
                    <div className="flex items-center gap-3 mb-1">
                      <div
                        className="w-1 h-7 rounded-full accent-bar-pulse"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div className="flex-1">
                        <h3 className="text-xl sm:text-2xl text-foreground">{cat.name}</h3>
                        <p className="text-sm text-muted-foreground">{cat.description}</p>
                      </div>
                    </div>
                    {/* Category color line that grows */}
                    <div
                      className="category-line h-0.5 rounded-full mb-5"
                      style={{ backgroundColor: cat.color, opacity: 0.3 }}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {catTools.map((tool, index) => (
                        <div key={tool.id} className="parallax-card">
                          <ToolCard tool={tool} category={cat} index={index} />
                        </div>
                      ))}
                    </div>
                  </div>
                </RevealSection>
              </React.Fragment>
            );
          })}
        </div>
      </ParallaxCardGrid>
    </section>
  );
}

/* ===== FEATURES ===== */
function Features() {
  const features = [
    { icon: Zap, title: "Lightning Fast", description: "Most tools run directly in your browser. No uploading, no waiting." },
    { icon: Shield, title: "Privacy First", description: "Your files are never stored on our servers. Everything is processed locally." },
    { icon: Globe, title: "Works Everywhere", description: "No software to install. Works on any device with a modern browser." },
  ];

  return (
    <>
      <WaveDivider color="#dce4ed" />
      <section className="relative bg-[#dce4ed] overflow-hidden">
        {/* Document grid pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="doc-grid" x="0" y="0" width="80" height="100" patternUnits="userSpaceOnUse">
                <rect x="10" y="10" width="50" height="65" rx="3" stroke="currentColor" strokeWidth="1" fill="none" />
                <line x1="18" y1="25" x2="52" y2="25" stroke="currentColor" strokeWidth="1" />
                <line x1="18" y1="33" x2="45" y2="33" stroke="currentColor" strokeWidth="1" />
                <line x1="18" y1="41" x2="48" y2="41" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#doc-grid)" />
          </svg>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 relative">
          <RevealSection>
            <div className="text-center mb-10">
              <h2 className="text-3xl sm:text-4xl text-foreground mb-3">
                <AnimatedLetters text="Why NestDoc?" />
              </h2>
              <p className="text-muted-foreground text-base">Simple, fast, and free. That's it.</p>
            </div>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <RevealSection key={i}>
                <div
                  className="bg-card rounded-xl border border-border p-6 text-center feature-card-glow card-gradient-border"
                  style={{ transitionDelay: `${i * 0.15}s` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-[#1e3a5f]/8 flex items-center justify-center mx-auto mb-4 icon-spin-in">
                    <f.icon className="w-5 h-5 text-[#1e3a5f]" />
                  </div>
                  <h4 className="font-semibold text-base text-foreground mb-2">{f.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>
      <WaveDivider color="#f0f4f8" flip />
    </>
  );
}

/* ===== FAQ ===== */
function FAQ() {
  const faqs = [
    { question: "Is NestDoc really free?", answer: "Yes, 100% free. All tools are available without any cost, signup, or hidden fees." },
    { question: "Are my files safe?", answer: "Absolutely. Most processing happens directly in your browser — your files never leave your device." },
    { question: "Is there a file size limit?", answer: "Client-side tools have no practical limit. Server-side tools support files up to 100MB." },
    { question: "Do I need to create an account?", answer: "No. Just pick a tool and start converting. No registration needed." },
    { question: "What file formats are supported?", answer: "PDF, Word, Excel, PowerPoint, PNG, JPG, WebP, GIF, MP4, MP3, JSON, CSV, XML, YAML, and many more." },
  ];

  return (
    <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <RevealSection>
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl text-foreground mb-3">
            <AnimatedLetters text="Frequently Asked Questions" />
          </h2>
        </div>
      </RevealSection>
      <RevealSection>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="transition-all duration-200 hover:bg-secondary/30 rounded-lg -mx-2 px-2">
              <AccordionTrigger className="text-left font-medium text-[15px] text-foreground font-sans">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-[14px] leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </RevealSection>
    </section>
  );
}

/* ===== HOME ===== */
export default function Home() {
  useSmoothScroll();

  return (
    <div className="min-h-screen bg-background">
      <title>NestDoc — Free Online File Converter & Processor</title>
      <meta name="description" content="Convert, compress, merge and transform any file online. PDF, Image, Video, Audio, Data tools — free, fast and secure. No signup required." />
      <PageLoadCurtain />
      <ScrollProgress />
      <MouseGlow />
      <FloatingParticles />
      <GrainOverlay />
      <Header />
      <Hero />
      <ToolsGrid />
      <Features />
      <FAQ />
      <Footer />
      <BackToTop />
    </div>
  );
}
