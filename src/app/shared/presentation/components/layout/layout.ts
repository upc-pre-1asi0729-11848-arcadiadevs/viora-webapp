import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { DashboardSidebar } from '../dashboard-sidebar/dashboard-sidebar';
import { OnboardingChecklist } from '../onboarding-checklist/onboarding-checklist';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [DashboardSidebar, OnboardingChecklist, RouterOutlet],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout {}
