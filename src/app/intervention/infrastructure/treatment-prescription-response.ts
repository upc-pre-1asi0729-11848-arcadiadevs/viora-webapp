/** Backend resource for `GET /treatment-prescriptions/{id}`. */
export interface PrescribedProductResource {
  productName: string | null;
  dosageAmount: number | null;
  dosageUnit: string | null;
  sessionsCount: number | null;
  technicalRecommendation: string | null;
}

export interface AgrochemicalPrescriptionResource {
  applicationMethod: string | null;
  sprayVolumeAmount: number | null;
  sprayVolumeUnit: string | null;
  preHarvestIntervalDays: number | null;
  agronomistRecommendations: string | null;
  requiredPPE: string[] | null;
  products: PrescribedProductResource[] | null;
}

export interface TreatmentPrescriptionResource {
  id: number | null;
  serviceProposalId: number | null;
  status: string | null;
  agrochemicalPrescription: AgrochemicalPrescriptionResource | null;
}

/** Read-only prescription view for the "Prescription summary" card. */
export interface PrescriptionView {
  code: string;
  treatment: string;
  scope: string[];
  products: string[];
}

export class TreatmentPrescriptionAssembler {
  static toView(resource: TreatmentPrescriptionResource): PrescriptionView {
    const agro = resource.agrochemicalPrescription;
    const products = (agro?.products ?? [])
      .filter((product) => !!product.productName)
      .map((product) => {
        const dose =
          product.dosageAmount != null ? ` · ${product.dosageAmount} ${product.dosageUnit ?? ''}`.trimEnd() : '';
        return `${product.productName}${dose}`;
      });

    return {
      code: resource.id != null ? `RX-${String(resource.id).padStart(3, '0')}` : '—',
      treatment: agro?.agronomistRecommendations || 'Targeted phytosanitary treatment for affected zones.',
      scope: [
        'Inspect and treat the affected zones',
        'Apply the recommended phytosanitary protocol',
        'Monitor recovery for 14 days',
      ],
      products,
    };
  }
}
