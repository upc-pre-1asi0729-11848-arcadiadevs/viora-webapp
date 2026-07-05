import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ActiveSessionService } from '../../../infrastructure/active-session.service';
import { DashboardSidebar } from '../dashboard-sidebar/dashboard-sidebar';
import { OnboardingChecklist } from '../onboarding-checklist/onboarding-checklist';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [DashboardSidebar, OnboardingChecklist, RouterOutlet],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout {
  private readonly session = inject(ActiveSessionService);

  /**
   * The onboarding checklist is producer-only (register a plot, review the plot
   * dashboard, visit expert assistance), so it is hidden for specialists.
   */
  protected readonly isSpecialist = this.session.isSpecialist;
}
