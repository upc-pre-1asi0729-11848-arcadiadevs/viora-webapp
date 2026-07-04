import { Injectable, computed, inject, signal } from '@angular/core';

import { ActiveSessionService } from '../infrastructure/active-session.service';

export type OnboardingStepId = 'plot' | 'dashboard' | 'expert';

interface OnboardingState {
  minimized: boolean;
  dismissed: boolean;
  completed: Record<OnboardingStepId, boolean>;
}

const DEFAULT_STATE: OnboardingState = {
  minimized: false,
  dismissed: false,
  completed: {
    plot: false,
    dashboard: false,
    expert: false,
  },
};

@Injectable({
  providedIn: 'root',
})
export class OnboardingStore {
  private readonly session = inject(ActiveSessionService);
  private readonly stateSignal = signal<OnboardingState>(this.restore());

  readonly state = this.stateSignal.asReadonly();
  readonly minimized = computed<boolean>(() => this.stateSignal().minimized);
  readonly dismissed = computed<boolean>(() => this.stateSignal().dismissed);

  readonly completedCount = computed<number>(
    () => Object.values(this.stateSignal().completed).filter(Boolean).length,
  );

  isCompleted(stepId: OnboardingStepId): boolean {
    return this.stateSignal().completed[stepId];
  }

  complete(stepId: OnboardingStepId): void {
    if (this.stateSignal().completed[stepId]) {
      return;
    }

    this.patch({
      completed: {
        ...this.stateSignal().completed,
        [stepId]: true,
      },
    });
  }

  setMinimized(minimized: boolean): void {
    this.patch({ minimized, dismissed: false });
  }

  dismiss(): void {
    this.patch({ dismissed: true, minimized: true });
  }

  reopen(): void {
    this.patch({ dismissed: false, minimized: false });
  }

  private patch(changes: Partial<OnboardingState>): void {
    const next: OnboardingState = {
      ...this.stateSignal(),
      ...changes,
    };

    this.stateSignal.set(next);
    this.persist(next);
  }

  private storageKey(): string {
    const userId = this.session.userId;

    return `viora.onboarding.${userId ?? 'anonymous'}`;
  }

  private restore(): OnboardingState {
    try {
      const raw = localStorage.getItem(this.storageKey());

      if (!raw) {
        return DEFAULT_STATE;
      }

      const parsed = JSON.parse(raw) as Partial<OnboardingState>;

      return {
        minimized: parsed.minimized ?? DEFAULT_STATE.minimized,
        dismissed: parsed.dismissed ?? DEFAULT_STATE.dismissed,
        completed: {
          ...DEFAULT_STATE.completed,
          ...(parsed.completed ?? {}),
        },
      };
    } catch {
      return DEFAULT_STATE;
    }
  }

  private persist(state: OnboardingState): void {
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(state));
    } catch {
      // Private browsing or storage limits should not break onboarding.
    }
  }
}
