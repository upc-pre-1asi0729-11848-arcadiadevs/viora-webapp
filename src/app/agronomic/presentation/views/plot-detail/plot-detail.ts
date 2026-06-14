import { Component, OnInit, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageSwitcher } from '../../../../shared/presentation/components/language-switcher/language-switcher';

import { AgronomicStore } from '../../../application/agronomic.store';
import { PlotDetail } from '../../../domain/model/plot-detail.entity';
import { MonitoringLinkStatus } from '../../../domain/model/plot-registration.entity';
import { PlotThumbnail } from '../../components/plot-thumbnail/plot-thumbnail';
import {
  PlotDeleteDialog,
  PlotDeleteDialogData,
} from '../../components/plot-delete-dialog/plot-delete-dialog';

@Component({
  selector: 'app-plot-detail',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    TranslatePipe,
    LanguageSwitcher,
    PlotThumbnail,
  ],
  templateUrl: './plot-detail.html',
  styleUrl: './plot-detail.css',
})
export class PlotDetailView implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  protected readonly store = inject(AgronomicStore);

  private readonly plotId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly detail = computed<PlotDetail | null>(() => this.store.plotDetail());
  protected readonly isLoading = computed<boolean>(() => this.store.loading().detail);

  ngOnInit(): void {
    if (this.plotId) {
      this.store.fetchPlotDetail(this.plotId);
    }
  }

  protected refresh(): void {
    if (this.plotId) {
      this.store.fetchPlotDetail(this.plotId);
    }
  }

  // ----- Status pill mapping -----

  protected linkLabelKey(status: MonitoringLinkStatus): string {
    switch (status) {
      case 'active':
        return 'plotDetail.status.active';
      case 'initializing':
        return 'plotDetail.status.initializing';
      case 'not-linked':
        return 'plotDetail.status.notLinked';
      default:
        return 'plotDetail.status.pending';
    }
  }

  protected linkClass(status: MonitoringLinkStatus): string {
    switch (status) {
      case 'active':
        return 'tag-active';
      case 'not-linked':
        return 'tag-muted';
      default:
        return 'tag-init';
    }
  }

  // ----- Formatting helpers -----

  protected dateLabel(iso: string): string {
    const timestamp = iso ? Date.parse(iso) : Number.NaN;

    if (!Number.isFinite(timestamp)) {
      return '—';
    }

    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  }

  protected dateTimeLabel(iso: string): string {
    const timestamp = iso ? Date.parse(iso) : Number.NaN;

    if (!Number.isFinite(timestamp)) {
      return '—';
    }

    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected relativeTime(iso: string): string {
    const timestamp = iso ? Date.parse(iso) : Number.NaN;

    if (!Number.isFinite(timestamp)) {
      return '—';
    }

    const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));

    if (diffMinutes < 1) {
      return 'just now';
    }
    if (diffMinutes < 60) {
      return `${diffMinutes} min ago`;
    }

    const diffHours = Math.round(diffMinutes / 60);

    if (diffHours < 24) {
      return `${diffHours} h ago`;
    }

    return `${Math.round(diffHours / 24)} d ago`;
  }

  // ----- Delete flow -----

  protected openDeleteDialog(): void {
    const plot = this.detail();

    if (!plot || plot.id === null) {
      return;
    }

    const dialogRef = this.dialog.open<
      PlotDeleteDialog,
      PlotDeleteDialogData,
      boolean
    >(PlotDeleteDialog, {
      width: '460px',
      data: { plotName: plot.name },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed && plot.id !== null) {
        this.store.deletePlot(plot.id, () => this.router.navigate(['/agronomic/plots']));
      }
    });
  }
}
