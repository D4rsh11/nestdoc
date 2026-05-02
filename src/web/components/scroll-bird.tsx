import { useEffect, useRef, useState } from "react";

/**
 * Scroll progress bar at the very top of the page.
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(maxScroll > 0 ? scrollY / maxScroll : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-[3px] bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-[#1e3a5f] via-[#3b6fa0] to-[#1e3a5f] transition-all duration-75"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
