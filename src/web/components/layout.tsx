import { Link } from "wouter";
import { Menu, X, ArrowUp } from "lucide-react";
import { useState, useEffect } from "react";
import { categories } from "../lib/tools";

function scrollToSection(id: string) {
  const lenis = (window as any).__lenis;
  const el = document.getElementById(id);
  if (el && lenis) {
    lenis.scrollTo(el, { offset: -80 });
  } else if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  } else {
    window.location.href = `/#${id}`;
  }
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-lg border-b transition-all duration-500"
      style={{
        backgroundColor: scrolled ? "rgba(240,244,248,0.96)" : "rgba(240,244,248,0.85)",
        borderColor: scrolled ? "#cdd6e0" : "transparent",
        boxShadow: scrolled ? "0 4px 20px -4px rgba(30,58,95,0.08)" : "none",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className="flex items-center justify-between transition-all duration-500"
          style={{ height: scrolled ? "48px" : "56px" }}
        >
          <Link href="/" className="flex items-center gap-2 group">
            <img
              src="/logo.png"
              alt="NestDoc"
              className="object-contain transition-all duration-500 group-hover:rotate-6"
              style={{ width: scrolled ? "26px" : "32px", height: scrolled ? "26px" : "32px" }}
            />
            <span
              className="font-semibold tracking-tight text-foreground transition-all duration-500"
              style={{ fontSize: scrolled ? "15px" : "18px" }}
            >
              NestDoc
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`/#${cat.id}`}
                onClick={(e) => { e.preventDefault(); scrollToSection(cat.id); }}
                className="magnetic-link px-3 py-1.5 text-[13px] font-medium rounded-md transition-all duration-200 hover:bg-secondary text-muted-foreground hover:text-foreground relative overflow-hidden group"
              >
                <span className="relative z-10">{cat.name}</span>
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-[#1e3a5f] rounded-full transition-all duration-300 group-hover:w-3/4" />
              </a>
            ))}
          </nav>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <div className="relative w-5 h-5">
              <Menu className={`w-5 h-5 absolute transition-all duration-300 ${mobileOpen ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"}`} />
              <X className={`w-5 h-5 absolute transition-all duration-300 ${mobileOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"}`} />
            </div>
          </button>
        </div>

        <div
          className="md:hidden overflow-hidden transition-all duration-400"
          style={{
            maxHeight: mobileOpen ? "400px" : "0",
            opacity: mobileOpen ? 1 : 0,
          }}
        >
          <nav className="pb-4 pt-2 border-t border-border">
            <div className="flex flex-col gap-0.5">
              {categories.map((cat, i) => (
                <a
                  key={cat.id}
                  href={`/#${cat.id}`}
                  onClick={(e) => { e.preventDefault(); setMobileOpen(false); scrollToSection(cat.id); }}
                  className="px-3 py-2.5 text-sm font-medium rounded-lg hover:bg-secondary text-muted-foreground transition-all duration-200"
                  style={{ transitionDelay: mobileOpen ? `${i * 50}ms` : "0ms" }}
                >
                  {cat.name}
                </a>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}

/** Back to top floating bird button */
export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    const lenis = (window as any).__lenis;
    if (lenis) lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-[#1e3a5f] text-white shadow-lg flex items-center justify-center transition-all duration-500 hover:scale-110 hover:shadow-xl hover:bg-[#2a4f7a] active:scale-95"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0) scale(1)" : "translateY(20px) scale(0.8)",
        pointerEvents: show ? "auto" : "none",
      }}
      aria-label="Back to top"
    >
      <ArrowUp className="w-4 h-4" />
    </button>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-[#dce4ed] overflow-hidden">
      {/* Animated wave divider */}
      <div className="absolute top-0 left-0 right-0 -translate-y-[99%] overflow-hidden pointer-events-none">
        <svg viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none" className="w-full h-[40px]">
          <path
            d="M0 40 C360 0, 720 60, 1080 20 C1260 0, 1380 30, 1440 20 L1440 60 L0 60 Z"
            fill="#dce4ed"
          />
          <path
            d="M0 45 C300 15, 600 55, 900 25 C1100 10, 1300 40, 1440 25 L1440 60 L0 60 Z"
            fill="#dce4ed"
            opacity="0.5"
          />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="NestDoc" className="w-7 h-7 object-contain" />
              <span className="text-base font-semibold text-foreground">NestDoc</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Free online file converter and processor. No signup, no limits, no hassle.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">Tools</h4>
            <div className="flex flex-col gap-2">
              {categories.slice(0, 3).map((cat) => (
                <a
                  key={cat.id}
                  href={`/#${cat.id}`}
                  onClick={(e) => { e.preventDefault(); scrollToSection(cat.id); }}
                  className="text-sm text-foreground/70 hover:text-foreground transition-all duration-200 hover:translate-x-1"
                >
                  {cat.name}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">&nbsp;</h4>
            <div className="flex flex-col gap-2">
              {categories.slice(3).map((cat) => (
                <a
                  key={cat.id}
                  href={`/#${cat.id}`}
                  onClick={(e) => { e.preventDefault(); scrollToSection(cat.id); }}
                  className="text-sm text-foreground/70 hover:text-foreground transition-all duration-200 hover:translate-x-1"
                >
                  {cat.name}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">About</h4>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-foreground/70">100% Free</span>
              <span className="text-sm text-foreground/70">No Registration</span>
              <span className="text-sm text-foreground/70">Privacy Focused</span>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/60 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} NestDoc. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Your files are processed securely and never stored.
          </p>
        </div>
      </div>
    </footer>
  );
}
