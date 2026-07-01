import {
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize, forkJoin } from 'rxjs';

import { AgronomicStore } from '../../../application/agronomic.store';
import { ExpenseApiService } from '../../../infrastructure/expense-api.service';
import { CreateExpenseRequest } from '../../../infrastructure/expense-response';
import { ExpenseCategory } from '../../../domain/model/expense.entity';
import { Plot } from '../../../domain/model/plot.entity';
import { MonitoringSummary } from '../../../domain/model/monitoring-summary.entity';
import { ChillHourRecord } from '../../../domain/model/chill-hour-record.entity';
import { DynamicNutritionPlan } from '../../../domain/model/dynamic-nutrition-plan.entity';
import {
  DashboardBreadcrumbItem,
  DashboardHeader,
} from '../../../../shared/presentation/components/dashboard-header/dashboard-header';

/**
 * Reference olive farm-gate price (S/ per tonne) used to estimate the margin in
 * the client-side expense modal. Placeholder until the backend exposes revenue;
 * swap this for the real figure when the financial endpoint lands.
 */
const REFERENCE_PRICE_PER_TONNE = 4200;

interface CertifyForm {
  date: string;
  time: string;
  dose: string;
  operator: string;
  notes: string;
}

interface ExpenseForm {
  input: number | null;
  labor: number | null;
  equipment: number | null;
  code: string;
  notes: string;
}

/**
 * Dynamic Nutrition — Active Plan. Renders the backend-generated compensatory
 * plan for the selected plot (recommendations, rationale, application window,
 * execution) and drives certification (real POST) plus a client-side mitigation
 * expense declaration (ready to wire to a future endpoint).
 */
@Component({
  selector: 'app-dynamic-nutrition-page',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    TranslatePipe,
    DashboardHeader,
  ],
  templateUrl: './dynamic-nutrition-page.html',
  styleUrl: './dynamic-nutrition-page.css',
})
export class DynamicNutritionPage implements OnInit {
  private readonly router = inject(Router);
  protected readonly store = inject(AgronomicStore);
  private readonly expenseApi = inject(ExpenseApiService);

  /** True while the mitigation-expense declaration is being persisted. */
  protected readonly expenseSaving = signal<boolean>(false);
  /** Whether the current plan already has a mitigation expense registered. */
  protected readonly hasMitigationExpense = signal<boolean>(false);
  /**
   * The nutrition intervention is "closed" once its plan is both certified in
   * field and financially declared. The plan itself stays ACTIVE by design (it
   * remains the plot's current plan and can be superseded by a new alert).
   */
  protected readonly executionClosed = computed<boolean>(
    () => (this.plan()?.isCertified ?? false) && this.hasMitigationExpense(),
  );

  protected readonly selectedPlotId = signal<string | null>(null);

  protected readonly showCertify = signal<boolean>(false);
  protected readonly showExpense = signal<boolean>(false);

  /**
   * Backend reason when "Generate plan" is rejected — e.g. 422 BUSINESS_RULE
   * "climate risk level is not high enough". Surfaced verbatim (it's accurate
   * and actionable) below the generate button.
   */
  protected readonly generateMessage = signal<string | null>(null);

  /** Field-certification form (template-driven). */
  protected certForm: CertifyForm = { date: '', time: '', dose: 'Applied as recommended', operator: '', notes: '' };
  /** Which plan inputs were applied (keyed by input name). */
  protected appliedInputs: Record<string, boolean> = {};

  /** Mitigation-expense form (client-side declaration). */
  protected expenseForm: ExpenseForm = { input: null, labor: null, equipment: null, code: '', notes: '' };
  /** Locally-declared expense (until a backend endpoint exists). */
  protected readonly savedExpenseTotal = signal<number | null>(null);

  constructor() {
    // Default the plot to the dashboard's active plot (or the first one).
    effect(() => {
      const plots = this.store.plots();

      if (this.selectedPlotId() === null && plots.length > 0) {
        const fallback = this.store.selectedMapPlotId();
        untracked(() =>
          this.selectedPlotId.set(fallback != null ? String(fallback) : String(plots[0].id)),
        );
      }
    });

    // Load the plan + monitoring summary (chill/yield) for the selected plot.
    effect(() => {
      const id = this.selectedPlotId();
      if (!id) {
        return;
      }
      untracked(() => {
        this.store.fetchActiveNutritionPlan(id);
        this.store.ensurePlotSummary(id);
        this.savedExpenseTotal.set(null);
      });
    });

    // Reflect whether the loaded plan already carries a declared mitigation
    // expense (so the "closed" state survives reloads, not just this session).
    effect(() => {
      const plan = this.plan();
      if (plan?.plotId != null) {
        const plotId = plan.plotId;
        const planCode = plan.planCode;
        untracked(() => this.refreshPlanExpenses(plotId, planCode));
      } else {
        this.hasMitigationExpense.set(false);
      }
    });
  }

