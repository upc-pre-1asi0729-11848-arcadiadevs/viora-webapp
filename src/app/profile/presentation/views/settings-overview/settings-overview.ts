import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { ActiveSessionService } from '../../../../shared/infrastructure/active-session.service';
import { CloudinaryService } from '../../../../shared/infrastructure/cloudinary.service';

import {
  DashboardBreadcrumbItem,
  DashboardHeader,
} from '../../../../shared/presentation/components/dashboard-header/dashboard-header';

import { AgronomicApiService } from '../../../../agronomic/infrastructure/agronomic-api.service';

import { ProfileStore } from '../../../application/profile.store';
import { UserProfile } from '../../../domain/model/user-profile.entity';

import { BillingStore } from '../../../../billing/application/billing.store';
import { Coupon } from '../../../../billing/domain/model/coupon.entity';
import { SecurityStore } from '../../../../iam/application/security.store';

/** Settings sections. */
type SettingsTab = 'profile' | 'referrals' | 'security';

interface SettingsTabDef {
  id: SettingsTab;
  label: string;
  icon: string;
}

interface PasswordMessage {
  tone: 'ok' | 'error';
  text: string;
}

@Component({
  selector: 'app-settings-overview',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatIconModule, DashboardHeader],
  templateUrl: './settings-overview.html',
  styleUrl: './settings-overview.css',
})
export class SettingsOverviewView implements OnInit {
  protected readonly store = inject(ProfileStore);
  protected readonly billing = inject(BillingStore);
  protected readonly security = inject(SecurityStore);
  private readonly agronomicApi = inject(AgronomicApiService);
  private readonly cloudinary = inject(CloudinaryService);
  private readonly session = inject(ActiveSessionService);
  private readonly router = inject(Router);

  protected readonly tabs: SettingsTabDef[] = [
    { id: 'profile', label: 'Profile', icon: 'person' },
    { id: 'referrals', label: 'Referrals', icon: 'card_giftcard' },
    { id: 'security', label: 'Security', icon: 'shield' },
  ];

  protected readonly activeTab = signal<SettingsTab>('profile');
  private readonly loadedTabs = new Set<SettingsTab>();

  protected readonly languageOptions = ['English', 'Español', 'Português'];

  // ----- Profile draft -----
  protected readonly fullName = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly jobTitle = signal('');
  protected readonly language = signal('');
  protected readonly location = signal('');
  protected readonly specialtyArea = signal('');
  protected readonly photoUrl = signal('');
  protected readonly uploadingPhoto = signal(false);
  protected readonly photoError = signal<string | null>(null);
  protected readonly totalHectares = signal(0);
  protected readonly plotCount = signal(0);

  // ----- Referrals -----
  protected readonly codeCopied = signal(false);
  protected readonly redeemInput = signal('');
  protected readonly selectedCoupon = signal<Coupon | null>(null);
  protected readonly conditionsExpanded = signal(true);
  protected readonly couponCodeCopied = signal(false);

  // Interactive 3D tilt for the selected coupon (sticker-like hover).
  protected readonly couponTransform = signal('rotateX(0deg) rotateY(0deg)');
  protected readonly glossX = signal('50%');
  protected readonly glossY = signal('-20%');

  /** Viora-adapted referral coupon terms (presentation legal copy). */
  protected readonly referralTerms: string[] = [
    'Valid for one subscription discount per completed referral — the invited producer must finish plot onboarding and connect at least one IoT device.',
    'The discount applies automatically to your next billing cycle once the referral qualifies.',
    'You can hold a maximum of 5 active referral coupons per account at any time.',
    'Not combinable with other Subscription promotions or annual-billing discounts.',
    'Viora may modify or revoke referral coupons in cases of suspected abuse or fraudulent referrals.',
  ];

  // ----- Security -----
  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly passwordMessage = signal<PasswordMessage | null>(null);
  protected readonly deleteModalOpen = signal(false);
  protected readonly accountDeleted = signal(false);

