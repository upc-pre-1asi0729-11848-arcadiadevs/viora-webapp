import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BaseApi } from '../../shared/infrastructure/base-api';

import { Alert } from '../domain/model/alert.entity';
import { CommunityRiskSnapshot } from '../domain/model/nearby-risk-signal.entity';
import { PestReport } from '../domain/model/pest-report.entity';
import { AlertResource, UpdateAlertRequest } from './alerts-response';
import { AlertAssembler } from './alert.assembler';
import { CommunityRiskResource } from './community-risk-response';
import { CommunityRiskAssembler } from './community-risk.assembler';
import {
  CreatePestSightingReportRequest,
  PestSightingReportResource,
} from './pest-sighting-report-response';
import { PestReportAssembler } from './pest-report.assembler';
import { SymptomResource } from './symptom-response';

@Injectable({
  providedIn: 'root',
})
/**
 * Infrastructure gateway for the Surveillance bounded context, served by the
 * real Viora Platform backend. Alerts are addressed as an aggregate-root
 * collection: the recent feed via `?sort=recent`, and status transitions via
 * PATCH on the alert resource.
 *
 * @class SurveillanceApiService
 * @extends BaseApi
 */
export class SurveillanceApiService extends BaseApi {
  private readonly alertsEndpoint = this.endpoint(environment.endpoints.alerts);
  private readonly communityRiskEndpoint = this.endpoint(environment.endpoints.communityRisk);
  private readonly pestReportsEndpoint = this.endpoint(environment.endpoints.pestSightingReports);
  private readonly symptomsEndpoint = this.endpoint(environment.endpoints.symptomDictionaryItems);

  /**
   * Fetches the user's most recent alerts (newest first). A high limit returns
   * the full working set so the Alerts page can paginate and aggregate locally.
   * @param {number} limit - Maximum number of alerts to retrieve.
   * @returns {Observable<Alert[]>}
   */
  getAlerts(limit = 50): Observable<Alert[]> {
    return this.http
      .get<AlertResource[]>(this.alertsEndpoint.collectionUrl, {
        params: this.queryParams(this.withUserId({ sort: 'recent', limit })),
      })
      .pipe(map((resources) => AlertAssembler.toEntitiesFromResources(resources ?? [])));
  }

  /**
   * Marks an alert as under review (backend status UNDER_REVIEW).
   * @param {number|string} id - Alert identifier.
   * @returns {Observable<void>}
   */
  markAlertUnderReview(id: number | string): Observable<void> {
    const body: UpdateAlertRequest = { status: 'UNDER_REVIEW' };

    return this.http
      .patch<AlertResource>(this.alertsEndpoint.resourceUrl(id), body)
      .pipe(map(() => undefined));
  }

  /**
   * Resolves an alert (threat addressed — producer self-service or triggered by a
   * closed intervention). Backend status RESOLVED.
   * @param {number|string} id - Alert identifier.
   * @returns {Observable<void>}
   */
  resolveAlert(id: number | string): Observable<void> {
    const body: UpdateAlertRequest = { status: 'RESOLVED' };

    return this.http
      .patch<AlertResource>(this.alertsEndpoint.resourceUrl(id), body)
      .pipe(map(() => undefined));
  }

  /**
   * Dismisses an alert (producer ruled it out as a false alarm). Backend status
   * DISMISSED.
   * @param {number|string} id - Alert identifier.
   * @returns {Observable<void>}
   */
  dismissAlert(id: number | string): Observable<void> {
    const body: UpdateAlertRequest = { status: 'DISMISSED' };

    return this.http
      .patch<AlertResource>(this.alertsEndpoint.resourceUrl(id), body)
      .pipe(map(() => undefined));
  }

  /**
   * Fetches the anonymized community-risk snapshot around a plot.
   * @param {number|string} plotId - Reference plot identifier.
   * @param {number} radiusKm - Monitoring radius in kilometers.
   * @returns {Observable<CommunityRiskSnapshot | null>}
   */
  getCommunityRisk(plotId: number | string, radiusKm = 5): Observable<CommunityRiskSnapshot | null> {
    return this.http
      .get<CommunityRiskResource>(this.communityRiskEndpoint.collectionUrl, {
        params: this.queryParams({ plotId, radiusKm }),
      })
      .pipe(map((resource) => CommunityRiskAssembler.toEntityFromResource(resource)));
  }

  /**
   * Fetches the producer's symptom report history (newest first).
   * @returns {Observable<PestReport[]>}
   */
  getPestReports(): Observable<PestReport[]> {
    return this.http
      .get<PestSightingReportResource[]>(this.pestReportsEndpoint.collectionUrl, {
        params: this.queryParams({ reporterUserId: this.defaultUserId }),
      })
      .pipe(map((resources) => PestReportAssembler.toEntitiesFromResources(resources ?? [])));
  }

  /**
   * Submits a manual pest sighting report. The backend evaluates the biological
   * risk and may auto-create an alert. Errors are not swallowed so the form can
   * surface them.
   * @returns {Observable<PestReport>}
   */
  createPestReport(
    request: Omit<CreatePestSightingReportRequest, 'reporterUserId'>,
  ): Observable<PestReport> {
    const body: CreatePestSightingReportRequest = {
      reporterUserId: Number(this.defaultUserId),
      ...request,
    };

    return this.http
      .post<PestSightingReportResource>(this.pestReportsEndpoint.collectionUrl, body)
      .pipe(map((resource) => PestReportAssembler.toEntityFromResource(resource)));
  }

  /**
   * Fetches the symptom catalog used by the report form.
   * @returns {Observable<SymptomResource[]>}
   */
  getSymptomDictionary(): Observable<SymptomResource[]> {
    return this.http
      .get<SymptomResource[]>(this.symptomsEndpoint.collectionUrl)
      .pipe(map((resources) => resources ?? []));
  }
}
