import { SpecialistContact } from '../domain/model/specialist-contact.entity';

/** Backend resource shape for `GET /specialists/{id}/contact`. */
export interface SpecialistContactResource {
  specialistId: number | null;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
}

export class SpecialistContactAssembler {
  static toEntityFromResource(resource: SpecialistContactResource): SpecialistContact {
    return new SpecialistContact({
      specialistId: resource.specialistId ?? null,
      fullName: resource.fullName ?? '',
      phone: resource.phone ?? '',
      email: resource.email ?? '',
      whatsapp: resource.whatsapp ?? '',
    });
  }
}
