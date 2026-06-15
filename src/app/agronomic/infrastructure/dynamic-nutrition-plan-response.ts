/**
 * @file dynamic-nutrition-plan-response.ts
 * @description API payloads for the Dynamic Nutrition endpoints:
 *  - GET  /api/v1/dynamic-nutrition-plans/active?userId&plotId
 *  - POST /api/v1/dynamic-nutrition-plans?userId&plotId            (generate)
 *  - POST /api/v1/dynamic-nutrition-plans/{planId}/certification?userId
 */

export interface NutritionInputRecommendationResource {
  value?: string;
  purpose?: string;
  dosage?: number;
  dosageUnit?: string;
  status?: string;
}

export interface NutritionApplicationWindowResource {
  startDate?: string;
  endDate?: string;
}

export interface PlanRationaleResource {
  summary?: string;
  triggeringRiskLevel?: string;
  ndviValue?: number;
  temperatureAnomaly?: number;
}

export interface NutritionApplicationResource {
  applicationDate?: string;
  applicationTime?: string;
  appliedInputs?: string[];
  doseConfirmation?: string;
  fieldOperator?: string;
  fieldNotes?: string;
}

export interface DynamicNutritionPlanResource {
  dynamicNutritionPlanId?: number;
  userId?: number;
  plotId?: number;
  status?: string;
  inputRecommendations?: NutritionInputRecommendationResource[];
  applicationWindow?: NutritionApplicationWindowResource | null;
  rationale?: PlanRationaleResource | null;
  generatedDate?: string;
  certificationStatus?: string;
  application?: NutritionApplicationResource | null;
}

/** Request body for POST /{planId}/certification. */
export interface CertifyNutritionPlanResource {
  applicationDate: string;
  applicationTime: string;
  appliedInputs: string[];
  doseConfirmation: string;
  fieldOperator: string;
  fieldNotes: string;
}
