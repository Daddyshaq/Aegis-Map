import type { OperatingStatus, SafeLocationType, VerificationStatus } from './enums';

export interface SafeLocation {
  id: string;
  name: string;
  description: string | null;
  type: SafeLocationType;
  lat: number;
  lng: number;
  address: string | null;
  phone: string | null;
  capacity: number | null;
  operatingStatus: OperatingStatus;
  verificationStatus: VerificationStatus;
  /** Free-form opening hours description, e.g. "24/7" or "Mon–Fri 8am–6pm". */
  openingHours: string | null;
  /** Machine slugs of available facilities (e.g. "water", "medical"). */
  facilities: string[];
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** Populated by proximity queries. */
  distanceMeters?: number;
}

export interface SafeLocationFacility {
  slug: string;
  name: string;
  icon: string;
}
