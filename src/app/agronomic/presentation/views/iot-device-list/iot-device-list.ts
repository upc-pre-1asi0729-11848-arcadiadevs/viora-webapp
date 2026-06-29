import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { TranslatePipe } from '@ngx-translate/core';

import {
  DashboardBreadcrumbItem,
  DashboardHeader
} from '../../../../shared/presentation/components/dashboard-header/dashboard-header';

import { AgronomicStore } from '../../../application/agronomic.store';
import { IotDevice } from '../../../domain/model/iot-device.entity';

@Component({
  selector: 'app-iot-device-list',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatPaginatorModule,
    DashboardHeader,
    TranslatePipe
  ],
  templateUrl: './iot-device-list.html',
  styleUrl: './iot-device-list.css'
})
export class IotDeviceList implements OnInit {
  protected readonly agronomicStore = inject(AgronomicStore);

  protected readonly pageIndex = signal<number>(0);
  protected readonly pageSize = signal<number>(5);
  protected readonly breadcrumbs: DashboardBreadcrumbItem[] = [
    {
      label: 'IoT Devices',
      labelKey: 'sidebar.iotDevices',
      disabled: true
    }
  ];

  protected readonly paginatedDevices = computed<IotDevice[]>(() => {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();

    return this.agronomicStore.devices().slice(start, end);
  });

  ngOnInit(): void {
    this.agronomicStore.fetchDevices();

    if (!this.agronomicStore.plotsLoaded()) {
      this.agronomicStore.fetchPlots();
    }
  }

  protected onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  protected deleteDevice(device: IotDevice): void {
    if (device.id === null) {
      return;
    }

    const confirmed = window.confirm(`Delete ${device.name}?`);

    if (confirmed) {
      this.agronomicStore.deleteDevice(device);
    }
  }

  protected getPlotName(plotId: number | string | null): string {
    const plot = this.agronomicStore.plots()
      .find(item => String(item.id) === String(plotId));

    return plot?.name ?? 'Unknown plot';
  }

  protected getStatusClass(device: IotDevice): string {
    return `status-${device.status}`;
  }
}
