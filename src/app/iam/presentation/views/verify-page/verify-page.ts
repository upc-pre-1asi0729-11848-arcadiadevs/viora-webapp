import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthStore } from '../../../application/auth.store';

type VerifyState = 'verifying' | 'success' | 'error';

@Component({
  selector: 'app-verify-page',
  standalone: true,
  imports: [MatIconModule, RouterLink, TranslatePipe],
  templateUrl: './verify-page.html',
  styleUrls: ['../auth-pages.css'],
})
export class VerifyPage implements OnInit {
  protected readonly auth = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);

  protected readonly state = signal<VerifyState>('verifying');

  ngOnInit(): void {
    this.auth.clearMessages();
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('error');
      return;
    }
    // On success the store signs the user in and routes to their role's home.
    this.auth.verify(token, (ok) => this.state.set(ok ? 'success' : 'error'));
  }
}
