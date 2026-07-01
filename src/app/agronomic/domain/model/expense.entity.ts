/**
 * @file expense.entity.ts
 * @description Domain entity for an operational expense the producer registers
 * against a plot (Agronomic bounded context).
 */
export type ExpenseType = 'CLIMATE_MITIGATION' | 'PEST_INTERVENTION';
export type ExpenseCategory = 'INPUTS' | 'LABOR' | 'EQUIPMENT' | 'SPECIALIST';
export type PaymentStatus = 'PAID' | 'PENDING';
export type ExpenseStatus = 'REGISTERED' | 'ALERT_CONFIRMED';

export interface ExpenseProps {
  id?: number | string | null;
  growerId?: number | null;
  plotId?: number | null;
  type?: ExpenseType;
  category?: ExpenseCategory;
  linkedActionCode?: string;
  amount?: number;
  currency?: string;
  expenseDate?: string | null;
  paymentStatus?: PaymentStatus;
  note?: string;
  status?: ExpenseStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** Short pill label (table "Type" column). */
const TYPE_TAG: Record<ExpenseType, string> = {
  CLIMATE_MITIGATION: 'Climate',
  PEST_INTERVENTION: 'Pest',
};

/** Full type label (KPI card + form). */
const TYPE_LABEL: Record<ExpenseType, string> = {
  CLIMATE_MITIGATION: 'Climate mitigation',
  PEST_INTERVENTION: 'Pest intervention',
};

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  INPUTS: 'Inputs',
  LABOR: 'Labor',
  EQUIPMENT: 'Equipment',
  SPECIALIST: 'Specialist',
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PAID: 'Paid',
  PENDING: 'Pending',
};

const STATUS_LABEL: Record<ExpenseStatus, string> = {
  REGISTERED: 'Registered',
  ALERT_CONFIRMED: 'Alert confirmed',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  PEN: 'S/',
  USD: '$',
  EUR: '€',
};

export class Expense {
  readonly id: number | string | null;
  readonly growerId: number | null;
  readonly plotId: number | null;
  readonly type: ExpenseType;
  readonly category: ExpenseCategory;
  readonly linkedActionCode: string;
  readonly amount: number;
  readonly currency: string;
  readonly expenseDate: string | null;
  readonly paymentStatus: PaymentStatus;
  readonly note: string;
  readonly status: ExpenseStatus;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;

  constructor({
    id = null,
    growerId = null,
    plotId = null,
    type = 'CLIMATE_MITIGATION',
    category = 'INPUTS',
    linkedActionCode = '',
    amount = 0,
    currency = 'PEN',
    expenseDate = null,
    paymentStatus = 'PAID',
    note = '',
    status = 'REGISTERED',
    createdAt = null,
    updatedAt = null,
  }: ExpenseProps = {}) {
    this.id = id;
    this.growerId = growerId;
    this.plotId = plotId;
    this.type = type;
    this.category = category;
    this.linkedActionCode = linkedActionCode;
    this.amount = amount;
    this.currency = currency;
    this.expenseDate = expenseDate;
    this.paymentStatus = paymentStatus;
    this.note = note;
    this.status = status;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  get typeTag(): string {
    return TYPE_TAG[this.type] ?? this.type;
  }

  get typeLabel(): string {
    return TYPE_LABEL[this.type] ?? this.type;
  }

  get categoryLabel(): string {
    return CATEGORY_LABEL[this.category] ?? this.category;
  }

  get paymentStatusLabel(): string {
    return PAYMENT_LABEL[this.paymentStatus] ?? this.paymentStatus;
  }

  get statusLabel(): string {
    return STATUS_LABEL[this.status] ?? this.status;
  }

  /** CSS modifier for the type pill. */
  get typeClass(): string {
    return this.type === 'PEST_INTERVENTION' ? 'type-pest' : 'type-climate';
  }

  /** CSS modifier for the status pill. */
  get statusClass(): string {
    return this.status === 'ALERT_CONFIRMED' ? 'status-alert' : 'status-registered';
  }

  get amountLabel(): string {
    return Expense.formatMoney(this.amount, this.currency);
  }

  get dateLabel(): string {
    return Expense.formatDate(this.expenseDate);
  }

  static formatMoney(amount: number, currency = 'PEN'): string {
    const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
    return `${symbol} ${(amount ?? 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  static formatDate(raw: string | null): string {
    if (!raw) {
      return '—';
    }
    const timestamp = Date.parse(raw);
    if (Number.isNaN(timestamp)) {
      return '—';
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(new Date(timestamp));
  }
}
