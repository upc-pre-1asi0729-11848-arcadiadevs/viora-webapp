import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { SpecialistCasesStore } from '../../../../intervention/application/specialist-cases.store';
import { SpecialistCase, caseCostLabel } from '../../../../intervention/domain/model/specialist-case.entity';
import { DashboardBreadcrumbItem, DashboardHeader } from '../../components/dashboard-header/dashboard-header';

/** My Requests — the specialist's pipeline of cases they've already responded to. */
@Component({
  selector: 'app-specialist-requests',
  standalone: true,
  imports: [DatePipe, DecimalPipe, MatIconModule, DashboardHeader, TranslatePipe],
  templateUrl: './specialist-requests.html',
  styleUrl: './specialist-requests.css',
})
export class SpecialistRequests implements OnInit {
  protected readonly store = inject(SpecialistCasesStore);
  private readonly router = inject(Router);

  protected readonly costLabel = caseCostLabel;

  protected readonly detailCase = signal<SpecialistCase | null>(null);

  protected readonly breadcrumbs: DashboardBreadcrumbItem[] = [
    { label: 'My Requests', labelKey: 'specialistRequests.breadcrumb.requests', disabled: true },
    { label: 'Overview', labelKey: 'specialistRequests.breadcrumb.overview', disabled: true },
  ];

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

  /** Status token that drives the pill styling/label per case. */
  protected statusToken(item: SpecialistCase): string {
    if (item.requestStatus === 'ACCEPTED') {
      return item.fieldStage === 'CLOSED' ? 'CLOSED' : 'ACCEPTED';
    }
    return item.requestStatus ?? 'PROPOSAL_RECEIVED';
  }

  protected relativeTime(date: Date | null): string {
    if (!date) {
      return '—';
    }
    const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) {
      return 'just now';
    }
    if (minutes < 60) {
      return `${minutes} min ago`;
    }
    const hours = Math.round(minutes / 60);
    if (hours < 24) {
      return `${hours} h ago`;
    }
    return `${Math.round(hours / 24)} days ago`;
  }

  protected openDetail(item: SpecialistCase): void {
    this.detailCase.set(item);
  }

  protected closeDetail(): void {
    this.detailCase.set(null);
  }

  /** Active cases are executed from the Field Inspection screen. */
  protected followUp(): void {
    void this.router.navigate(['/specialist/field-inspection']);
  }
}
