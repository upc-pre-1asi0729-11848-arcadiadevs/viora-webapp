import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { SpecialistMarketplaceStore } from '../../../../intervention/application/specialist-marketplace.store';
import { MarketplaceCase } from '../../../../intervention/domain/model/marketplace-case.entity';
import { DashboardBreadcrumbItem, DashboardHeader } from '../../components/dashboard-header/dashboard-header';

/** Default proposal the specialist can adjust before sending (real submission). */
const DEFAULT_SCOPE = [
  'Inspect the affected zones in the plot',
  'Validate the symptom report in field',
  'Review low-vigor areas',
  'Recommend the next technical action',
];

@Component({
  selector: 'app-specialist-marketplace',
  standalone: true,
  imports: [DatePipe, DecimalPipe, RouterLink, MatIconModule, DashboardHeader, TranslatePipe],
  templateUrl: './specialist-marketplace.html',
  styleUrl: './specialist-marketplace.css',
})
export class SpecialistMarketplace implements OnInit {
  protected readonly store = inject(SpecialistMarketplaceStore);

  protected readonly breadcrumbs: DashboardBreadcrumbItem[] = [
    { label: 'Intervention Marketplace', labelKey: 'specialistMarketplace.breadcrumb.marketplace', disabled: true },
    { label: 'Overview', labelKey: 'specialistMarketplace.breadcrumb.overview', disabled: true },
  ];

  // ----- Proposal modal state -----
  protected readonly modalCase = signal<MarketplaceCase | null>(null);
  protected readonly formTitle = signal<string>('');
  protected readonly formDuration = signal<string>('');
  protected readonly formScope = signal<string>('');
  protected readonly formAmount = signal<string>('');
  protected readonly formCurrency = signal<string>('PEN');
  protected readonly formDetails = signal<string>('');

  ngOnInit(): void {
    this.store.load();
  }

  protected refresh(): void {
    this.store.refresh();
  }

  protected readonly acceptanceDeltaLabel = computed<string | null>(() => null);

  protected readonly updatedAgoLabel = computed<string>(() => {
    const updatedAt = this.store.updatedAt();
    if (!updatedAt) {
      return 'No sync yet';
    }
    const diffInMinutes = Math.max(0, Math.round((Date.now() - updatedAt.getTime()) / 60000));
    if (diffInMinutes < 1) {
      return 'just now';
    }
    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    }
    const diffInHours = Math.round(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} h ago`;
    }
    return `${Math.round(diffInHours / 24)} days ago`;
  });

  /** Two-letter avatar initials from the producer name. */
  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '—';
    }
    const first = parts[0].charAt(0);
    const second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + second).toUpperCase();
  }

  protected severityKey(severity: MarketplaceCase['severity']): string {
    return severity ?? 'LOW';
  }

  // ----- Decline -----

  protected decline(caseItem: MarketplaceCase): void {
    this.store.decline(caseItem);
  }

  // ----- Proposal modal -----

  protected openProposal(caseItem: MarketplaceCase): void {
    this.modalCase.set(caseItem);
    this.formTitle.set('Field inspection and phytosanitary evaluation');
    this.formDuration.set('2-3 hours');
    this.formScope.set(DEFAULT_SCOPE.join('\n'));
    this.formAmount.set('280');
    this.formCurrency.set('PEN');
    this.formDetails.set(
      'The initial visit will focus on confirming the probable biological threat and defining whether a technical prescription is required.',
    );
  }

  protected closeModal(): void {
    this.modalCase.set(null);
  }

  protected get canSubmit(): boolean {
    return (
      this.modalCase() != null &&
      this.formTitle().trim().length > 0 &&
      this.formScope().trim().length > 0 &&
      Number(this.formAmount()) > 0 &&
      !this.store.submitting()
    );
  }

  protected submitProposal(): void {
    const caseItem = this.modalCase();
    if (!caseItem || !this.canSubmit) {
      return;
    }

    const scope = this.formScope()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    this.store.submitProposal(
      caseItem,
      {
        serviceTitle: this.formTitle().trim(),
        durationLabel: this.formDuration().trim(),
        scope,
        // Real proposed date: three days out from now (specialist can be given a
        // picker later; the marketplace ships with a sensible default window).
        proposedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        amount: Number(this.formAmount()),
        currency: this.formCurrency().trim() || 'PEN',
        proposalDetails: this.formDetails().trim(),
      },
      (ok) => {
        if (ok) {
          this.closeModal();
        }
      },
    );
  }
}
