/**
 * Tour step definitions for GitSense.
 *
 * Three variants:
 *   - `getFullSteps()`         : authenticated user with at least one repository
 *   - `getEmptyWorkspaceSteps`: authenticated user, no repositories yet
 *   - `getDemoSteps()`         : `?demo=1` unauthenticated visitor
 *
 * Each variant starts with a borderless "value statement" step (no anchor),
 * then highlights real DOM nodes via `data-tour="<id>"` attributes.
 *
 * The driver.js dependency is lazily imported inside the hook, so this module
 * stays type-only with respect to driver.js — keeping the dep out of the
 * initial dashboard bundle.
 */

export type TourStep = {
  /** CSS selector for the element to highlight. Omit for a centered popover. */
  element?: string;
  popover: {
    title: string;
    description: string;
    side?: 'top' | 'right' | 'bottom' | 'left' | 'over';
    align?: 'start' | 'center' | 'end';
  };
};

const VALUE_STATEMENT_AUTH =
  'GitSense helps you understand GitHub repositories in seconds with issue insights, health metrics, and AI-generated engineering briefings.\n\nHere\u2019s a quick tour of the dashboard.';

const VALUE_STATEMENT_DEMO =
  'GitSense helps you understand GitHub repositories in seconds with issue insights, health metrics, and AI-generated engineering briefings.\n\nYou\u2019re viewing a demo workspace populated with sample data.\n\nHere\u2019s a quick tour of the dashboard.';

const VALUE_STATEMENT_TITLE = 'Welcome to GitSense';

export function getFullSteps(): TourStep[] {
  return [
    {
      popover: {
        title: VALUE_STATEMENT_TITLE,
        description: VALUE_STATEMENT_AUTH,
      },
    },
    {
      element: '[data-tour="repo-search"]',
      popover: {
        title: 'Pick a repository',
        description:
          'Search or paste an owner/repo (e.g. microsoft/vscode) to scope every panel below.',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="briefing"]',
      popover: {
        title: 'AI briefing',
        description:
          'A short, generated summary of what matters in this repository right now.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="health"]',
      popover: {
        title: 'Project health',
        description:
          'Stale issues, response times, and contributor signals \u2014 at a glance.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="metrics"]',
      popover: {
        title: 'Engineering metrics',
        description:
          'Health, velocity, and issue distribution update live with your selected repo.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="issues"]',
      popover: {
        title: 'Issues feed',
        description:
          'Filter, sort, and drill into individual issues. Press Esc anytime to exit.',
        side: 'top',
      },
    },
  ];
}

export function getEmptyWorkspaceSteps(): TourStep[] {
  return [
    {
      popover: {
        title: VALUE_STATEMENT_TITLE,
        description: VALUE_STATEMENT_AUTH,
      },
    },
    {
      element: '[data-tour="repo-search"]',
      popover: {
        title: 'Connect your first repository',
        description:
          'Paste an owner/repo (e.g. microsoft/vscode) to start. The dashboard fills in automatically.',
        side: 'bottom',
        align: 'start',
      },
    },
  ];
}

export function getDemoSteps(): TourStep[] {
  const full = getFullSteps();
  return [
    {
      popover: {
        title: VALUE_STATEMENT_TITLE,
        description: VALUE_STATEMENT_DEMO,
      },
    },
    ...full.slice(1),
  ];
}

export type TourVariant = 'full' | 'empty' | 'demo';

export function selectVariant(args: {
  isDemoMode: boolean;
  hasRepositories: boolean;
}): TourVariant {
  if (args.isDemoMode) return 'demo';
  return args.hasRepositories ? 'full' : 'empty';
}

export function getStepsForVariant(variant: TourVariant): TourStep[] {
  switch (variant) {
    case 'demo':
      return getDemoSteps();
    case 'empty':
      return getEmptyWorkspaceSteps();
    case 'full':
    default:
      return getFullSteps();
  }
}
