import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AgronomicStore } from '../../../../agronomic/application/agronomic.store';

interface QuickAction {
  labelKey: string;
  iconPath: string;
  route: string;
}

@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './quick-actions.html',
  styleUrl: './quick-actions.css',
})
export class QuickActions {
  private readonly store = inject(AgronomicStore);

  protected readonly queryParams = computed(() => {
    const selectedScope = this.store.selectedDashboardScope();

    return selectedScope === 'all' ? null : { plotId: selectedScope };
  });

  protected readonly actions: QuickAction[] = [
    {
      labelKey: 'quickActions.viewPlot',
      iconPath: '/assets/icons/dashboard/file-tray-stacked-outline.svg',
      route: '/agronomic/plots',
    },
    {
      labelKey: 'quickActions.reportSymptoms',
      iconPath: '/assets/icons/dashboard/bug-outline.svg',
      route: '/surveillance/pest-surveillance/report-symptoms',
    },
    {
      labelKey: 'quickActions.openNutrition',
      iconPath: '/assets/icons/dashboard/leaf-outline.svg',
      route: '/agronomic/dynamic-nutrition/plan',
    },
    {
      labelKey: 'quickActions.requestExpert',
      iconPath: '/assets/icons/dashboard/people-outline.svg',
      route: '/assistance/expert-assistance/request',
    },
  ];
}
