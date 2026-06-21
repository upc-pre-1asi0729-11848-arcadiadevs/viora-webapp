/**
 * @file pest-sighting-report-response.ts
 * @description API payloads for the Pest Sighting Report endpoints:
 *  - GET  /api/v1/pest-sighting-reports?reporterUserId
 *  - POST /api/v1/pest-sighting-reports
 */

/** Report row returned by GET /pest-sighting-reports (PestSightingReportResource). */
export interface PestSightingReportResource {
  id?: number;
  plotId?: number;
  reporterUserId?: number;
  riskZone?: string;
  symptoms?: string[];
  observedSeverity?: string;
  notes?: string;
  evaluated?: boolean;
  calculatedRisk?: string;
  probableThreat?: string;
  status?: string;
  alertConfirmed?: boolean;
}

/** Request body for POST /pest-sighting-reports (CreatePestSightingReportResource). */
export interface CreatePestSightingReportRequest {
  plotId: number;
  reporterUserId: number;
  riskZone: string;
  symptoms: string[];
  observedSeverity: string;
  notes?: string;
}
