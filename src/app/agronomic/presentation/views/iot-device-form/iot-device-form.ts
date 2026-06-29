import { Component, OnInit, effect, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';

import {
  DashboardBreadcrumbItem,
  DashboardHeader
} from '../../../../shared/presentation/components/dashboard-header/dashboard-header';

import { AgronomicStore } from '../../../application/agronomic.store';
import {
  IotDevice,
  IotDeviceStatus,
  IotDeviceType
} from '../../../domain/model/iot-device.entity';
import {
  ACTIVATION_CODE_PATTERN,
  deviceTypeFromActivationCode
} from '../../../domain/model/iot-activation-code';

interface StatusOption {
  label: string;
  value: IotDeviceStatus;
}

@Component({
  selector: 'app-iot-device-form',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    DashboardHeader,
    TranslatePipe
  ],
  templateUrl: './iot-device-form.html',
  styleUrl: './iot-device-form.css'
})
export class IotDeviceForm implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly agronomicStore = inject(AgronomicStore);

  private formHydrated = false;

  protected readonly statusOptions: StatusOption[] = [
    { label: 'Active', value: 'active' },
    { label: 'Warning', value: 'warning' },
    { label: 'Critical', value: 'critical' },
    { label: 'Inactive', value: 'inactive' }
  ];

  protected readonly form = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    plotId: [null as number | string | null, [Validators.required]],
    activationCode: ['', [Validators.required, Validators.pattern(ACTIVATION_CODE_PATTERN)]],
    status: ['active' as IotDeviceStatus, [Validators.required]]
  });

  protected readonly isEdit = Boolean(this.route.snapshot.paramMap.get('id'));

  /** Sensor kind detected live from the activation code, for the form preview. */
  protected get detectedType(): IotDeviceType {
    return deviceTypeFromActivationCode(this.form.controls.activationCode.value);
  }

  protected readonly subtitle = this.isEdit
    ? 'Update device telemetry configuration and monitoring status.'
    : 'Register an external IoT device connected to a monitored plot.';

  protected readonly breadcrumbs: DashboardBreadcrumbItem[] = [
    {
      label: 'IoT Devices',
      labelKey: 'sidebar.iotDevices',
      route: '/agronomic/iot-devices'
    },
    {
      label: this.isEdit ? 'Edit device' : 'New device',
      labelKey: this.isEdit ? 'iotForm.editDevice' : 'iotForm.newDevice',
      disabled: true
    }
  ];

  constructor() {
    // A device is already claimed when editing: the activation code is fixed and
    // the plot cannot be reassigned, so both are disabled (excluded from validity).
    if (this.isEdit) {
      this.form.controls.activationCode.disable();
      this.form.controls.plotId.disable();
    }

    effect(() => {
      const selectedDevice = this.agronomicStore.selectedDevice();

      if (!this.isEdit || !selectedDevice || this.formHydrated) {
        return;
      }

      this.form.patchValue({
        name: selectedDevice.name,
        plotId: selectedDevice.plotId,
        status: selectedDevice.status
      });

      this.formHydrated = true;
    });
  }

  ngOnInit(): void {
    this.loadReferenceData();
  }

  protected loadReferenceData(): void {
    if (!this.agronomicStore.plotsLoaded()) {
      this.agronomicStore.fetchPlots();
    }

    if (!this.agronomicStore.devicesLoaded()) {
      this.agronomicStore.fetchDevices();
    }

    if (this.isEdit) {
      const id = this.route.snapshot.paramMap.get('id');

      if (id) {
        this.agronomicStore.fetchDeviceById(id);
      }
    }
  }

  protected saveDevice(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();
    const id = this.isEdit ? this.route.snapshot.paramMap.get('id') : null;

    const device = new IotDevice({
      id,
      name: rawValue.name ?? '',
      plotId: rawValue.plotId,
      status: rawValue.status ?? 'active',
      activationCode: rawValue.activationCode ?? ''
    });

    if (this.isEdit) {
      this.agronomicStore.updateDevice(device, () => this.navigateBack());
      return;
    }

    this.agronomicStore.addDevice(device, () => this.navigateBack());
  }

  protected navigateBack(): void {
    this.router.navigate(['/agronomic/iot-devices']);
  }

  protected hasFieldError(fieldName: string): boolean {
    const field = this.form.get(fieldName);

    return Boolean(field?.invalid && (field.dirty || field.touched));
  }
}
