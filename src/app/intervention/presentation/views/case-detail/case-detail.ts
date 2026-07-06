import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import {
  DashboardBreadcrumbItem,
  DashboardHeader,
} from '../../../../shared/presentation/components/dashboard-header/dashboard-header';

import { AgronomicApiService } from '../../../../agronomic/infrastructure/agronomic-api.service';
import { ExpenseApiService } from '../../../../agronomic/infrastructure/expense-api.service';
import { Plot } from '../../../../agronomic/domain/model/plot.entity';
import { SurveillanceStore } from '../../../../surveillance/application/surveillance.store';
import { Alert, AlertSeverity } from '../../../../surveillance/domain/model/alert.entity';

import { InterventionStore } from '../../../application/intervention.store';
import { SpecialistCandidate } from '../../../domain/model/specialist-candidate.entity';
import { InterventionRequest } from '../../../domain/model/intervention-request.entity';
import { ServiceProposal } from '../../../domain/model/service-proposal.entity';

/** Lifecycle phase of the case, derived from the request status. */
type CasePhase = 'awaiting' | 'proposal' | 'accepted' | 'declined';

/** A single event in the case timeline. */
interface CaseTimelineEvent {
  label: string;
  timestamp: string;
  tone: 'done' | 'active' | 'pending';
}

/** View model for the read-only service proposal card. */
interface ServiceProposalView {
  receivedDate: string;
  proposedService: string;
  visitDate: string;
  duration: string;
  scope: string[];
  cost: string;
  notes: string;
}

/** View model for the specialist contact card (revealed after acceptance). */
interface SpecialistContactView {
  phone: string;
  email: string;
  whatsapp: string;
  visitScheduled: string;
}

