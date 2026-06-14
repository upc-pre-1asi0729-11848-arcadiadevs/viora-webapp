import { Component, computed, inject, signal } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';

export interface PlotDeleteDialogData {
  plotName: string;
}

/**
 * Confirmation dialog for deleting a plot. As a safety step the user must retype
 * the exact plot name before the destructive action is enabled.
 */
@Component({
  selector: 'app-plot-delete-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslatePipe,
  ],
  templateUrl: './plot-delete-dialog.html',
  styleUrl: './plot-delete-dialog.css',
})
export class PlotDeleteDialog {
  protected readonly data = inject<PlotDeleteDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<PlotDeleteDialog, boolean>);

  protected readonly typedName = signal<string>('');

  protected readonly canDelete = computed<boolean>(
    () => this.typedName().trim() === this.data.plotName.trim(),
  );

  protected onInput(value: string): void {
    this.typedName.set(value);
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  protected confirm(): void {
    if (this.canDelete()) {
      this.dialogRef.close(true);
    }
  }
}
