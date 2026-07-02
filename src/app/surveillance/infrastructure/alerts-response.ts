/**
 * @file alerts-response.ts
 * @description API resource payloads for the real Surveillance backend:
 *  - GET   /api/v1/alerts?userId&sort=recent&limit   (AlertSummaryResource[])
 *  - GET   /api/v1/alerts/{id}                        (AlertDetailResource)
 *  - PATCH /api/v1/alerts/{id}                        ({ status })
 */

export interface AlertPlotResource {
  name?: string;
  location?: string;
  hectares?: number;
}

/** Row payload returned by GET /alerts (AlertSummaryResource). */
export interface AlertResource {
  id?: number;
  type?: string;
  description?: string;
  severity?: string;
  date?: string;
  status?: string;
  sources?: string[];
  plotId?: number;
  reportId?: number;
  plot?: AlertPlotResource;
}

/** Detail payload returned by GET /alerts/{id} (AlertResource on the backend). */
export interface AlertDetailResource {
  id?: number;
  plotId?: number;
  type?: string;
  severity?: string;
  status?: string;
  title?: string;
  riskExplanation?: string;
  sources?: string[];
  dataProviders?: string[];
  supportingData?: Record<string, string>;
}

/** Request body for PATCH /alerts/{id}. */
export interface UpdateAlertRequest {
  status: string;
}