  /** Loads the plot's expenses and flags whether one is linked to this plan. */
  private refreshPlanExpenses(plotId: number | string, planCode: string): void {
    this.expenseApi.getExpenses(plotId).subscribe({
      next: (expenses) =>
        this.hasMitigationExpense.set(
          expenses.some((expense) => expense.linkedActionCode === planCode),
        ),
      error: () => this.hasMitigationExpense.set(false),
    });
  }

  ngOnInit(): void {
    if (this.store.plots().length === 0) {
      this.store.fetchPlots();
    }
  }

  /** Signed, 1-decimal temperature anomaly label (avoids float noise like 5.1999…). */
  protected formatAnomaly(value: number | null | undefined): string {
    const rounded = Math.round((value ?? 0) * 10) / 10;
    return `${rounded > 0 ? '+' : ''}${rounded}`;
  }

  // ----- Queries -----

  protected readonly plan = computed<DynamicNutritionPlan | null>(() =>
    this.store.activeNutritionPlan(),
  );

  protected readonly selectedPlot = computed<Plot | null>(() => {
    const id = this.selectedPlotId();
    return id ? (this.store.plots().find((plot) => String(plot.id) === id) ?? null) : null;
  });

  private readonly summary = computed<MonitoringSummary | null>(
    () => this.store.plotSummaryCache()[this.selectedPlotId() ?? ''] ?? null,
  );

  protected readonly chill = computed<ChillHourRecord | null>(
    () => this.summary()?.chillHourRecord ?? null,
  );

  protected readonly chillGap = computed<number>(() => {
    const chill = this.chill();
    return chill ? Math.round(chill.accumulatedChillPortions - chill.threshold) : 0;
  });

  protected readonly yieldRiskLabel = computed<string>(
    () => this.summary()?.yieldForecast?.riskLevel ?? '—',
  );

  protected readonly isLoading = computed<boolean>(() => this.store.loading().nutrition);
  protected readonly isSaving = computed<boolean>(() => this.store.loading().saving);

  protected readonly breadcrumbs = computed<DashboardBreadcrumbItem[]>(() => [
    { label: 'Dashboard', labelKey: 'breadcrumbs.dashboard', route: '/dashboard' },
    { label: 'Dynamic Nutrition', labelKey: 'sidebar.dynamicNutrition', disabled: true },
    { label: 'Active Plan', labelKey: 'dynamicNutrition.activePlan', disabled: true },
  ]);