@Component({
  selector: 'app-case-detail',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatIconModule, DashboardHeader, TranslatePipe],
  templateUrl: './case-detail.html',
  styleUrl: './case-detail.css',
})
export class CaseDetailView implements OnInit {
  protected readonly store = inject(InterventionStore);
  private readonly surveillance = inject(SurveillanceStore);
  private readonly agronomicApi = inject(AgronomicApiService);
  private readonly expenseApi = inject(ExpenseApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly caseCode = signal<string>('');
  protected readonly plots = signal<Plot[]>([]);

  /** Guards the case-artifacts load so it fires once per resolved request. */
  private loadedCaseId: number | string | null = null;

  constructor() {
    // The request resolves asynchronously from the store's per-plot history, so
    // load the case's proposal (and contact, if accepted) once it's available.
    effect(() => {
      const request = this.request();
      if (request && request.id != null && request.id !== this.loadedCaseId) {
        this.loadedCaseId = request.id;
        this.store.loadCaseArtifacts(request);
      }
    });
  }

  // ----- Decline modal state -----
  protected readonly declineOpen = signal<boolean>(false);
  protected readonly declineReason = signal<string>('');

  /** The request backing this case (resolved from its reference code). */
  protected readonly request = computed<InterventionRequest | null>(() =>
    this.store.findRequestByCode(this.caseCode()),
  );

  protected readonly breadcrumbs = computed<DashboardBreadcrumbItem[]>(() => [
    { label: 'Expert Assistance', labelKey: 'assistance.breadcrumb.expertAssistance', route: '/assistance/expert-assistance' },
    { label: 'Case Detail', labelKey: 'caseDetail.breadcrumb.caseDetail', disabled: true },
    { label: this.caseCode() || '—', disabled: true },
  ]);

  /** The specialist assigned to the case. */
  protected readonly specialist = computed<SpecialistCandidate | null>(() => {
    const specialistId = this.request()?.specialistId ?? null;
    if (specialistId == null) {
      return null;
    }
    return (
      this.store.specialists().find((s) => String(s.id) === String(specialistId)) ??
      this.store.specialists()[0] ??
      null
    );
  });

  /** The plot this case belongs to. */
  protected readonly plot = computed<Plot | null>(() => {
    const plotId = this.request()?.plotId ?? null;
    return this.plots().find((p) => String(p.id) === String(plotId)) ?? null;
  });

  /** The alert that triggered the case. */
  protected readonly linkedAlert = computed<Alert | null>(() => {
    const alertId = this.request()?.alertId ?? null;
    if (alertId == null) {
      return null;
    }
    return this.surveillance.alerts().find((a) => String(a.id) === String(alertId)) ?? null;
  });

  /** Case phase derived from the request status. */
  protected readonly phase = computed<CasePhase>(() => {
    switch (this.request()?.status) {
      case 'PROPOSAL_RECEIVED':
        return 'proposal';
      case 'ACCEPTED':
        return 'accepted';
      case 'DECLINED':
        return 'declined';
      default:
        return 'awaiting';
    }
  });

  protected readonly contactUnlocked = computed<boolean>(() => this.phase() === 'accepted');

  protected readonly caseStatusLabel = computed<string>(() => {
    switch (this.phase()) {
      case 'proposal':
        return 'Proposal received';
      case 'accepted':
        return 'Proposal accepted';
      case 'declined':
        return 'Proposal declined';
      default:
        return 'Awaiting response';
    }
  });

  protected readonly caseStatusCaption = computed<string>(() => {
    switch (this.phase()) {
      case 'proposal':
        return 'Review the proposal and accept to schedule the field visit.';
      case 'accepted':
        return 'Proposal accepted. Coordinate the visit with the specialist.';
      case 'declined':
        return 'Proposal declined. Specialist search has been reactivated.';
      default:
        return 'Request sent. Waiting for specialist to evaluate availability.';
    }
  });

  /** Location · date caption for the linked-alert card. */
  protected readonly alertSummary = computed<string>(() => {
    const alert = this.linkedAlert();
    const plot = this.plot();
    const location = plot?.name ?? alert?.plot?.name ?? 'Plot';
    const date = alert?.formattedDate ?? 'Recent';
    return `${location} · ${date}`;
  });

  /** Read-only proposal from the backend, shaped for the proposal card. */
  protected readonly proposal = computed<ServiceProposalView>(() => {
    const proposal = this.store.activeProposal();
    const request = this.request();
    return {
      receivedDate: ServiceProposal.formatDate(request?.updatedAt ?? request?.createdAt ?? null),
      proposedService: proposal?.serviceTitle || 'Field inspection and phytosanitary evaluation',
      visitDate: proposal?.proposedDateLabel ?? '—',
      duration: proposal?.durationLabel || '—',
      scope: proposal?.scope ?? [],
      cost: proposal?.costLabel ?? '—',
      notes: proposal?.proposalDetails || '',
    };
  });

  /** Specialist contact from the backend (populated once the proposal is accepted). */
  protected readonly contact = computed<SpecialistContactView>(() => {
    const contact = this.store.activeContact();
    const proposal = this.store.activeProposal();
    return {
      phone: contact?.phone || '—',
      email: contact?.email || '—',
      whatsapp: contact?.whatsapp ?? '',
      visitScheduled: proposal?.proposedDateLabel ?? '—',
    };
  });

  /** Case timeline derived from the request lifecycle, newest event first. */
  protected readonly timeline = computed<CaseTimelineEvent[]>(() => {
    const request = this.request();
    if (!request) {
      return [];
    }

    const events: CaseTimelineEvent[] = [
      { label: 'Request sent', timestamp: this.formatDateTime(request.createdAt), tone: 'done' },
    ];

    if (this.store.activeProposal()) {
      events.push({
        label: 'Proposal received',
        timestamp: this.formatDateTime(request.updatedAt),
        tone: this.phase() === 'proposal' ? 'active' : 'done',
      });
    }

    if (this.phase() === 'accepted') {
      events.push({
        label: 'Proposal accepted',
        timestamp: this.formatDateTime(request.updatedAt),
        tone: 'active',
      });
    }

    return events.reverse();
  });

  ngOnInit(): void {
    this.caseCode.set(this.route.snapshot.paramMap.get('code') ?? '');
    if (this.surveillance.alerts().length === 0) {
      this.surveillance.fetchAlerts(50);
    }
    this.agronomicApi.getPlots().subscribe((plots) => this.plots.set(plots));

    // The case may be opened via a deep link / refresh, or straight from the
    // success modal before the overview loaded the plot history — in those cases
    // the store has no requests yet, so pull the full history to resolve it.
    if (!this.request()) {
      this.store.loadAllRequests();
    }
  }

  protected refresh(): void {
    this.surveillance.fetchAlerts(50);
    const request = this.request();
    if (request) {
      this.store.loadCaseArtifacts(request);
    }
  }

  /** Formats an ISO timestamp as "MMM DD, YYYY · hh:mm AM/PM". */
  private formatDateTime(raw: string | null): string {
    if (!raw) {
      return '—';
    }
    const timestamp = Date.parse(raw);
    if (Number.isNaN(timestamp)) {
      return '—';
    }
    const date = new Date(timestamp);
    const datePart = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(date);
    const timePart = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
    return `${datePart} · ${timePart}`;
  }

  protected severityClass(severity: AlertSeverity | undefined): string {
    return `severity-${(severity ?? 'Low').toLowerCase()}`;
  }

  protected acceptProposal(): void {
    const code = this.caseCode();
    if (code) {
      this.store.acceptProposal(code, (ok) => {
        if (ok) {
          this.registerSpecialistExpense();
        }
      });
    }
  }

  /**
   * Records the accepted proposal's cost as a real specialist expense so it feeds
   * Expense History (PEST_INTERVENTION / SPECIALIST, flagged ALERT_CONFIRMED and
   * linked to this case). Best-effort: a failure here doesn't block acceptance.
   */
  private registerSpecialistExpense(): void {
    const request = this.request();
    const proposal = this.store.activeProposal();
    if (!request || request.plotId == null || proposal?.amount == null) {
      return;
    }

    this.expenseApi
      .createExpense({
        plotId: Number(request.plotId),
        type: 'PEST_INTERVENTION',
        category: 'SPECIALIST',
        linkedActionCode: request.referenceCode || undefined,
        amount: proposal.amount,
        currency: proposal.currency ?? 'PEN',
        expenseDate: new Date().toISOString().slice(0, 10),
        paymentStatus: 'PENDING',
        note: proposal.serviceTitle || undefined,
        status: 'ALERT_CONFIRMED',
      })
      .subscribe({ error: () => undefined });
  }

  // ----- Decline modal -----

  protected openDecline(): void {
    this.declineReason.set('');
    this.declineOpen.set(true);
  }

  protected closeDecline(): void {
    this.declineOpen.set(false);
  }

  protected confirmDecline(): void {
    const code = this.caseCode();
    if (code) {
      this.store.declineProposal(code, this.declineReason());
    }
    this.declineOpen.set(false);
    this.backToOverview();
  }

  // ----- Contact actions -----

  protected copy(value: string): void {
    navigator.clipboard?.writeText(value);
  }

  protected openWhatsApp(): void {
    const number = this.contact().whatsapp.replace(/[^\d]/g, '');
    if (!number) {
      return;
    }
    window.open(`https://wa.me/${number}`, '_blank');
  }

  protected backToOverview(): void {
    const plotId = this.request()?.plotId ?? null;
    this.router.navigate(
      ['/assistance/expert-assistance'],
      plotId != null ? { queryParams: { plot: plotId } } : {},
    );
  }
}
