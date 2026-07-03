import { Plan, PlanInterval } from '../domain/model/plan.entity';
import { Subscription, SubscriptionStatus } from '../domain/model/subscription.entity';
import { Invoice, InvoiceStatus } from '../domain/model/invoice.entity';
import { PaymentMethod } from '../domain/model/payment-method.entity';

export interface PlanResource {
  id: number | null;
  code: string | null;
  name: string | null;
  priceCents: number | null;
  currency: string | null;
  interval: string | null;
  tagline: string | null;
  features: string[] | null;
  plotLimit: number | null;
  iotLimit: number | null;
}

export interface SubscriptionResource {
  userId: number | null;
  planCode: string | null;
  planName: string | null;
  interval: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
  priceCents: number | null;
  currency: string | null;
}

export interface InvoiceResource {
  id: number | null;
  issuedAt: string | null;
  description: string | null;
  amountCents: number | null;
  currency: string | null;
  status: string | null;
}

export interface PaymentMethodResource {
  id: number | null;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean | null;
}

export interface CheckoutResource {
  preferenceId: string | null;
  checkoutUrl: string | null;
}

export interface CreateCheckoutRequest {
  planCode: string;
  interval: PlanInterval;
}

function toInterval(raw: string | null): PlanInterval {
  return raw?.toUpperCase() === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';
}

export class PlanAssembler {
  static toEntity(resource: PlanResource): Plan {
    return new Plan({
      id: resource.id ?? null,
      code: resource.code ?? '',
      name: resource.name ?? '',
      priceCents: resource.priceCents ?? 0,
      currency: resource.currency ?? 'USD',
      interval: toInterval(resource.interval),
      tagline: resource.tagline ?? '',
      features: resource.features ?? [],
      plotLimit: resource.plotLimit ?? 0,
      iotLimit: resource.iotLimit ?? 0,
    });
  }

  static toEntities(resources: PlanResource[]): Plan[] {
    return resources.map((r) => PlanAssembler.toEntity(r));
  }
}

export class SubscriptionAssembler {
  static toEntity(resource: SubscriptionResource): Subscription {
    return new Subscription({
      userId: resource.userId ?? null,
      planCode: resource.planCode ?? '',
      planName: resource.planName ?? '',
      interval: toInterval(resource.interval),
      status: (resource.status?.toUpperCase() as SubscriptionStatus) ?? 'ACTIVE',
      currentPeriodEnd: resource.currentPeriodEnd ?? null,
      priceCents: resource.priceCents ?? 0,
      currency: resource.currency ?? 'USD',
    });
  }
}

export class InvoiceAssembler {
  static toEntity(resource: InvoiceResource): Invoice {
    return new Invoice({
      id: resource.id ?? null,
      issuedAt: resource.issuedAt ?? null,
      description: resource.description ?? '',
      amountCents: resource.amountCents ?? 0,
      currency: resource.currency ?? 'USD',
      status: (resource.status?.toUpperCase() as InvoiceStatus) ?? 'PENDING',
    });
  }

  static toEntities(resources: InvoiceResource[]): Invoice[] {
    return resources.map((r) => InvoiceAssembler.toEntity(r));
  }
}

export class PaymentMethodAssembler {
  static toEntity(resource: PaymentMethodResource): PaymentMethod {
    return new PaymentMethod({
      id: resource.id ?? null,
      brand: resource.brand ?? '',
      last4: resource.last4 ?? '',
      expMonth: resource.expMonth ?? 0,
      expYear: resource.expYear ?? 0,
      isDefault: resource.isDefault ?? false,
    });
  }

  static toEntities(resources: PaymentMethodResource[]): PaymentMethod[] {
    return resources.map((r) => PaymentMethodAssembler.toEntity(r));
  }
}
