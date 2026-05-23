export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  || (process.env.NODE_ENV === 'production' ? 'https://gitsense.tech' : 'http://localhost:3000');

export const SITE_NAME = 'GitSense';

export const SITE_TAGLINE = 'Engineering Intelligence for GitHub Workspaces';

export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

export const SITE_DESCRIPTION =
  'Operational analytics for GitHub repositories. Issue trends, stale backlog pressure, contributor concentration, and grounded workspace briefings for engineering teams.';

export const SITE_SHORT_DESCRIPTION =
  'Operational analytics for GitHub repositories — backlog pressure, stale signals, contributor concentration, and grounded workspace briefings.';

export const SITE_KEYWORDS = [
  'GitHub analytics',
  'GitHub issue tracking',
  'engineering analytics',
  'DevOps dashboard',
  'developer productivity',
  'workspace health',
  'operational insights',
  'issue intelligence',
  'contributor analytics',
  'backlog pressure',
  'GitHub workspace',
  'engineering metrics',
];

export const OG_IMAGE_PATH = '/logos/noBgWhite.png';

export const TWITTER_HANDLE = '@gitsense';

export const GITHUB_REPO = 'https://github.com/EXE901/GitSense';

export function absoluteUrl(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}
