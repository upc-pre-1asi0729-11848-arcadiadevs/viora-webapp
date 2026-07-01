/**
 * Application service store for the `Agronomic` bounded context (Expense History).
 * Coordinates the real expense aggregate: per-scope listing and registration, and
 * derives the financial KPIs shown on the overview.
 *
 * Data-source note: expenses are fully real (backend `/expenses`). The
 * "pending records" KPI (certified actions without a registered expense) depends
 * on the Intervention certification feed, which is not wired yet, so it stays 0
 * until that integration lands.
 *
 * @module ExpenseStore
 */
import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, take } from 'rxjs';

import { ExpenseApiService } from '../infrastructure/expense-api.service';
import { CreateExpenseRequest } from '../infrastructure/expense-response';
import { Expense, ExpenseType } from '../domain/model/expense.entity';

export interface ExpenseLoadingState {
  expenses: boolean;
  submitting: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ExpenseStore {
  private readonly expenseApi = inject(ExpenseApiService);

  /** Expenses for the active scope (all plots or the selected plot). */
  readonly expenses = signal<Expense[]>([]);
  readonly expensesLoaded = signal<boolean>(false);

  readonly loading = signal<ExpenseLoadingState>({ expenses: false, submitting: false });
  readonly errors = signal<unknown[]>([]);
  readonly lastSyncedAt = signal<number | null>(null);

  /**
   * Certified actions without a registered expense. Sourced from Intervention
   * certifications (ACL), not wired yet — stays 0 until that feed exists.
   */
  readonly pendingRecords = signal<number>(0);

  readonly expenseCount = computed<number>(() => this.expenses().length);

  readonly totalExpenses = computed<number>(() =>
    this.expenses().reduce((sum, expense) => sum + expense.amount, 0),
  );

  readonly climateTotal = computed<number>(() => this.sumByType('CLIMATE_MITIGATION'));
  readonly pestTotal = computed<number>(() => this.sumByType('PEST_INTERVENTION'));

  /** The type driving the highest spend, or null when there are no expenses. */
  readonly highestCostDriver = computed<ExpenseType | null>(() => {
    if (this.expenses().length === 0) {
      return null;
    }
    return this.pestTotal() > this.climateTotal() ? 'PEST_INTERVENTION' : 'CLIMATE_MITIGATION';
  });

  readonly highestCostDriverLabel = computed<string>(() => {
    switch (this.highestCostDriver()) {
      case 'PEST_INTERVENTION':
        return 'Pest intervention';
      case 'CLIMATE_MITIGATION':
        return 'Climate mitigation';
      default:
        return '—';
    }
  });

  /** Relative label for the header's "Updated N min ago" chip. */
  readonly lastSyncLabel = computed<string>(() => {
    const syncedAt = this.lastSyncedAt();
    if (!syncedAt) {
      return 'Not synced yet';
    }
    const diffMinutes = Math.max(0, Math.round((Date.now() - syncedAt) / 60000));
    if (diffMinutes < 1) {
      return 'Updated just now';
    }
    if (diffMinutes < 60) {
      return `Updated ${diffMinutes} min ago`;
    }
    return `Updated ${Math.round(diffMinutes / 60)} h ago`;
  });

  /**
   * Loads expenses for a scope: a concrete plot id, or null/undefined for the
   * grower-wide "All plots" view.
   * @param {number|string|null} [plotId]
   */
  loadExpenses(plotId?: number | string | null): void {
    this.setLoading('expenses', true);

    this.expenseApi
      .getExpenses(plotId ?? null)
      .pipe(
        take(1),
        finalize(() => this.setLoading('expenses', false)),
      )
      .subscribe({
        next: (expenses) => {
          this.expenses.set(expenses);
          this.expensesLoaded.set(true);
          this.lastSyncedAt.set(Date.now());
        },
        error: (error) => this.registerError(error),
      });
  }

  /**
   * Registers an expense. On success passes the created expense to the callback
   * so the caller can reload the current scope.
   * @param request the expense payload (growerId injected by the API service)
   * @param onDone optional callback with the created expense (or null on failure)
   */
  submitExpense(
    request: Omit<CreateExpenseRequest, 'growerId'>,
    onDone?: (created: Expense | null) => void,
  ): void {
    this.setLoading('submitting', true);

    this.expenseApi
      .createExpense(request)
      .pipe(
        take(1),
        finalize(() => this.setLoading('submitting', false)),
      )
      .subscribe({
        next: (created) => onDone?.(created),
        error: (error) => {
          this.registerError(error);
          onDone?.(null);
        },
      });
  }

  private sumByType(type: ExpenseType): number {
    return this.expenses()
      .filter((expense) => expense.type === type)
      .reduce((sum, expense) => sum + expense.amount, 0);
  }

  private setLoading(key: keyof ExpenseLoadingState, value: boolean): void {
    this.loading.update((state) => ({ ...state, [key]: value }));
  }

  private registerError(error: unknown): void {
    this.errors.update((errors) => [...errors, error]);
  }
}
