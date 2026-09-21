import { routes } from '@/lib/routes';

export interface NavItem {
  label: string;
  to: string;
  icon: string;
  /** Match child paths as active too (e.g. /guides/:slug). */
  matchPrefix?: boolean;
}

/** Primary navigation shown to everyone. */
export const PRIMARY_NAV: NavItem[] = [
  { label: 'Map', to: routes.home, icon: 'map' },
  { label: 'Report', to: routes.report, icon: 'flag' },
  { label: 'Safe locations', to: routes.safeLocations, icon: 'shield-check', matchPrefix: true },
  { label: 'Safe routes', to: routes.routing, icon: 'route' },
  { label: 'Guides', to: routes.guides, icon: 'book-open', matchPrefix: true },
  { label: 'Alerts', to: routes.alerts, icon: 'bell', matchPrefix: true },
];
