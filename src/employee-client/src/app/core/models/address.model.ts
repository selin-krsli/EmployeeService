export const ADDRESS_TYPES = ['Home', 'Work'] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];

export const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
  Home: 'Ev',
  Work: 'İş',
};

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

export interface AddressInput {
  addressType: AddressType;
  city: string;
  district: string;
  postalCode?: string | null;
  fullAddress: string;
  country: string;
}
