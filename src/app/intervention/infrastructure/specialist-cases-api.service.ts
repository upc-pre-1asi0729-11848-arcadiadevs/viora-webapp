import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BaseApi } from '../../shared/infrastructure/base-api';

import { SpecialistCases } from '../domain/model/specialist-case.entity';
import {
  SpecialistCasesAssembler,
  SpecialistCasesResource,
} from './specialist-cases-response';

export type FindingType = 'PHYTOSANITARY' | 'NUTRITIONAL' | 'WATER_STRESS' | 'OTHER';
export type IncidenceLevel = 'LOW' | 'MEDIUM' | 'CRITICAL';
export type ApplicationMethod =
  | 'HYDRAULIC_SPRAYING'
  | 'DRIP_IRRIGATION'
  | 'FOLIAR'
  | 'SOIL_DRENCH'
  | 'OTHER';
export type ProtectiveEquipment = 'MASK' | 'GLOVES' | 'GOGGLES' | 'COVERALLS';

/** Body for logging on-site field inspection findings against a prescription. */
export interface LogFieldInspectionRequest {
  findingType: FindingType;
  incidenceLevel: IncidenceLevel;
  technicalDescription: string;
  recordDate: string;
}

/** A single prescribed product line. */
export interface PrescribedProductRequest {
  productName: string;
  dosageAmount: number | null;
  dosageUnit: string;
  sessionsCount: number | null;
  technicalRecommendation: string;
}

/** Body for issuing the agrochemical prescription. */
export interface PrescribeTreatmentRequest {
  applicationMethod: ApplicationMethod;
  sprayVolumeAmount: number | null;
  sprayVolumeUnit: string;
  preHarvestIntervalDays: number | null;
  agronomistRecommendations: string;
  requiredPPE: ProtectiveEquipment[];
  products: PrescribedProductRequest[];
}

/**
 * Infrastructure gateway for the specialist's cases (My Requests + Field
 * Inspection), served by the real Viora Platform backend. The case list is a
 * read model (`GET /specialist-cases`); the field-inspection actions drive the
 * real treatment-prescription lifecycle (create → log findings → prescribe).
 *
 * @class SpecialistCasesApiService
 * @extends BaseApi
 */
@Injectable({ providedIn: 'root' })
export class SpecialistCasesApiService extends BaseApi {
  private readonly casesEndpoint = this.endpoint(environment.endpoints.specialistCases);
  private readonly prescriptionsEndpoint = this.endpoint(environment.endpoints.treatmentPrescriptions);

  /** Fetches the signed-in specialist's cases (pipeline + field inspection). */
  getCases(): Observable<SpecialistCases> {
    return this.http
      .get<SpecialistCasesResource>(this.casesEndpoint.collectionUrl)
      .pipe(map((resource) => SpecialistCasesAssembler.toEntityFromResource(resource)));
  }

  /**
   * Opens a treatment prescription for an accepted case's proposal. Returns the new
   * prescription id so findings can be logged against it.
   */
  createPrescription(serviceProposalId: number): Observable<number | null> {
    return this.http
      .post<{ id: number | null }>(this.prescriptionsEndpoint.collectionUrl, { serviceProposalId })
      .pipe(map((resource) => resource?.id ?? null));
  }

  /** Logs on-site field inspection findings against a prescription (→ INSPECTED). */
  logFieldInspection(
    prescriptionId: number | string,
    request: LogFieldInspectionRequest,
  ): Observable<unknown> {
    return this.http.post(
      `${this.prescriptionsEndpoint.resourceUrl(prescriptionId)}/field-inspections`,
      request,
    );
  }

  /** Issues the agrochemical prescription (→ PRESCRIBED), sending it to the producer. */
  prescribeTreatment(
    prescriptionId: number | string,
    request: PrescribeTreatmentRequest,
  ): Observable<unknown> {
    return this.http.post(
      `${this.prescriptionsEndpoint.resourceUrl(prescriptionId)}/agrochemical-prescriptions`,
      request,
    );
  }
}
