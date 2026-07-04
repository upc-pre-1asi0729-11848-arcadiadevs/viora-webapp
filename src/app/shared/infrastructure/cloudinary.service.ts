import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';

interface CloudinaryUploadResponse {
  secure_url?: string;
  url?: string;
}

/**
 * Uploads images to Cloudinary using an *unsigned* upload preset. The cloud name
 * and preset are public (they ship in the browser), so no secret is exposed; the
 * preset must be created as "unsigned" in the Cloudinary console. Returns the
 * hosted `secure_url` to store on the profile.
 */
@Injectable({ providedIn: 'root' })
export class CloudinaryService {
  private readonly http = inject(HttpClient);

  get isConfigured(): boolean {
    const { cloudName, uploadPreset } = environment.cloudinary;
    return (
      !!cloudName &&
      !!uploadPreset &&
      !cloudName.startsWith('YOUR_') &&
      !uploadPreset.startsWith('YOUR_')
    );
  }

  /** Uploads a single image file and resolves to its hosted URL. */
  uploadImage(file: File): Observable<string> {
    const { cloudName, uploadPreset } = environment.cloudinary;
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', uploadPreset);

    return this.http
      .post<CloudinaryUploadResponse>(endpoint, form)
      .pipe(map((response) => response.secure_url ?? response.url ?? ''));
  }
}
