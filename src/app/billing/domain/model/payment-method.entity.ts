/**
 * @file payment-method.entity.ts
 * @description Domain entity for a saved payment method (display metadata only).
 */
export interface PaymentMethodProps {
  id?: number | string | null;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isDefault?: boolean;
}

export class PaymentMethod {
  readonly id: number | string | null;
  readonly brand: string;
  readonly last4: string;
  readonly expMonth: number;
  readonly expYear: number;
  readonly isDefault: boolean;

  constructor({
    id = null,
    brand = '',
    last4 = '',
    expMonth = 0,
    expYear = 0,
    isDefault = false,
  }: PaymentMethodProps = {}) {
    this.id = id;
    this.brand = brand;
    this.last4 = last4;
    this.expMonth = expMonth;
    this.expYear = expYear;
    this.isDefault = isDefault;
  }

  /** "Visa •••• 4242". */
  get label(): string {
    return `${this.brand} •••• ${this.last4}`;
  }

  /** "Expires 08/28". */
  get expiresLabel(): string {
    const mm = String(this.expMonth).padStart(2, '0');
    const yy = String(this.expYear).slice(-2);
    return `Expires ${mm}/${yy}`;
  }
}
