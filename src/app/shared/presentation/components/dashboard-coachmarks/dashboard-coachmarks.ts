import {
  AfterViewInit,
  Component,
  HostListener,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { OnboardingStepId, OnboardingStore } from '../../../application/onboarding.store';
import { ActiveSessionService } from '../../../infrastructure/active-session.service';

interface CoachmarkStep {
  target: string;
  titleKey: string;
  descriptionKey: string;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPosition {
  top: number;
  left: number;
}

@Component({
  selector: 'app-dashboard-coachmarks',
  standalone: true,
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './dashboard-coachmarks.html',
  styleUrl: './dashboard-coachmarks.css',
  host: { '[class.is-specialist]': 'isSpecialist()' },
})
export class DashboardCoachmarks implements AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly session = inject(ActiveSessionService);
  protected readonly onboardingStore = inject(OnboardingStore);

  protected readonly isSpecialist = this.session.isSpecialist;

  private readonly viewReady = signal<boolean>(false);
  private measureTimer: number | null = null;

  private readonly producerSteps: CoachmarkStep[] = [
    {
      target: 'overall-health',
      titleKey: 'dashboardCoachmarks.steps.overall.title',
      descriptionKey: 'dashboardCoachmarks.steps.overall.description',
    },
    {
      target: 'ndvi-status',
      titleKey: 'dashboardCoachmarks.steps.ndvi.title',
      descriptionKey: 'dashboardCoachmarks.steps.ndvi.description',
    },
    {
      target: 'chill-accumulation',
      titleKey: 'dashboardCoachmarks.steps.chill.title',
      descriptionKey: 'dashboardCoachmarks.steps.chill.description',
    },
    {
      target: 'yield-forecast',
      titleKey: 'dashboardCoachmarks.steps.yield.title',
      descriptionKey: 'dashboardCoachmarks.steps.yield.description',
    },
    {
      target: 'plot-overview',
      titleKey: 'dashboardCoachmarks.steps.plotOverview.title',
      descriptionKey: 'dashboardCoachmarks.steps.plotOverview.description',
    },
  ];

  private readonly specialistSteps: CoachmarkStep[] = [
    {
      target: 'sp-resolved',
      titleKey: 'dashboardCoachmarks.steps.spResolved.title',
      descriptionKey: 'dashboardCoachmarks.steps.spResolved.description',
    },
    {
      target: 'sp-acceptance',
      titleKey: 'dashboardCoachmarks.steps.spAcceptance.title',
      descriptionKey: 'dashboardCoachmarks.steps.spAcceptance.description',
    },
    {
      target: 'sp-phyto',
      titleKey: 'dashboardCoachmarks.steps.spPhyto.title',
      descriptionKey: 'dashboardCoachmarks.steps.spPhyto.description',
    },
    {
      target: 'sp-zonal',
      titleKey: 'dashboardCoachmarks.steps.spZonal.title',
      descriptionKey: 'dashboardCoachmarks.steps.spZonal.description',
    },
    {
      target: 'sp-incoming',
      titleKey: 'dashboardCoachmarks.steps.spIncoming.title',
      descriptionKey: 'dashboardCoachmarks.steps.spIncoming.description',
    },
  ];

  /** The active step set follows the signed-in role. */
  protected get steps(): CoachmarkStep[] {
    return this.isSpecialist() ? this.specialistSteps : this.producerSteps;
  }

  /** The onboarding step this tour completes / requires, by role. */
  private get dashboardStepId(): OnboardingStepId {
    return this.isSpecialist() ? 'sp-dashboard' : 'dashboard';
  }
  private get prerequisiteStepId(): OnboardingStepId {
    return this.isSpecialist() ? 'profile' : 'plot';
  }

  protected readonly currentIndex = signal<number>(0);
  protected readonly highlightRect = signal<HighlightRect | null>(null);
  protected readonly tooltipPosition = signal<TooltipPosition>({ top: 120, left: 280 });

  protected readonly active = computed<boolean>(
    () =>
      this.viewReady() &&
      this.onboardingStore.isCompleted(this.prerequisiteStepId) &&
      !this.onboardingStore.isCompleted(this.dashboardStepId),
  );

  protected readonly currentStep = computed<CoachmarkStep>(
    () => this.steps[this.currentIndex()],
  );

  protected readonly isLastStep = computed<boolean>(
    () => this.currentIndex() === this.steps.length - 1,
  );

  protected readonly progressLabel = computed<string>(
    () => `${this.currentIndex() + 1} / ${this.steps.length}`,
  );

  constructor() {
    effect(() => {
      if (this.active()) {
        this.queueMeasure(true);
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady.set(true);
  }

  ngOnDestroy(): void {
    if (this.measureTimer !== null) {
      window.clearTimeout(this.measureTimer);
    }
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  protected onViewportChange(): void {
    if (this.active()) {
      this.queueMeasure(false);
    }
  }

  protected next(): void {
    if (this.isLastStep()) {
      this.completeDashboardTour();
      return;
    }

    this.currentIndex.update((index) => index + 1);
    this.queueMeasure(true);
  }

  protected skip(): void {
    this.completeDashboardTour();
  }

  protected previous(): void {
    if (this.currentIndex() === 0) {
      return;
    }

    this.currentIndex.update((index) => index - 1);
    this.queueMeasure(true);
  }

  private completeDashboardTour(): void {
    this.onboardingStore.complete(this.dashboardStepId);
  }

  private queueMeasure(shouldScroll: boolean): void {
    if (this.measureTimer !== null) {
      window.clearTimeout(this.measureTimer);
    }

    this.measureTimer = window.setTimeout(() => {
      this.measureTarget(shouldScroll);
      this.measureTimer = null;
    }, 80);
  }

  private measureTarget(shouldScroll: boolean): void {
    const target = this.document.querySelector<HTMLElement>(
      `[data-onboarding-target="${this.currentStep().target}"]`,
    );

    if (!target) {
      this.highlightRect.set(null);
      return;
    }

    if (shouldScroll) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });

      this.queueMeasure(false);
      return;
    }

    const padding = 8;
    const rect = target.getBoundingClientRect();
    const highlight: HighlightRect = {
      top: Math.max(12, rect.top - padding),
      left: Math.max(12, rect.left - padding),
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    };

    this.highlightRect.set(highlight);
    this.tooltipPosition.set(this.getTooltipPosition(highlight));
  }

  private getTooltipPosition(rect: HighlightRect): TooltipPosition {
    const tooltipWidth = 332;
    const gap = 18;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const belowTop = rect.top + rect.height + gap;
    const aboveTop = rect.top - 220 - gap;
    const top = belowTop + 220 < viewportHeight ? belowTop : Math.max(18, aboveTop);
    const centeredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;

    return {
      top,
      left: Math.min(Math.max(18, centeredLeft), viewportWidth - tooltipWidth - 18),
    };
  }
}
