import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageSwitcher } from '../../../../shared/presentation/components/language-switcher/language-switcher';

import { AgronomicStore } from '../../../application/agronomic.store';
import { PlotCoordinate } from '../../../domain/model/plot.entity';
import { PlotRegistration } from '../../../domain/model/plot-registration.entity';
import {
  BoundaryState,
  PlotBoundaryMap,
} from '../../components/plot-boundary-map/plot-boundary-map';

type StepState = 'done' | 'active' | 'pending';

interface WizardStep {
  id: string;
  labelKey: string;
  state: StepState;
  index: number;
}

@Component({
  selector: 'app-plot-create',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslatePipe,
    LanguageSwitcher,
    PlotBoundaryMap,
  ],
  templateUrl: './plot-create.html',
  styleUrl: './plot-create.css',
})
export class PlotCreate {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly store = inject(AgronomicStore);

  private readonly boundaryMap = viewChild(PlotBoundaryMap);

  protected readonly form = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
    cropType: ['', [Validators.maxLength(60)]],
    campaign: ['', [Validators.maxLength(60)]],
    location: ['', [Validators.maxLength(120)]],
    notes: ['', [Validators.maxLength(500)]],
  });

  /** Live signal mirror of the reactive form validity. */
  private readonly formStatus = signal<boolean>(this.form.valid);

  protected readonly boundaryPoints = signal<PlotCoordinate[]>([]);
  protected readonly boundaryClosed = signal<boolean>(false);
  protected readonly boundaryArea = signal<number>(0);
  protected readonly addMode = signal<boolean>(true);

  /** Whether a registration attempt was made while the boundary was still open. */
  protected readonly registerAttempted = signal<boolean>(false);

  /** Registration result; when set, the wizard shows the confirmation step. */
  protected readonly registration = signal<PlotRegistration | null>(null);

  constructor() {
    this.form.statusChanges.subscribe(() => this.formStatus.set(this.form.valid));
  }

  protected readonly pointCount = computed<number>(() => this.boundaryPoints().length);

  protected readonly basicInfoValid = computed<boolean>(() => this.formStatus());

  protected readonly canRegister = computed<boolean>(
    () => this.basicInfoValid() && this.boundaryClosed() && !this.store.loading().saving,
  );

  protected readonly showBoundaryError = computed<boolean>(
    () => !this.boundaryClosed() && this.pointCount() > 0,
  );

  protected readonly estimatedAreaLabel = computed<string>(() =>
    this.boundaryClosed() ? `${this.boundaryArea().toFixed(1)} ha` : '—',
  );

  protected readonly registerIcon = computed<string>(() => {
    if (this.store.loading().saving) {
      return 'hourglass_empty';
    }

    return this.boundaryClosed() ? 'check' : 'lock';
  });

  protected readonly registerLabelKey = computed<string>(() => {
    if (this.store.loading().saving) {
      return 'plotCreate.boundary.registering';
    }

    return this.boundaryClosed()
      ? 'plotCreate.boundary.register'
      : 'plotCreate.boundary.registerLocked';
  });

  protected readonly steps = computed<WizardStep[]>(() => {
    const registered = this.registration() !== null;
    const basicDone = this.basicInfoValid();
    const boundaryDone = this.boundaryClosed();

    const basicState: StepState = registered || basicDone ? 'done' : 'active';
    const boundaryState: StepState = registered || boundaryDone
      ? 'done'
      : basicDone
        ? 'active'
        : 'pending';
    const confirmState: StepState = registered ? 'done' : 'pending';

    return [
      { id: 'basic', labelKey: 'plotCreate.steps.basicInfo', state: basicState, index: 1 },
      { id: 'boundary', labelKey: 'plotCreate.steps.boundary', state: boundaryState, index: 2 },
      { id: 'confirm', labelKey: 'plotCreate.steps.confirm', state: confirmState, index: 3 },
    ];
  });

  // ----- Boundary toolbar actions -----

  protected onBoundaryChange(state: BoundaryState): void {
    this.boundaryPoints.set(state.points);
    this.boundaryClosed.set(state.closed);
    this.boundaryArea.set(state.areaHectares);
    this.addMode.set(state.addMode);

    if (state.closed) {
      this.registerAttempted.set(false);
    }
  }

  protected toggleAddPoint(): void {
    this.boundaryMap()?.toggleAddMode();
  }

  protected undoPoint(): void {
    this.boundaryMap()?.undo();
  }

  protected clearBoundary(): void {
    this.boundaryMap()?.clear();
  }

  protected closePolygon(): void {
    this.boundaryMap()?.close();
  }

  protected continueDrawing(): void {
    this.registerAttempted.set(false);

    if (!this.addMode()) {
      this.boundaryMap()?.toggleAddMode();
    }
  }

  // ----- Registration -----

  protected registerPlot(): void {
    if (!this.basicInfoValid()) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.boundaryClosed()) {
      this.registerAttempted.set(true);
      return;
    }

    const raw = this.form.getRawValue();
    const points = this.boundaryPoints();
    const polygonCoordinates: PlotCoordinate[] = [...points, points[0]];

    this.store.createPlot(
      {
        name: (raw.name ?? '').trim(),
        polygonCoordinates,
        cropType: this.optional(raw.cropType),
        campaign: this.optional(raw.campaign),
        location: this.optional(raw.location),
        notes: this.optional(raw.notes),
      },
      (registration) => this.registration.set(registration),
    );
  }

  protected resetWizard(): void {
    this.form.reset({ name: '', cropType: '', campaign: '', location: '', notes: '' });
    this.registerAttempted.set(false);
    this.registration.set(null);
    this.boundaryMap()?.clear();
  }

  protected viewPlotDetail(): void {
    const id = this.registration()?.id;

    if (id !== null && id !== undefined) {
      this.router.navigate(['/agronomic/plots', id]);
      return;
    }

    this.router.navigate(['/agronomic/plots']);
  }

  protected linkLabelKey(status: PlotRegistration['climateMonitoring']): string {
    switch (status) {
      case 'active':
        return 'plotCreate.linkStatus.active';
      case 'initializing':
        return 'plotCreate.linkStatus.initializing';
      case 'not-linked':
        return 'plotCreate.linkStatus.notLinked';
      default:
        return 'plotCreate.linkStatus.pending';
    }
  }

  protected linkClass(status: PlotRegistration['climateMonitoring']): string {
    switch (status) {
      case 'active':
        return 'tag-active';
      case 'not-linked':
        return 'tag-dark';
      default:
        return 'tag-init';
    }
  }

  protected hasFieldError(fieldName: string): boolean {
    const field = this.form.get(fieldName);

    return Boolean(field?.invalid && (field.dirty || field.touched));
  }

  private optional(value: string | null | undefined): string | undefined {
    const trimmed = (value ?? '').trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }
}
