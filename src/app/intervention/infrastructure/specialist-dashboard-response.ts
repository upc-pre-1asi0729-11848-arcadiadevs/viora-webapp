import {
  IncomingRequest,
  PerformancePoint,
  PhytosanitaryStatus,
  SpecialistDashboard,
  ZonalRiskItem,
  ZonalRiskSeverity,
} from '../domain/model/specialist-dashboard.entity';

/** Backend resource shape for `GET /specialist-dashboard`. */
export interface SpecialistDashboardResource {
  resolvedInterventions: number | null;
  acceptanceRatePercent: number | null;
  acceptanceRateDeltaPercent: number | null;
  phytosanitaryEfficiencyPercent: number | null;
  phytosanitaryStatus: string | null;
  zonalRisks: ZonalRiskResource[] | null;
  incomingRequests: IncomingRequestResource[] | null;
  performanceMonthly: PerformancePointResource[] | null;
  performanceAnnual: PerformancePointResource[] | null;
  updatedAt: string | null;
}

export interface ZonalRiskResource {
  id: number | string | null;
  severity: string | null;
  title: string | null;
  distanceKm: number | null;
  sector: string | null;
}

export interface IncomingRequestResource {
  id: number | string | null;
  referenceCode: string | null;
  plotLabel: string | null;
  growerLabel: string | null;
  problem: string | null;
  createdAt: string | null;
}

export interface PerformancePointResource {
  label: string | null;
  value: number | null;
}

const SEVERITIES: ZonalRiskSeverity[] = ['HIGH', 'MEDIUM', 'LOW'];
const PHYTO_STATUSES: PhytosanitaryStatus[] = ['optimal', 'watch', 'critical'];

function toDate(raw: string | null): Date | null {
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export class SpecialistDashboardAssembler {
  static toEntityFromResource(resource: SpecialistDashboardResource): SpecialistDashboard {
    const status = (resource.phytosanitaryStatus ?? '').toLowerCase() as PhytosanitaryStatus;

    return {
      kpis: {
        resolvedInterventions: resource.resolvedInterventions ?? 0,
        // Null metrics stay null so the view can show an empty state instead of
        // a misleading zero — no fabricated data.
        acceptanceRatePercent: resource.acceptanceRatePercent ?? null,
        acceptanceRateDeltaPercent: resource.acceptanceRateDeltaPercent ?? null,
        phytosanitaryEfficiencyPercent: resource.phytosanitaryEfficiencyPercent ?? null,
        phytosanitaryStatus: PHYTO_STATUSES.includes(status) ? status : null,
      },
      zonalRisks: (resource.zonalRisks ?? []).map(SpecialistDashboardAssembler.toZonalRisk),
      incomingRequests: (resource.incomingRequests ?? []).map(
        SpecialistDashboardAssembler.toIncomingRequest,
      ),
      performanceMonthly: (resource.performanceMonthly ?? []).map(
        SpecialistDashboardAssembler.toPerformancePoint,
      ),
      performanceAnnual: (resource.performanceAnnual ?? []).map(
        SpecialistDashboardAssembler.toPerformancePoint,
      ),
      updatedAt: toDate(resource.updatedAt),
    };
  }

  private static toZonalRisk(resource: ZonalRiskResource): ZonalRiskItem {
    const severity = (resource.severity ?? '').toUpperCase() as ZonalRiskSeverity;
    return {
      id: resource.id ?? '',
      severity: SEVERITIES.includes(severity) ? severity : 'LOW',
      title: resource.title ?? '',
      distanceKm: resource.distanceKm ?? 0,
      sector: resource.sector ?? '',
    };
  }

  private static toIncomingRequest(resource: IncomingRequestResource): IncomingRequest {
    return {
      id: resource.id ?? '',
      referenceCode: resource.referenceCode ?? '',
      plotLabel: resource.plotLabel ?? '',
      growerLabel: resource.growerLabel ?? '',
      problem: resource.problem ?? '',
      createdAt: toDate(resource.createdAt),
    };
  }

  private static toPerformancePoint(resource: PerformancePointResource): PerformancePoint {
    return {
      label: resource.label ?? '',
      value: resource.value ?? 0,
    };
  }
}
