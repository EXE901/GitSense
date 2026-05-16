// Navigation utilities for routing and anchor scrolling

/**
 * Scroll to section with offset for sticky headers
 * @param sectionId - The ID of the section to scroll to
 * @param offset - Additional offset in pixels (e.g., for sticky headers)
 */
export function scrollToSection(sectionId: string, offset: number = 64) {
  const element = document.getElementById(sectionId);
  if (!element) return;

  const top = element.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({
    top,
    behavior: 'smooth',
  });
}

/**
 * Get the currently visible section based on viewport
 */
export function getActiveSection(
  sectionIds: string[],
  offset: number = 100
): string | null {
  for (const id of sectionIds) {
    const element = document.getElementById(id);
    if (!element) continue;

    const rect = element.getBoundingClientRect();
    if (rect.top <= offset && rect.bottom >= offset) {
      return id;
    }
  }
  return null;
}

/**
 * Handle anchor navigation (e.g., from #features)
 */
export function handleAnchorNavigation() {
  const hash = window.location.hash.slice(1);
  if (hash) {
    // Small delay to ensure DOM is ready
    requestAnimationFrame(() => {
      scrollToSection(hash);
    });
  }
}

/**
 * Update URL hash without page reload
 */
export function updateHash(sectionId: string) {
  window.history.replaceState(null, '', `#${sectionId}`);
}
