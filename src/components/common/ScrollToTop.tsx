import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop component:
 * Guarantees that navigating to a new tab/page (e.g. Movies -> Events -> Dining)
 * or switching in-page categories automatically scrolls the viewport to the very top.
 */
export function ScrollToTop() {
  const location = useLocation();
  const prevPathnameRef = useRef(location.pathname);
  const prevSearchRef = useRef(location.search);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Turn off browser native scroll restoration so history transitions don't anchor to previous scroll
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const prevPath = prevPathnameRef.current;
    const currPath = location.pathname;
    const pathnameChanged = prevPath !== currPath;

    // Check if category/tag/tab parameters changed
    const prevParams = new URLSearchParams(prevSearchRef.current);
    const currParams = new URLSearchParams(location.search);
    const filterTabChanged =
      prevParams.get("cat") !== currParams.get("cat") ||
      prevParams.get("tags") !== currParams.get("tags") ||
      prevParams.get("tab") !== currParams.get("tab") ||
      prevParams.get("category") !== currParams.get("category") ||
      prevParams.get("date") !== currParams.get("date") ||
      prevParams.get("price") !== currParams.get("price") ||
      prevParams.get("city") !== currParams.get("city");

    if (pathnameChanged || filterTabChanged) {
      const scrollToTopNow = () => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        if (document.documentElement) {
          document.documentElement.scrollTop = 0;
        }
        if (document.body) {
          document.body.scrollTop = 0;
        }

        // Also reset main containers (like TheatreLayout's <main> container)
        const mainEls = document.querySelectorAll("main, [data-scroll-container]");
        mainEls.forEach((el) => {
          el.scrollTop = 0;
        });
      };

      // Immediate scroll
      scrollToTopNow();

      // Ensure scroll is applied after React finishes rendering layout
      requestAnimationFrame(scrollToTopNow);
      const timer = setTimeout(scrollToTopNow, 30);

      prevPathnameRef.current = currPath;
      prevSearchRef.current = location.search;

      return () => clearTimeout(timer);
    }

    prevPathnameRef.current = currPath;
    prevSearchRef.current = location.search;
  }, [location.pathname, location.search]);

  return null;
}

