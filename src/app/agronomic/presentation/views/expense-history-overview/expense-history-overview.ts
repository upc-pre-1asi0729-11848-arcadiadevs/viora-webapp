import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import {
  DashboardBreadcrumbItem,
  DashboardHeader,
} from '../../../../shared/presentation/components/dashboard-header/dashboard-header';

import { AgronomicApiService } from '../../../infrastructure/agronomic-api.service';
import { Plot } from '../../../domain/model/plot.entity';

import { ExpenseStore } from '../../../application/expense.store';
import {
  Expense,
  ExpenseCategory,
  ExpenseType,
  PaymentStatus,
} from '../../../domain/model/expense.entity';

/** Aggregated expense figures for a single plot (right-hand panel). */
interface PlotExpenseGroup {
  plotId: number | string | null;
  name: string;
  total: number;
  totalLabel: string;
  count: number;
  caption: string;
  barWidth: number;
  barClass: string;
}

/** Sentinel scope value for the grower-wide "All plots" view. */
const ALL_PLOTS = 'all';

@Component({
  selector: 'app-expense-history-overview',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatIconModule, DashboardHeader],
  templateUrl: './expense-history-overview.html',
  styleUrl: './expense-history-overview.css',
})
export class ExpenseHistoryOverviewView implements OnInit {
  protected readonly store = inject(ExpenseStore);
  private readonly agronomicApi = inject(AgronomicApiService);

  protected readonly breadcrumbs: DashboardBreadcrumbItem[] = [
    { label: 'Expense History', disabled: true },
    { label: 'Overview', disabled: true },
  ];

  protected readonly plots = signal<Plot[]>([]);
  /** Selected scope: a plot id, or ALL_PLOTS for the global view. */
  protected readonly selectedScope = signal<number | string>(ALL_PLOTS);

  protected readonly ExpenseEntity = Expense;

  // ----- Register expense modal state -----
  protected readonly modalOpen = signal<boolean>(false);
  protected readonly formType = signal<ExpenseType>('CLIMATE_MITIGATION');
  protected readonly formPlotId = signal<number | string | null>(null);
  protected readonly formLinkedAction = signal<string>('');
  protected readonly formCategory = signal<ExpenseCategory>('INPUTS');
  protected readonly formAmount = signal<string>('');
  protected readonly formDate = signal<string>('');
  protected readonly formPayment = signal<PaymentStatus>('PAID');
  protected readonly formNote = signal<string>('');

  protected readonly isAllScope = computed<boolean>(() => this.selectedScope() === ALL_PLOTS);

  protected readonly selectedPlot = computed<Plot | null>(() => {
    if (this.isAllScope()) {
      return null;
    }
    return this.plots().find((plot) => String(plot.id) === String(this.selectedScope())) ?? null;
  });

  protected readonly scopeLabel = computed<string>(() =>
    this.isAllScope() ? 'All plots' : this.selectedPlot()?.name ?? 'Plot',
  );

  /** Expenses grouped per plot, ranked by spend, for the "Expense by plot" panel. */
  protected readonly expensesByPlot = computed<PlotExpenseGroup[]>(() => {
    const groups = new Map<string, Expense[]>();
    for (const expense of this.store.expenses()) {
      const key = String(expense.plotId ?? '—');
      const bucket = groups.get(key) ?? [];
      bucket.push(expense);
      groups.set(key, bucket);
    }

    const rows: PlotExpenseGroup[] = [...groups.entries()].map(([key, items]) => {
      const total = items.reduce((sum, e) => sum + e.amount, 0);
      const dominantType = this.dominantType(items);
      return {
        plotId: items[0]?.plotId ?? null,
        name: this.plotName(items[0]?.plotId ?? null),
        total,
        totalLabel: Expense.formatMoney(total),
        count: items.length,
        caption: `${this.typeLabel(dominantType)} · ${items.length} ${items.length === 1 ? 'record' : 'records'}`,
        barWidth: 0,
        barClass: dominantType === 'PEST_INTERVENTION' ? 'bar-pest' : 'bar-climate',
      };
    });

    rows.sort((a, b) => b.total - a.total);
    const max = rows[0]?.total ?? 0;
    return rows.map((row) => ({ ...row, barWidth: max > 0 ? Math.round((row.total / max) * 100) : 0 }));
  });

  protected readonly mostAffectedPlotName = computed<string>(
    () => this.expensesByPlot()[0]?.name ?? '—',
  );

