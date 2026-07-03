import {
  ExecutionStatus,
  HireAgain,
  ImpactLevel,
  ObservedResult,
  ServiceResult,
} from '../domain/model/intervention-summary.entity';

/** Body for `POST /intervention-executions` (certify field application). */
export interface CertifyApplicationRequest {
  treatmentPrescriptionId: number;
  applicationDate: string;
  appliedArea: string;
  executionStatus: ExecutionStatus;
  fieldNote?: string;
}

/** Body for `POST /intervention-outcomes` (report impact after the grace period). */
export interface ReportImpactRequest {
  interventionExecutionId: number;
  gracePeriod: string;
  observedResult: ObservedResult;
  impactLevel: ImpactLevel;
  producerAssessment: string;
}

/** Body for `PATCH /intervention-outcomes/{id}` (close + rate). */
export interface CloseInterventionRequest {
  serviceResult: ServiceResult;
  hireAgain: HireAgain;
  privateFeedback?: string;
}
