import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { SpecialistCasesStore } from '../../../../intervention/application/specialist-cases.store';
import { SpecialistCase } from '../../../../intervention/domain/model/specialist-case.entity';
import {
  ApplicationMethod,
  FindingType,
  IncidenceLevel,
  PrescribedProductRequest,
  ProtectiveEquipment,
} from '../../../../intervention/infrastructure/specialist-cases-api.service';
import { DashboardBreadcrumbItem, DashboardHeader } from '../../components/dashboard-header/dashboard-header';

type ModalMode = 'findings' | 'prescription' | 'detail' | null;

interface ProductRow {
  productName: string;
  dosageAmount: string;
  dosageUnit: string;
  sessionsCount: string;
  technicalRecommendation: string;
}

/** Field Inspection — the specialist's on-site work: inspect → prescribe. */
@Component({
  selector: 'app-specialist-field-inspection',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatIconModule, DashboardHeader, TranslatePipe],
  templateUrl: './specialist-field-inspection.html',
  styleUrl: './specialist-field-inspection.css',
})
export class SpecialistFieldInspection implements OnInit {
  protected readonly store = inject(SpecialistCasesStore);

  protected readonly breadcrumbs: DashboardBreadcrumbItem[] = [
    { label: 'Field Inspection', labelKey: 'specialistFieldInspection.breadcrumb.field', disabled: true },
    { label: 'Active cases', labelKey: 'specialistFieldInspection.breadcrumb.active', disabled: true },
  ];

  protected readonly findingTypes: FindingType[] = ['PHYTOSANITARY', 'NUTRITIONAL', 'WATER_STRESS', 'OTHER'];
  protected readonly incidenceLevels: IncidenceLevel[] = ['LOW', 'MEDIUM', 'CRITICAL'];
  protected readonly applicationMethods: ApplicationMethod[] = [
    'HYDRAULIC_SPRAYING',
    'DRIP_IRRIGATION',
    'FOLIAR',
    'SOIL_DRENCH',
    'OTHER',
  ];
  protected readonly ppeOptions: ProtectiveEquipment[] = ['MASK', 'GLOVES', 'GOGGLES', 'COVERALLS'];

  // ----- Modal state -----
  protected readonly modalMode = signal<ModalMode>(null);
  protected readonly modalCase = signal<SpecialistCase | null>(null);

  // Findings form
  protected readonly findingType = signal<FindingType>('PHYTOSANITARY');
  protected readonly incidenceLevel = signal<IncidenceLevel>('MEDIUM');
  protected readonly findingsDescription = signal<string>('');

  // Prescription form
  protected readonly applicationMethod = signal<ApplicationMethod>('FOLIAR');
  protected readonly sprayVolumeAmount = signal<string>('');
  protected readonly sprayVolumeUnit = signal<string>('L/ha');
  protected readonly preHarvestIntervalDays = signal<string>('');
  protected readonly recommendations = signal<string>('');
  protected readonly selectedPPE = signal<ProtectiveEquipment[]>([]);
  protected readonly products = signal<ProductRow[]>([this.emptyProduct()]);

  protected readonly updatedAgoLabel = computed<string>(() => this.relativeTime(this.store.updatedAt()));

  ngOnInit(): void {
    this.store.load();
  }

  protected refresh(): void {
    this.store.refresh();
  }

  protected severityKey(severity: SpecialistCase['severity']): string {
    return severity ?? 'LOW';
  }

  protected relativeTime(date: Date | null): string {
    if (!date) {
      return '—';
    }
    const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    return `${Math.round(hours / 24)} days ago`;
  }

  // ----- Modal openers -----

  protected startInspection(item: SpecialistCase): void {
    this.modalCase.set(item);
    this.findingType.set('PHYTOSANITARY');
    this.incidenceLevel.set(item.severity === 'CRITICAL' ? 'CRITICAL' : item.severity === 'HIGH' ? 'MEDIUM' : 'LOW');
    this.findingsDescription.set('');
    this.modalMode.set('findings');
  }

  protected writePrescription(item: SpecialistCase): void {
    this.modalCase.set(item);
    this.applicationMethod.set('FOLIAR');
    this.sprayVolumeAmount.set('');
    this.sprayVolumeUnit.set('L/ha');
    this.preHarvestIntervalDays.set('');
    this.recommendations.set('');
    this.selectedPPE.set(['GLOVES', 'MASK']);
    this.products.set([this.emptyProduct()]);
    this.modalMode.set('prescription');
  }

  protected openDetail(item: SpecialistCase): void {
    this.modalCase.set(item);
    this.modalMode.set('detail');
  }

  protected closeModal(): void {
    this.modalMode.set(null);
    this.modalCase.set(null);
  }

  // ----- PPE + products editing -----

  protected togglePPE(ppe: ProtectiveEquipment): void {
    this.selectedPPE.update((list) =>
      list.includes(ppe) ? list.filter((p) => p !== ppe) : [...list, ppe],
    );
  }

  protected isPPESelected(ppe: ProtectiveEquipment): boolean {
    return this.selectedPPE().includes(ppe);
  }

  protected updateProduct(index: number, field: keyof ProductRow, value: string): void {
    this.products.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  protected addProduct(): void {
    this.products.update((rows) => [...rows, this.emptyProduct()]);
  }

  protected removeProduct(index: number): void {
    this.products.update((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));
  }

  // ----- Submit -----

  protected get canSubmitFindings(): boolean {
    return this.findingsDescription().trim().length > 0 && !this.store.submitting();
  }

  protected submitFindings(): void {
    const item = this.modalCase();
    if (!item || !this.canSubmitFindings) {
      return;
    }
    this.store.logFindings(
      item,
      {
        findingType: this.findingType(),
        incidenceLevel: this.incidenceLevel(),
        technicalDescription: this.findingsDescription().trim(),
        recordDate: new Date().toISOString(),
      },
      (ok) => {
        if (ok) this.closeModal();
      },
    );
  }

  protected get canSubmitPrescription(): boolean {
    return this.products().some((p) => p.productName.trim().length > 0) && !this.store.submitting();
  }

  protected submitPrescription(): void {
    const item = this.modalCase();
    if (!item || !this.canSubmitPrescription) {
      return;
    }
    const products: PrescribedProductRequest[] = this.products()
      .filter((p) => p.productName.trim().length > 0)
      .map((p) => ({
        productName: p.productName.trim(),
        dosageAmount: this.toNumberOrNull(p.dosageAmount),
        dosageUnit: p.dosageUnit.trim(),
        sessionsCount: this.toNumberOrNull(p.sessionsCount),
        technicalRecommendation: p.technicalRecommendation.trim(),
      }));

    this.store.prescribe(
      item,
      {
        applicationMethod: this.applicationMethod(),
        sprayVolumeAmount: this.toNumberOrNull(this.sprayVolumeAmount()),
        sprayVolumeUnit: this.sprayVolumeUnit().trim(),
        preHarvestIntervalDays: this.toNumberOrNull(this.preHarvestIntervalDays()),
        agronomistRecommendations: this.recommendations().trim(),
        requiredPPE: this.selectedPPE(),
        products,
      },
      (ok) => {
        if (ok) this.closeModal();
      },
    );
  }

  private emptyProduct(): ProductRow {
    return { productName: '', dosageAmount: '', dosageUnit: '', sessionsCount: '', technicalRecommendation: '' };
  }

  private toNumberOrNull(value: string): number | null {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