  protected readonly impactNote = computed<string>(() => {
    const driver = this.store.highestCostDriver();
    if (driver === 'PEST_INTERVENTION') {
      return 'Expenses are concentrated in phytosanitary response. Review intervention outcomes before the next campaign investment decision.';
    }
    if (driver === 'CLIMATE_MITIGATION') {
      return 'Expenses are concentrated in climate/nutrition mitigation. Review phenological risk before the next campaign investment decision.';
    }
    return 'No expenses registered yet for this scope.';
  });

  ngOnInit(): void {
    this.agronomicApi.getPlots().subscribe((plots) => {
      this.plots.set(plots);
      if (this.formPlotId() == null) {
        this.formPlotId.set(plots.find((plot) => plot.id != null)?.id ?? null);
      }
    });
    this.store.loadExpenses(null);
  }

  protected onSelectScope(value: string): void {
    this.selectedScope.set(value);
    this.reload();
  }

  protected refresh(): void {
    this.reload();
  }

  private reload(): void {
    this.store.loadExpenses(this.isAllScope() ? null : this.selectedScope());
  }

  protected plotName(plotId: number | string | null): string {
    if (plotId == null) {
      return 'Unknown plot';
    }
    return this.plots().find((plot) => String(plot.id) === String(plotId))?.name ?? `Plot #${plotId}`;
  }

  private typeLabel(type: ExpenseType): string {
    return type === 'PEST_INTERVENTION' ? 'Pest intervention' : 'Climate mitigation';
  }

  private dominantType(items: Expense[]): ExpenseType {
    const pest = items
      .filter((e) => e.type === 'PEST_INTERVENTION')
      .reduce((sum, e) => sum + e.amount, 0);
    const climate = items
      .filter((e) => e.type === 'CLIMATE_MITIGATION')
      .reduce((sum, e) => sum + e.amount, 0);
    return pest > climate ? 'PEST_INTERVENTION' : 'CLIMATE_MITIGATION';
  }

  // ----- Register expense modal -----

  protected openRegister(): void {
    this.formType.set('CLIMATE_MITIGATION');
    this.formPlotId.set(
      this.isAllScope()
        ? this.plots().find((plot) => plot.id != null)?.id ?? null
        : this.selectedScope(),
    );
    this.formLinkedAction.set('');
    this.formCategory.set('INPUTS');
    this.formAmount.set('');
    this.formDate.set(new Date().toISOString().slice(0, 10));
    this.formPayment.set('PAID');
    this.formNote.set('');
    this.modalOpen.set(true);
  }

  protected closeRegister(): void {
    this.modalOpen.set(false);
  }

  protected get canSave(): boolean {
    return (
      this.formPlotId() != null &&
      Number(this.formAmount()) >= 0 &&
      this.formAmount().trim().length > 0 &&
      this.formDate().trim().length > 0 &&
      !this.store.loading().submitting
    );
  }

  protected saveExpense(): void {
    const plotId = this.formPlotId();
    if (plotId == null || !this.canSave) {
      return;
    }

    this.store.submitExpense(
      {
        plotId: Number(plotId),
        type: this.formType(),
        category: this.formCategory(),
        linkedActionCode: this.formLinkedAction().trim() || undefined,
        amount: Number(this.formAmount()),
        currency: 'PEN',
        expenseDate: this.formDate(),
        paymentStatus: this.formPayment(),
        note: this.formNote().trim() || undefined,
      },
      (created) => {
        if (created) {
          this.modalOpen.set(false);
          this.reload();
        }
      },
    );
  }

  // ----- input helpers -----

  protected setAmount(value: string): void {
    this.formAmount.set(value);
  }

  /** Exports the current scope's expenses as a CSV download. */
  protected exportCsv(): void {
    const rows = this.store.expenses();
    if (rows.length === 0) {
      return;
    }

    const header = ['Date', 'Plot', 'Type', 'Linked action', 'Category', 'Amount', 'Currency', 'Status'];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = rows.map((expense) =>
      [
        expense.expenseDate ?? '',
        this.plotName(expense.plotId),
        expense.typeLabel,
        expense.linkedActionCode || '',
        expense.categoryLabel,
        expense.amount.toFixed(2),
        expense.currency,
        expense.statusLabel,
      ]
        .map((cell) => escape(String(cell)))
        .join(','),
    );

    const csv = [header.map(escape).join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `expenses-${this.isAllScope() ? 'all-plots' : this.scopeLabel()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
