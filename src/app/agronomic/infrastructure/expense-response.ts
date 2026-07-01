import {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
  ExpenseType,
  PaymentStatus,
} from '../domain/model/expense.entity';

/** Backend resource shape for an expense (`/expenses`). */
export interface ExpenseResource {
  id: number | null;
  growerId: number | null;
  plotId: number | null;
  type: string | null;
  category: string | null;
  linkedActionCode: string | null;
  amount: number | null;
  currency: string | null;
  expenseDate: string | null;
  paymentStatus: string | null;
  note: string | null;
  status: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Request body for `POST /expenses` (growerId injected by the API service). */
export interface CreateExpenseRequest {
  growerId: number;
  plotId: number;
  type: ExpenseType;
  category: ExpenseCategory;
  linkedActionCode?: string;
  amount: number;
  currency?: string;
  expenseDate: string;
  paymentStatus?: PaymentStatus;
  note?: string;
  status?: ExpenseStatus;
}

const TYPES: ExpenseType[] = ['CLIMATE_MITIGATION', 'PEST_INTERVENTION'];
const CATEGORIES: ExpenseCategory[] = ['INPUTS', 'LABOR', 'EQUIPMENT', 'SPECIALIST'];
const PAYMENT_STATUSES: PaymentStatus[] = ['PAID', 'PENDING'];
const STATUSES: ExpenseStatus[] = ['REGISTERED', 'ALERT_CONFIRMED'];

function normalize<T extends string>(value: string | null, known: T[], fallback: T): T {
  const upper = (value ?? '').toUpperCase() as T;
  return known.includes(upper) ? upper : fallback;
}

export class ExpenseAssembler {
  static toEntityFromResource(resource: ExpenseResource): Expense {
    return new Expense({
      id: resource.id ?? null,
      growerId: resource.growerId ?? null,
      plotId: resource.plotId ?? null,
      type: normalize(resource.type, TYPES, 'CLIMATE_MITIGATION'),
      category: normalize(resource.category, CATEGORIES, 'INPUTS'),
      linkedActionCode: resource.linkedActionCode ?? '',
      amount: resource.amount ?? 0,
      currency: resource.currency ?? 'PEN',
      expenseDate: resource.expenseDate ?? null,
      paymentStatus: normalize(resource.paymentStatus, PAYMENT_STATUSES, 'PAID'),
      note: resource.note ?? '',
      status: normalize(resource.status, STATUSES, 'REGISTERED'),
      createdAt: resource.createdAt ?? null,
      updatedAt: resource.updatedAt ?? null,
    });
  }

  static toEntitiesFromResources(resources: ExpenseResource[]): Expense[] {
    return resources.map((resource) => ExpenseAssembler.toEntityFromResource(resource));
  }
}