  protected readonly breadcrumbs = computed<DashboardBreadcrumbItem[]>(() => {
    const current = this.tabs.find((tab) => tab.id === this.activeTab());
    return [
      { label: 'Settings', disabled: true },
      { label: current?.label ?? 'Profile', disabled: true },
    ];
  });

  /** Live preview of the marketplace card as the other party sees it. */
  protected readonly preview = computed<UserProfile>(() =>
    this.store.profile().withChanges({
      fullName: this.fullName(),
      specialtyArea: this.specialtyArea(),
      location: this.location(),
      photoUrl: this.photoUrl(),
      totalHectares: this.totalHectares(),
      plotCount: this.plotCount(),
    }),
  );

  constructor() {
    // Refill the profile draft whenever a freshly loaded/saved profile arrives.
    effect(() => {
      const profile = this.store.profile();
      this.applyDraftFrom(profile);
    });
  }

  ngOnInit(): void {
    this.store.load();
    this.loadFarmTotals();
  }

  protected selectTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
    this.ensureTabData(tab);
  }

  /** Loads a tab's real data on first activation. */
  private ensureTabData(tab: SettingsTab): void {
    if (this.loadedTabs.has(tab)) {
      return;
    }
    this.loadedTabs.add(tab);
    if (tab === 'referrals') {
      this.billing.load();
    } else if (tab === 'security') {
      this.security.loadSessions();
    }
  }

  /** Header refresh: reload whatever the active tab shows. */
  protected resetDraft(): void {
    this.store.load();
    this.loadFarmTotals();
    if (this.activeTab() === 'referrals') {
      this.billing.load();
    } else if (this.activeTab() === 'security') {
      this.security.loadSessions();
    }
  }

  private applyDraftFrom(profile: UserProfile): void {
    this.fullName.set(profile.fullName);
    this.email.set(profile.email);
    this.phone.set(profile.phone);
    this.jobTitle.set(profile.jobTitle);
    this.language.set(profile.language);
    this.location.set(profile.location);
    this.specialtyArea.set(profile.specialtyArea);
    this.photoUrl.set(profile.photoUrl);
  }

  private loadFarmTotals(): void {
    this.agronomicApi.getPlots().subscribe((plots) => {
      const hectares = plots.reduce((sum, plot) => sum + (plot.areaSize || 0), 0);
      this.totalHectares.set(Number(hectares.toFixed(1)));
      this.plotCount.set(plots.length);
    });
  }

  protected saveChanges(): void {
    this.store.save({
      fullName: this.fullName().trim(),
      email: this.email().trim(),
      phone: this.phone().trim(),
      jobTitle: this.jobTitle().trim(),
      language: this.language(),
      location: this.location().trim(),
      specialtyArea: this.specialtyArea().trim(),
      photoUrl: this.photoUrl(),
    });
  }

  /** True while Cloudinary is not configured, disabling the change-photo button. */
  protected get photoUploadDisabled(): boolean {
    return this.uploadingPhoto() || !this.cloudinary.isConfigured;
  }

  /**
   * Uploads the chosen image to Cloudinary and persists the returned URL on the
   * profile, so the new avatar shows everywhere immediately.
   */
  protected onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file later
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.photoError.set('Please choose an image file.');
      return;
    }
    if (!this.cloudinary.isConfigured) {
      this.photoError.set('Photo upload is not configured yet.');
      return;
    }

    this.photoError.set(null);
    this.uploadingPhoto.set(true);
    this.cloudinary.uploadImage(file).subscribe({
      next: (url) => {
        this.uploadingPhoto.set(false);
        if (!url) {
          this.photoError.set('Upload failed. Please try again.');
          return;
        }
        this.photoUrl.set(url);
        this.saveChanges();
      },
      error: () => {
        this.uploadingPhoto.set(false);
        this.photoError.set('Could not upload the photo. Please try again.');
      },
    });
  }

  // ----- Referrals actions -----

  protected copyReferralCode(): void {
    const code = this.billing.referralCode().code;
    if (!code) {
      return;
    }
    navigator.clipboard?.writeText(code).then(() => {
      this.codeCopied.set(true);
      setTimeout(() => this.codeCopied.set(false), 2000);
    });
  }

  protected shareReferral(): void {
    const referral = this.billing.referralCode();
    const shareData = {
      title: 'Join me on Viora',
      text: `Use my referral code ${referral.code} to join Viora.`,
      url: referral.shareLink,
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard?.writeText(referral.shareLink);
      this.codeCopied.set(true);
      setTimeout(() => this.codeCopied.set(false), 2000);
    }
  }

  protected redeemCoupon(): void {
    const code = this.redeemInput().trim();
    if (!code || this.billing.redeeming()) {
      return;
    }
    this.billing.redeem(code, (ok) => {
      if (ok) {
        this.redeemInput.set('');
      }
    });
  }

  protected selectCoupon(coupon: Coupon): void {
    this.selectedCoupon.set(coupon);
    this.conditionsExpanded.set(true);
    this.couponCodeCopied.set(false);
    this.couponTransform.set('rotateX(0deg) rotateY(0deg)');
    this.glossX.set('50%');
    this.glossY.set('-20%');
  }

  protected backToCoupons(): void {
    this.selectedCoupon.set(null);
  }

  protected toggleConditions(): void {
    this.conditionsExpanded.update((v) => !v);
  }

  protected copyCouponCode(coupon: Coupon): void {
    if (!coupon.code) {
      return;
    }
    navigator.clipboard?.writeText(coupon.code).then(() => {
      this.couponCodeCopied.set(true);
      setTimeout(() => this.couponCodeCopied.set(false), 2000);
    });
  }

  /** Tilts the selected coupon toward the cursor and moves the gloss highlight. */
  protected onCouponMove(event: PointerEvent): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const rotY = (px - 0.5) * 16;
    const rotX = (0.5 - py) * 12;
    this.couponTransform.set(`rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`);
    this.glossX.set(`${(px * 100).toFixed(1)}%`);
    this.glossY.set(`${(py * 100).toFixed(1)}%`);
  }

  /** Returns the coupon to rest and lets the gloss fade out in place. */
  protected onCouponLeave(): void {
    this.couponTransform.set('rotateX(0deg) rotateY(0deg)');
  }

  // ----- Security actions -----

  protected get canUpdatePassword(): boolean {
    return (
      this.currentPassword().length > 0 &&
      this.newPassword().length >= 8 &&
      this.newPassword() === this.confirmPassword() &&
      !this.security.changingPassword()
    );
  }

  protected updatePassword(): void {
    this.passwordMessage.set(null);

    if (this.newPassword().length < 8) {
      this.passwordMessage.set({ tone: 'error', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (this.newPassword() !== this.confirmPassword()) {
      this.passwordMessage.set({ tone: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    this.security.changePassword(
      { currentPassword: this.currentPassword(), newPassword: this.newPassword() },
      (ok, message) => {
        if (ok) {
          this.passwordMessage.set({ tone: 'ok', text: 'Password updated successfully.' });
          this.currentPassword.set('');
          this.newPassword.set('');
          this.confirmPassword.set('');
        } else {
          this.passwordMessage.set({ tone: 'error', text: message ?? 'Could not update your password.' });
        }
      },
    );
  }

  protected signOutSession(sessionId: number | string): void {
    this.security.revokeSession(sessionId);
  }

  protected openDelete(): void {
    this.deleteModalOpen.set(true);
  }

  protected closeDelete(): void {
    this.deleteModalOpen.set(false);
  }

  protected confirmDelete(): void {
    this.security.deleteAccount((ok) => {
      if (ok) {
        this.accountDeleted.set(true);
        this.deleteModalOpen.set(false);
        // The account is gone: end the session and return to the login screen.
        this.session.clear();
        void this.router.navigate(['/login']);
      }
    });
  }
}
