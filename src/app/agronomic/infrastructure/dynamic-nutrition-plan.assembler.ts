/**
 * @file dynamic-nutrition-plan.assembler.ts
 * @description Maps the Dynamic Nutrition API payload into the domain entity.
 */
import {
  CertificationStatus,
  DynamicNutritionPlan,
  NutritionInput,
  NutritionInputStatus,
} from '../domain/model/dynamic-nutrition-plan.entity';

import {
  DynamicNutritionPlanResource,
  NutritionApplicationResource,
  NutritionInputRecommendationResource,
} from './dynamic-nutrition-plan-response';
import { normalizeClimateRisk } from './status-normalizers';

export class DynamicNutritionPlanAssembler {
  static toEntityFromResource(
    resource: DynamicNutritionPlanResource | null | undefined,
  ): DynamicNutritionPlan | null {
    if (!resource) {
      return null;
    }

    const application = resource.application;

    return new DynamicNutritionPlan({
      id: resource.dynamicNutritionPlanId ?? null,
      userId: resource.userId ?? null,
      plotId: resource.plotId ?? null,
      status: this.toInputStatus(resource.status),
      inputs: (resource.inputRecommendations ?? []).map((input) => this.toInput(input)),
      applicationWindow: resource.applicationWindow
        ? {
            startDate: resource.applicationWindow.startDate ?? '',
            endDate: resource.applicationWindow.endDate ?? '',
          }
        : null,
      rationale: resource.rationale
        ? {
            summary: resource.rationale.summary ?? '',
            triggeringRiskLevel: resource.rationale.triggeringRiskLevel
              ? normalizeClimateRisk(resource.rationale.triggeringRiskLevel)
              : '',
            ndviValue: resource.rationale.ndviValue ?? 0,
            temperatureAnomaly: resource.rationale.temperatureAnomaly ?? 0,
          }
        : null,
      generatedDate: resource.generatedDate ?? '',
      certificationStatus: this.toCertificationStatus(resource.certificationStatus),
      application: this.toApplication(application),
    });
  }

  private static toInput(resource: NutritionInputRecommendationResource): NutritionInput {
    return {
      name: resource.value ?? '',
      purpose: resource.purpose ?? '',
      dosage: resource.dosage ?? 0,
      dosageUnit: resource.dosageUnit ?? '',
      status: this.toInputStatus(resource.status),
    };
  }

  private static toApplication(resource: NutritionApplicationResource | null | undefined) {
    if (!resource) {
      return null;
    }

    return {
      applicationDate: resource.applicationDate ?? '',
      applicationTime: resource.applicationTime ?? '',
      appliedInputs: resource.appliedInputs ?? [],
      doseConfirmation: resource.doseConfirmation ?? '',
      fieldOperator: resource.fieldOperator ?? '',
      fieldNotes: resource.fieldNotes ?? '',
    };
  }

  private static toInputStatus(value: string | null | undefined): NutritionInputStatus {
    return (value ?? '').trim().toUpperCase() === 'OPTIONAL' ? 'Optional' : 'Recommended';
  }

  private static toCertificationStatus(value: string | null | undefined): CertificationStatus {
    return (value ?? '').trim().toUpperCase() === 'CERTIFIED' ? 'Certified' : 'Pending';
  }
}