  protected updatedLabel(): string {
    const date = this.plan()?.generatedDate;
    const parsed = date ? new Date(date) : null;

    if (!parsed || Number.isNaN(parsed.getTime())) {
      return 'No sync yet';
    }

    const minutes = Math.max(0, Math.round((Date.now() - parsed.getTime()) / 60000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
  }

  // ----- Plot selection / plan lifecycle -----

  protected onPlotChange(plotId: string): void {
    this.selectedPlotId.set(plotId);
  }

  protected generatePlan(): void {
    const id = this.selectedPlotId();
    if (!id) {
      return;
    }

    this.generateMessage.set(null);
    this.store.generateNutritionPlan(
      id,
      () => this.generateMessage.set(null),
      (error) => this.generateMessage.set(this.toErrorMessage(error)),
    );
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { details?: string; message?: string } | null;
      return this.normalizeRiskLabels(body?.details || body?.message || error.message);
    }
    return 'Could not generate the plan.';
  }

  private normalizeRiskLabels(message: string): string {
    const labels: Record<string, string> = {
      LOW: 'Low',
      MEDIUM: 'Moderate',
      MODERATE: 'Moderate',
      HIGH: 'High',
      EXTREME: 'Extreme',
    };

    return message.replace(/\b(LOW|MEDIUM|MODERATE|HIGH|EXTREME)\b/g, (value) => labels[value]);
  }

  protected refresh(): void {
    const id = this.selectedPlotId();
    if (id) {
      this.store.fetchActiveNutritionPlan(id);
    }
  }

  // ----- Certify modal -----

  protected openCertify(): void {
    const plan = this.plan();
    if (!plan) {
      return;
    }

    const now = new Date();
    this.certForm = {
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      dose: 'Applied as recommended',
      operator: '',
      notes: '',
    };
    this.appliedInputs = {};
    plan.inputs.forEach((input) => {
      this.appliedInputs[input.name] = input.status === 'Recommended';
    });

    this.showCertify.set(true);
  }

  protected closeCertify(): void {
    this.showCertify.set(false);
  }

  protected get appliedInputNames(): string[] {
    return Object.keys(this.appliedInputs).filter((name) => this.appliedInputs[name]);
  }

  protected get canCertify(): boolean {
    return (
      Boolean(this.certForm.date) &&
      Boolean(this.certForm.time) &&
      Boolean(this.certForm.operator.trim()) &&
      this.appliedInputNames.length > 0 &&
      !this.isSaving()
    );
  }

  protected submitCertify(): void {
    const plan = this.plan();
    if (!plan?.id || !this.canCertify) {
      return;
    }

    this.store.certifyNutritionPlan(
      plan.id,
      {
        applicationDate: this.certForm.date,
        applicationTime: this.certForm.time,
        appliedInputs: this.appliedInputNames,
        // Backend expects the DoseConfirmation enum (AS_RECOMMENDED | ADJUSTED),
        // not the display label — anything other than "as recommended" is ADJUSTED.
        doseConfirmation:
          this.certForm.dose === 'Applied as recommended' ? 'AS_RECOMMENDED' : 'ADJUSTED',
        fieldOperator: this.certForm.operator.trim(),
        fieldNotes: this.certForm.notes.trim(),
      },
      () => this.closeCertify(),
    );
  }

  // ----- Expense modal (client-side) -----

  protected openExpense(): void {
    this.expenseForm = { input: null, labor: null, equipment: null, code: '', notes: '' };
    this.showExpense.set(true);
  }

  protected closeExpense(): void {
    this.showExpense.set(false);
  }

  protected get expenseTotal(): number {
    const { input, labor, equipment } = this.expenseForm;
    return (input ?? 0) + (labor ?? 0) + (equipment ?? 0);
  }

  /**
   * Estimated margin after the declared expense, using the plot's yield forecast
   * and a reference price. Returns null when there is no yield basis to estimate.
   */
  protected get expenseMargin(): number | null {
    const tonnes = this.summary()?.yieldForecast?.tonnes ?? 0;
    if (tonnes <= 0) {
      return null;
    }

    const revenue = tonnes * REFERENCE_PRICE_PER_TONNE;
    if (revenue <= 0) {
      return null;
    }

    return Math.round(((revenue - this.expenseTotal) / revenue) * 1000) / 10;
  }

  protected get canSaveExpense(): boolean {
    return this.expenseTotal > 0 && !this.expenseSaving();
  }

  /**
   * Persists the mitigation-expense declaration as real Expense records linked to
   * this nutrition plan (one per non-zero cost line), so it feeds Expense History.
   * Input → INPUTS, Labor → LABOR, Equipment → EQUIPMENT; all CLIMATE_MITIGATION.
   */
  protected submitExpense(): void {
    const plan = this.plan();
    if (!plan || plan.plotId == null || !this.canSaveExpense) {
      return;
    }

    const receipt = this.expenseForm.code?.trim();
    const note = this.expenseForm.notes?.trim() || (receipt ? `Receipt: ${receipt}` : undefined);

    const base: Omit<CreateExpenseRequest, 'growerId' | 'category' | 'amount'> = {
      plotId: plan.plotId,
      type: 'CLIMATE_MITIGATION',
      currency: 'PEN',
      expenseDate: new Date().toISOString().slice(0, 10),
      paymentStatus: 'PAID',
      linkedActionCode: plan.planCode,
      note,
    };

    const lines: { category: ExpenseCategory; amount: number | null }[] = [
      { category: 'INPUTS', amount: this.expenseForm.input },
      { category: 'LABOR', amount: this.expenseForm.labor },
      { category: 'EQUIPMENT', amount: this.expenseForm.equipment },
    ];

    const requests = lines
      .filter((line) => (line.amount ?? 0) > 0)
      .map((line) => this.expenseApi.createExpense({ ...base, category: line.category, amount: line.amount! }));

    if (requests.length === 0) {
      return;
    }

    const declaredTotal = this.expenseTotal;
    this.expenseSaving.set(true);
    forkJoin(requests)
      .pipe(finalize(() => this.expenseSaving.set(false)))
      .subscribe({
        next: () => {
          this.savedExpenseTotal.set(declaredTotal);
          this.hasMitigationExpense.set(true);
          this.refreshPlanExpenses(plan.plotId!, plan.planCode);
          this.closeExpense();
        },
      });
  }

  // ----- Formatting helpers -----

  protected formatDate(iso: string | undefined): string {
    if (!iso) return '—';
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? iso
      : date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
  }

  protected formatWindow(start: string | undefined, end: string | undefined): string {
    return `${this.formatDate(start)} – ${this.formatDate(end)}`;
  }

  protected dosageLabel(plan: DynamicNutritionPlan, dosage: number, unit: string): string {
    return `${dosage} ${unit}`;
  }
}
