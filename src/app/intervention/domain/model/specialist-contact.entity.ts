/**
 * @file specialist-contact.entity.ts
 * @description Private specialist contact details, revealed only once the related
 * proposal has been accepted.
 */
export interface SpecialistContactProps {
  specialistId?: number | null;
  fullName?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
}

export class SpecialistContact {
  readonly specialistId: number | null;
  readonly fullName: string;
  readonly phone: string;
  readonly email: string;
  readonly whatsapp: string;

  constructor({
    specialistId = null,
    fullName = '',
    phone = '',
    email = '',
    whatsapp = '',
  }: SpecialistContactProps = {}) {
    this.specialistId = specialistId;
    this.fullName = fullName;
    this.phone = phone;
    this.email = email;
    this.whatsapp = whatsapp;
  }
}
