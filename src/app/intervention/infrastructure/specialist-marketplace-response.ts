import {
  CaseSeverity,
  MarketplaceCase,
  SpecialistMarketplace,
} from '../domain/model/marketplace-case.entity';

/** Backend resource shape for `GET /intervention-marketplace`. */
export interface SpecialistMarketplaceResource {
  newCasesCount: number | null;
  acceptanceRatePercent: number | null;
  activeCasesCount: number | null;
  cases: MarketplaceCaseResource[] | null;
  updatedAt: string | null;
}

export interface MarketplaceCaseResource {
  id: number | string | null;
  referenceCode: string | null;
  specialistId: number | null;
  severity: string | null;
  problem: string | null;
  ndvi: number | null;
  producerName: string | null;
  producerPhotoUrl: string | null;
  productionType: string | null;
  plotName: string | null;
  location: string | null;
  areaHectares: number | null;
  plotCount: number | null;
  createdAt: string | null;
}

const SEVERITIES: CaseSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

function toDate(raw: string | null): Date | null {
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export class SpecialistMarketplaceAssembler {
  static toEntityFromResource(resource: SpecialistMarketplaceResource): SpecialistMarketplace {
    return {
      newCasesCount: resource.newCasesCount ?? 0,
      // Null stays null so the view shows an empty state, not a misleading 0%.
      acceptanceRatePercent: resource.acceptanceRatePercent ?? null,
      activeCasesCount: resource.activeCasesCount ?? 0,
      cases: (resource.cases ?? []).map(SpecialistMarketplaceAssembler.toCase),
      updatedAt: toDate(resource.updatedAt),
    };
  }

  private static toCase(resource: MarketplaceCaseResource): MarketplaceCase {
    const severity = (resource.severity ?? '').toUpperCase() as CaseSeverity;
    return {
      id: resource.id ?? '',
      referenceCode: resource.referenceCode ?? '',
      specialistId: resource.specialistId ?? null,
      severity: SEVERITIES.includes(severity) ? severity : null,
      problem: resource.problem ?? '',
      ndvi: resource.ndvi ?? null,
      producerName: resource.producerName ?? '',
      producerPhotoUrl: resource.producerPhotoUrl ?? null,
      productionType: resource.productionType ?? null,
      plotName: resource.plotName ?? '',
      location: resource.location ?? null,
      areaHectares: resource.areaHectares ?? null,
      plotCount: resource.plotCount ?? null,
      createdAt: toDate(resource.createdAt),
    };
  }
}
