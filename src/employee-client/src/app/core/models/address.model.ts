/** Mirrors the backend `AddressType` enum (serialized as a string). */
export const ADDRESS_TYPES = ['Home', 'Work'] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];

export const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
  Home: 'Ev',
  Work: 'İş',
};

/** Address as returned by the API (`AddressDto`). */
export interface Address {
  id: number;
  addressType: AddressType;
  city: string;
  district: string;
  postalCode: string | null;
  fullAddress: string;
  country: string;
  createdAt: string;
  updatedAt: string | null;
}

/**
 * Address payload nested inside employee requests (`AddressUpsertDto`).
 * Has no `id`: the backend replaces the whole address collection on PUT.
 */
export interface AddressInput {
  addressType: AddressType;
  city: string;
  district: string;
  postalCode?: string | null;
  fullAddress: string;
  country: string;
}
