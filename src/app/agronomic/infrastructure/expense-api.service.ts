import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BaseApi } from '../../shared/infrastructure/base-api';

import { Expense } from '../domain/model/expense.entity';
import { CreateExpenseRequest, ExpenseAssembler, ExpenseResource } from './expense-response';

@Injectable({
  providedIn: 'root',
})
/**
 * Infrastructure gateway for the Agronomic bounded context (Expense History),
 * served by the real Viora Platform backend. Expenses are a real aggregate:
 * register (POST) and list by grower/plot (GET).
 *
 * @class ExpenseApiService
 * @extends BaseApi
 */
export class ExpenseApiService extends BaseApi {
  private readonly expensesEndpoint = this.endpoint(environment.endpoints.expenses);

  /**
   * Lists the active producer's expenses, optionally scoped to a single plot.
   * @param {number|string} [plotId] - Plot filter; omit for the grower-wide history.
   * @returns {Observable<Expense[]>}
   */
  getExpenses(plotId?: number | string | null): Observable<Expense[]> {
    return this.http
      .get<ExpenseResource[]>(this.expensesEndpoint.collectionUrl, {
        params: this.queryParams({ growerId: this.defaultUserId, plotId }),
      })
      .pipe(map((resources) => ExpenseAssembler.toEntitiesFromResources(resources ?? [])));
  }

  /**
   * Registers a new operational expense. The grower is the active producer.
   * @returns {Observable<Expense>}
   */
  createExpense(request: Omit<CreateExpenseRequest, 'growerId'>): Observable<Expense> {
    const body: CreateExpenseRequest = {
      growerId: Number(this.defaultUserId),
      ...request,
    };

    return this.http
      .post<ExpenseResource>(this.expensesEndpoint.collectionUrl, body)
      .pipe(map((resource) => ExpenseAssembler.toEntityFromResource(resource)));
  }
}
