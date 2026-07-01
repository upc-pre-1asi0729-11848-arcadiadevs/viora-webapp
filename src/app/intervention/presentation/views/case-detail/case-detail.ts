import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import {
  DashboardBreadcrumbItem,
  DashboardHeader,
} from '../../../../shared/presentation/components/dashboard-header/dashboard-header';

import { AgronomicApiService } from '../../../../agronomic/infrastructure/agronomic-api.service';
import { Plot } from '../../../../agronomic/domain/model/plot.entity';
import { SurveillanceStore } from '../../../../surveillance/application/surveillance.store';
import { Alert, AlertSeverity } from '../../../../surveillance/domain/model/alert.entity';

import { InterventionStore } from '../../../application/intervention.store';
import { SpecialistCandidate } from '../../../domain/model/specialist-candidate.entity';
import { InterventionRequest } from '../../../domain/model/intervention-request.entity';

/** Lifecycle phase of the case, derived from the request status. */
type CasePhase = 'awaiting' | 'proposal' | 'accepted' | 'declined';

/** A single event in the case timeline (presentation). */
interface CaseTimelineEvent {
  label: string;
  timestamp: string;
  tone: 'done' | 'active' | 'pending';
}

/** Read-only service proposal submitted by the specialist (presentation). */
interface ServiceProposalView {
  receivedDate: string;
  proposedService: string;
  visitDate: string;
  duration: string;
  scope: string[];
  cost: string;
  notes: string;
}

/** Specialist contact details revealed after proposal acceptance (presentation). */
interface SpecialistContact {
  phone: string;
  email: string;
  whatsapp: string;
  visitScheduled: string;
}

@Component({
  selector: 'app-case-detail',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatIconModule, DashboardHeader],
  templateUrl: './case-detail.html',
  styleUrl: './case-detail.css',
})
export class CaseDetailView implements OnInit {
  protected readonly store = inject(InterventionStore);
  private readonly surveillance = inject(SurveillanceStore);
  private readonly agronomicApi = inject(AgronomicApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly caseCode = signal<string>('');
  protected readonly plots = signal<Plot[]>([]);

  // ----- Decline modal state -----
  protected readonly declineOpen = signal<boolean>(false);
  protected readonly declineReason = signal<string>('');

  /** The request backing this case (resolved from its reference code). */
  protected readonly request = computed<InterventionRequest | null>(() =>
    this.store.findRequestByCode(this.caseCode()),
  );

  protected readonly breadcrumbs = computed<DashboardBreadcrumbItem[]>(() => [
    { label: 'Expert Assistance', route: '/assistance/expert-assistance' },
    { label: 'Case Detail', disabled: true },
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

  /** Read-only proposal (presentation until a specialist app submits proposals). */
  protected readonly proposal: ServiceProposalView = {
    receivedDate: 'May 04, 2026',
    proposedService: 'Field inspection and phytosanitary evaluation',
    visitDate: 'May 06, 2026',
    duration: '2–3 hours',
    scope: [
      'Inspect affected zones in Santa Rosa',
      'Validate symptom report in field',
      'Review low-vigor areas',
      'Recommend next technical action',
    ],
    cost: 'S/ 280.00',
    notes:
      'The initial visit will focus on confirming the probable biological threat and defining whether a technical prescription is required.',
  };

  /** Specialist contact details (presentation; no contact fields on the backend yet). */
  protected readonly contact: SpecialistContact = {
    phone: '+51 987 654 321',
    email: 'valeria.rojas@viora.example',
    whatsapp: '+51 987 654 321',
    visitScheduled: 'May 06, 2026',
  };

  /** Case timeline (presentation). */
  protected readonly timeline: CaseTimelineEvent[] = [
    { label: 'Proposal received', timestamp: 'May 04, 2026 · 02:30 PM', tone: 'active' },
    { label: 'Request accepted by specialist', timestamp: 'May 03, 2026 · 11:10 AM', tone: 'done' },
    { label: 'Request sent', timestamp: 'May 03, 2026 · 10:00 AM', tone: 'pending' },
  ];

  ngOnInit(): void {
    this.caseCode.set(this.route.snapshot.paramMap.get('code') ?? '');
    if (this.surveillance.alerts().length === 0) {
      this.surveillance.fetchAlerts(50);
    }
    this.agronomicApi.getPlots().subscribe((plots) => this.plots.set(plots));
  }

  protected refresh(): void {
    this.surveillance.fetchAlerts(50);
  }

  protected severityClass(severity: AlertSeverity | undefined): string {
    return `severity-${(severity ?? 'Low').toLowerCase()}`;
  }

  protected acceptProposal(): void {
    const code = this.caseCode();
    if (code) {
      this.store.acceptProposal(code);
    }
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
      this.store.declineProposal(code);
    }
    this.declineOpen.set(false);
    this.router.navigate(['/assistance/expert-assistance']);
  }

  // ----- Contact actions -----

  protected copy(value: string): void {
    navigator.clipboard?.writeText(value);
  }

  protected openWhatsApp(): void {
    const number = this.contact.whatsapp.replace(/[^\d]/g, '');
    window.open(`https://wa.me/${number}`, '_blank');
  }

  protected backToOverview(): void {
    this.router.navigate(['/assistance/expert-assistance']);
  }
}
