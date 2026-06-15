import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  private readonly route = inject(ActivatedRoute);

  protected readonly store = inject(AgronomicStore);

  private readonly boundaryMap = viewChild(PlotBoundaryMap);

  /** Plot id when the wizard is reused to EDIT an existing plot (else null). */
  protected readonly editPlotId = this.route.snapshot.paramMap.get('id');
  protected readonly isEditMode = this.editPlotId !== null;

  /** Existing polygon fed to the boundary map to preload it (edit mode). */
  protected readonly boundaryToLoad = signal<PlotCoordinate[] | null>(null);

  /** Guards the one-time form/boundary preload from the loaded plot. */
  private preloaded = false;

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

    if (this.isEditMode) {
      // Make sure the plot list is available, then preload the form + boundary
      // from it once (the descriptive fields ride along on the Plot entity).
      if (this.store.plots().length === 0) {
        this.store.fetchPlots();
      }

      effect(() => {
        if (this.preloaded) {
          return;
        }

        const plot = this.store
          .plots()
          .find((item) => String(item.id) === this.editPlotId);

        if (!plot) {
          return;
        }

        this.preloaded = true;
        this.form.patchValue({
          name: plot.name,
          cropType: plot.cropType,
          campaign: plot.campaign,
          location: plot.location,
          notes: plot.notes,
        });
        this.boundaryToLoad.set(plot.polygonCoordinates);
      });
    }
  }

  protected readonly pointCount = computed<number>(() => this.boundaryPoints().length);

  protected readonly basicInfoValid = computed<boolean>(() => this.formStatus());

  /**
   * AgroMonitoring rejects polygons smaller than 1 hectare, so a plot below that
   * area can never receive satellite/NDVI data. We block registration client-side.
   */
  protected readonly minAreaHectares = 1;

  /** Closed boundary whose area is below the AgroMonitoring 1 ha minimum. */
  protected readonly areaTooSmall = computed<boolean>(
    () => this.boundaryClosed() && this.boundaryArea() < this.minAreaHectares,
  );

  protected readonly canRegister = computed<boolean>(
    () =>
      this.basicInfoValid() &&
      this.boundaryClosed() &&
      !this.areaTooSmall() &&
      !this.store.loading().saving,
  );

  protected readonly showBoundaryError = computed<boolean>(
    () => !this.boundaryClosed() && this.pointCount() > 0,
  );

  protected readonly estimatedAreaLabel = computed<string>(() =>
    this.boundaryClosed() ? `${this.boundaryArea().toFixed(1)} ha` : '—',
  );

  /** Page title / subtitle switch between Create and Edit copy. */
  protected readonly titleKey = computed<string>(() =>
    this.isEditMode ? 'plotCreate.edit.title' : 'plotCreate.title',
  );
  protected readonly subtitleKey = computed<string>(() =>
    this.isEditMode ? 'plotCreate.edit.subtitle' : 'plotCreate.subtitle',
  );

  protected readonly registerIcon = computed<string>(() => {
    if (this.store.loading().saving) {
      return 'hourglass_empty';
    }

    if (!this.boundaryClosed() || this.areaTooSmall()) {
      return 'lock';
    }

    return this.isEditMode ? 'save' : 'check';
  });

  protected readonly registerLabelKey = computed<string>(() => {
    if (this.store.loading().saving) {
      return this.isEditMode ? 'plotCreate.edit.saving' : 'plotCreate.boundary.registering';
    }

    if (!this.boundaryClosed()) {
      return 'plotCreate.boundary.registerLocked';
    }

    if (this.areaTooSmall()) {
      return 'plotCreate.boundary.registerTooSmall';
    }

    return this.isEditMode ? 'plotCreate.edit.save' : 'plotCreate.boundary.register';
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

    if (!this.boundaryClosed() || this.areaTooSmall()) {
      this.registerAttempted.set(true);
      return;
    }

    const raw = this.form.getRawValue();
    const points = this.boundaryPoints();
    const polygonCoordinates: PlotCoordinate[] = [...points, points[0]];

    if (this.isEditMode && this.editPlotId) {
      // PATCH: send the form's current values (empty string clears a field the
      // user wiped). `variety` is untouched by this form, so we omit it and the
      // backend keeps it.
      this.store.updatePlot(
        this.editPlotId,
        {
          name: (raw.name ?? '').trim(),
          polygonCoordinates,
          cropType: (raw.cropType ?? '').trim(),
          campaign: (raw.campaign ?? '').trim(),
          location: (raw.location ?? '').trim(),
          notes: (raw.notes ?? '').trim(),
        },
        () => this.router.navigate(['/agronomic/plots', this.editPlotId]),
      );
      return;
    }

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
