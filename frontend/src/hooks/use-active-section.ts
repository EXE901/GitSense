'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to track which section is currently visible in the viewport
 * @param sectionIds - Array of section element IDs to track
 * @param offset - Offset from top for sticky headers (default 100px)
 */
export function useActiveSection(sectionIds: string[], offset: number = 100) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      let current: string | null = null;

      for (const id of sectionIds) {
        const element = document.getElementById(id);
        if (!element) continue;

        const rect = element.getBoundingClientRect();
        // Check if element is in viewport with offset
        if (rect.top <= offset && rect.bottom >= 0) {
          current = id;
          break;
        }
      }

      setActiveSection(current);
    };

    // Use passive listener for better scroll performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Call once on mount

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [sectionIds, offset]);

  return activeSection;
}
