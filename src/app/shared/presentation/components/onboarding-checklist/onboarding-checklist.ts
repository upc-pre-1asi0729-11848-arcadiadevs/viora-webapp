import { Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, filter } from 'rxjs';

import { AgronomicStore } from '../../../../agronomic/application/agronomic.store';
import { ProfileStore } from '../../../../profile/application/profile.store';
import { ActiveSessionService } from '../../../infrastructure/active-session.service';
import {
  OnboardingStepId,
  OnboardingStore,
} from '../../../application/onboarding.store';

interface OnboardingStep {
  id: OnboardingStepId;
  route: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
  completed: boolean;
  unlocked: boolean;
}

@Component({
  selector: 'app-onboarding-checklist',
  standalone: true,
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './onboarding-checklist.html',
  styleUrl: './onboarding-checklist.css',
  host: { '[class.is-specialist]': 'isSpecialist()' },
})
export class OnboardingChecklist implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly agronomicStore = inject(AgronomicStore);
  private readonly profileStore = inject(ProfileStore);
  private readonly session = inject(ActiveSessionService);
  protected readonly onboardingStore = inject(OnboardingStore);

  /** The guide is role-aware: producers set up plots, specialists their profile. */
  protected readonly isSpecialist = this.session.isSpecialist;

  private readonly currentUrl = signal<string>(this.router.url);
  private readonly routerSubscription: Subscription;

  protected readonly totalSteps = 3;

  protected readonly hasRegisteredPlot = computed<boolean>(() => {
    const overviewCount = this.agronomicStore.myPlotsOverview()?.registeredPlotCount ?? 0;

    return (
      Boolean(this.agronomicStore.lastPlotRegistration()) ||
      this.agronomicStore.plotsCount() > 0 ||
      overviewCount > 0
    );
  });

  /** A specialist's marketplace profile counts as set up once it has a location
   *  (lat/lng) and at least one service tag — what makes them discoverable. */
  protected readonly hasSpecialistProfile = computed<boolean>(() => {
    const profile = this.profileStore.profile();
    return (
      (profile.serviceTags?.trim().length ?? 0) > 0 &&
      profile.latitude != null &&
      profile.longitude != null
    );
  });

  protected readonly steps = computed<OnboardingStep[]>(() =>
    this.isSpecialist() ? this.specialistSteps() : this.producerSteps(),
  );

  private producerSteps(): OnboardingStep[] {
    const plotCompleted = this.hasRegisteredPlot() || this.onboardingStore.isCompleted('plot');
    const dashboardCompleted = this.onboardingStore.isCompleted('dashboard');
    const expertCompleted = this.onboardingStore.isCompleted('expert');

    return [
      {
        id: 'plot',
        route: '/agronomic/plots/new',
        icon: 'add_location_alt',
        titleKey: 'onboardingChecklist.steps.plot.title',
        descriptionKey: 'onboardingChecklist.steps.plot.description',
        completed: plotCompleted,
        unlocked: true,
      },
      {
        id: 'dashboard',
        route: '/dashboard',
        icon: 'dashboard',
        titleKey: 'onboardingChecklist.steps.dashboard.title',
        descriptionKey: 'onboardingChecklist.steps.dashboard.description',
        completed: dashboardCompleted,
        unlocked: plotCompleted,
      },
      {
        id: 'expert',
        route: '/assistance/expert-assistance',
        icon: 'support_agent',
        titleKey: 'onboardingChecklist.steps.expert.title',
        descriptionKey: 'onboardingChecklist.steps.expert.description',
        completed: expertCompleted,
        unlocked: plotCompleted && dashboardCompleted,
      },
    ];
  }

  private specialistSteps(): OnboardingStep[] {
    const profileCompleted =
      this.hasSpecialistProfile() || this.onboardingStore.isCompleted('profile');
    const dashboardCompleted = this.onboardingStore.isCompleted('sp-dashboard');
    const marketplaceCompleted = this.onboardingStore.isCompleted('marketplace');

    return [
      {
        id: 'profile',
        route: '/settings',
        icon: 'badge',
        titleKey: 'onboardingChecklist.steps.profile.title',
        descriptionKey: 'onboardingChecklist.steps.profile.description',
        completed: profileCompleted,
        unlocked: true,
      },
      {
        id: 'sp-dashboard',
        route: '/dashboard',
        icon: 'dashboard',
        titleKey: 'onboardingChecklist.steps.spDashboard.title',
        descriptionKey: 'onboardingChecklist.steps.spDashboard.description',
        completed: dashboardCompleted,
        unlocked: profileCompleted,
      },
      {
        id: 'marketplace',
        route: '/specialist/marketplace',
        icon: 'storefront',
        titleKey: 'onboardingChecklist.steps.marketplace.title',
        descriptionKey: 'onboardingChecklist.steps.marketplace.description',
        completed: marketplaceCompleted,
        unlocked: profileCompleted && dashboardCompleted,
      },
    ];
  }

  protected readonly completedCount = computed<number>(
    () => this.steps().filter((step) => step.completed).length,
  );

  protected readonly progressPercent = computed<number>(
    () => (this.completedCount() / this.totalSteps) * 100,
  );

  protected readonly allDone = computed<boolean>(() => this.completedCount() === this.totalSteps);

  protected readonly visible = computed<boolean>(
    () => !this.onboardingStore.minimized() && !this.onboardingStore.dismissed(),
  );

  protected readonly showLauncher = computed<boolean>(
    () =>
      (this.onboardingStore.minimized() || this.onboardingStore.dismissed()) &&
      !this.allDone(),
  );

  protected readonly nextStep = computed<OnboardingStep | null>(
    () => this.steps().find((step) => !step.completed) ?? null,
  );

  protected readonly primaryActionKey = computed<string>(() =>
    this.allDone() ? 'onboardingChecklist.actions.finish' : 'onboardingChecklist.actions.continue',
  );

  constructor() {
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));

    effect(() => {
      const url = this.normalizedUrl();

      if (this.isSpecialist()) {
        if (this.hasSpecialistProfile()) {
          this.onboardingStore.complete('profile');
        }
        if (
          this.onboardingStore.isCompleted('profile') &&
          this.onboardingStore.isCompleted('sp-dashboard') &&
          url.startsWith('/specialist/marketplace')
        ) {
          this.onboardingStore.complete('marketplace');
        }
        return;
      }

      const hasPlot = this.hasRegisteredPlot();
      if (hasPlot) {
        this.onboardingStore.complete('plot');
      }
      if (
        hasPlot &&
        this.onboardingStore.isCompleted('dashboard') &&
        url.startsWith('/assistance/expert-assistance')
      ) {
        this.onboardingStore.complete('expert');
      }
    });
  }

  ngOnInit(): void {
    if (this.isSpecialist()) {
      // Need the profile to detect step 1 completion (location + service tags).
      if (this.profileStore.profile().id == null && !this.profileStore.loading()) {
        this.profileStore.load();
      }
      return;
    }

    if (!this.agronomicStore.myPlotsOverview() && !this.agronomicStore.loading().overview) {
      this.agronomicStore.fetchMyPlotsOverview();
    }
  }

  ngOnDestroy(): void {
    this.routerSubscription.unsubscribe();
  }

  protected openNextStep(): void {
    if (this.allDone()) {
      this.onboardingStore.dismiss();
      return;
    }

    const step = this.nextStep();

    if (step) {
      this.openStep(step);
    }
  }

  protected openStep(step: OnboardingStep): void {
    if (!step.unlocked) {
      return;
    }

    this.router.navigateByUrl(step.route);
  }

  protected minimize(): void {
    this.onboardingStore.setMinimized(true);
  }

  protected reopen(): void {
    this.onboardingStore.reopen();
  }

  protected stepIndex(stepId: OnboardingStepId): number {
    return this.steps().findIndex((step) => step.id === stepId) + 1;
  }

  private normalizedUrl(): string {
    return this.currentUrl().split('?')[0].split('#')[0];
  }
}
