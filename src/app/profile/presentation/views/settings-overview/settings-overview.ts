import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import { ActiveSessionService } from '../../../../shared/infrastructure/active-session.service';
import { CloudinaryService } from '../../../../shared/infrastructure/cloudinary.service';

import {
  DashboardBreadcrumbItem,
  DashboardHeader,
} from '../../../../shared/presentation/components/dashboard-header/dashboard-header';
import {
  LocationPickerModal,
  PickedLocation,
} from '../../../../shared/presentation/components/location-picker-modal/location-picker-modal';

import { AgronomicApiService } from '../../../../agronomic/infrastructure/agronomic-api.service';

import { ProfileStore } from '../../../application/profile.store';
import { UserProfile } from '../../../domain/model/user-profile.entity';
import {
  SPECIALIST_SERVICE_TAGS,
  parseServiceTags,
} from '../../../domain/model/service-tags.catalog';

import { BillingStore } from '../../../../billing/application/billing.store';
import { Coupon } from '../../../../billing/domain/model/coupon.entity';
import { SubscriptionStore } from '../../../../billing/application/subscription.store';
import { SecurityStore } from '../../../../iam/application/security.store';

/** Settings sections. */
type SettingsTab = 'profile' | 'referrals' | 'security';

interface SettingsTabDef {
  id: SettingsTab;
  labelKey: string;
  icon: string;
}

interface PasswordMessage {
  tone: 'ok' | 'error';
  text: string;
}

@Component({
  selector: 'app-settings-overview',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    DashboardHeader,
    LocationPickerModal,
    TranslatePipe,
  ],
  templateUrl: './settings-overview.html',
  styleUrl: './settings-overview.css',
})
export class SettingsOverviewView implements OnInit {
  protected readonly store = inject(ProfileStore);
  protected readonly billing = inject(BillingStore);
  protected readonly subscription = inject(SubscriptionStore);
  protected readonly security = inject(SecurityStore);
  private readonly agronomicApi = inject(AgronomicApiService);
  private readonly cloudinary = inject(CloudinaryService);
  private readonly session = inject(ActiveSessionService);
  private readonly router = inject(Router);

  protected readonly tabs: SettingsTabDef[] = [
    { id: 'profile', labelKey: 'settingsPage.tabs.profile', icon: 'person' },
    { id: 'referrals', labelKey: 'settingsPage.tabs.referrals', icon: 'card_giftcard' },
    { id: 'security', labelKey: 'settingsPage.tabs.security', icon: 'shield' },
  ];

  protected readonly activeTab = signal<SettingsTab>('profile');
  private readonly loadedTabs = new Set<SettingsTab>();

  protected readonly languageOptions = ['English', 'Español'];

  // ----- Profile draft -----
  protected readonly fullName = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly jobTitle = signal('');
  protected readonly language = signal('');
  protected readonly location = signal('');
  protected readonly specialtyArea = signal('');
  // Specialist marketplace fields (drive the real recommendation matching).
  protected readonly latitude = signal('');
  protected readonly longitude = signal('');
  protected readonly serviceRadiusKm = signal('');
  protected readonly serviceTags = signal('');
  protected readonly availability = signal('');
  protected readonly photoUrl = signal('');

  protected readonly availabilityOptions = [
    { value: 'AVAILABLE_TODAY', labelKey: 'settingsPage.profile.availabilityToday' },
    { value: 'AVAILABLE_TOMORROW', labelKey: 'settingsPage.profile.availabilityTomorrow' },
    { value: 'AVAILABLE_THIS_WEEK', labelKey: 'settingsPage.profile.availabilityWeek' },
    { value: 'UNAVAILABLE', labelKey: 'settingsPage.profile.availabilityUnavailable' },
  ];

  // Specialist marketplace: predefined tag catalogue, radius slider and map picker.
  protected readonly serviceTagOptions = SPECIALIST_SERVICE_TAGS;
  protected readonly radiusMin = 25;
  protected readonly radiusMax = 500;
  protected readonly radiusDefault = 150;
  protected readonly showLocationPicker = signal(false);
  /** Default specialty shown pre-filled (editable) for specialists. */
  private readonly defaultSpecialtyArea = 'Phytosanitary specialist';
  /** Whether the Pro badge is shown on the card (Pro plan only; display-only). */
  protected readonly showProBadge = signal(true);
  /** Guards the draft so incidental profile re-emits never wipe unsaved edits. */
  private draftHydrated = false;

  /** True when the given catalogue tag is part of the current selection. */
  protected isTagSelected(value: string): boolean {
    return parseServiceTags(this.serviceTags()).includes(value);
  }

  /** Adds or removes a catalogue tag, keeping the stored comma-separated string. */
  protected toggleServiceTag(value: string): void {
    const current = parseServiceTags(this.serviceTags());
    const next = current.includes(value)
      ? current.filter((tag) => tag !== value)
      : [...current, value];
    this.serviceTags.set(next.join(', '));
  }

  /** Effective radius for the slider, falling back to the default when unset. */
  protected radiusValue(): number {
    const parsed = Number(this.serviceRadiusKm());
    return Number.isFinite(parsed) && parsed > 0 ? parsed : this.radiusDefault;
  }

  protected onRadiusInput(value: string): void {
    this.serviceRadiusKm.set(value);
  }

  protected openLocationPicker(): void {
    this.showLocationPicker.set(true);
  }

  protected closeLocationPicker(): void {
    this.showLocationPicker.set(false);
  }

  /** Applies the map selection: coordinates drive matching, label fills Service area. */
  protected onLocationPicked(picked: PickedLocation): void {
    this.latitude.set(String(picked.latitude));
    this.longitude.set(String(picked.longitude));
    if (picked.label) {
      this.location.set(picked.label);
    }
    this.showLocationPicker.set(false);
  }

  protected pickerInitialLat(): number | null {
    const parsed = Number(this.latitude());
    return Number.isFinite(parsed) && this.latitude().trim() !== '' ? parsed : null;
  }

  protected pickerInitialLng(): number | null {
    const parsed = Number(this.longitude());
    return Number.isFinite(parsed) && this.longitude().trim() !== '' ? parsed : null;
  }

  protected hasCoordinates(): boolean {
    return this.latitude().trim() !== '' && this.longitude().trim() !== '';
  }
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
    'settingsPage.referralTerms.one',
    'settingsPage.referralTerms.two',
    'settingsPage.referralTerms.three',
    'settingsPage.referralTerms.four',
    'settingsPage.referralTerms.five',
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
      { label: 'Settings', labelKey: 'settingsPage.breadcrumb', disabled: true },
      {
        label: 'Profile',
        labelKey: current?.labelKey ?? 'settingsPage.tabs.profile',
        disabled: true,
      },
    ];
  });

  protected readonly isSpecialistProfile = computed<boolean>(
    () => this.session.isSpecialist() || this.store.profile().role === 'specialist',
  );

  /** Live preview of the marketplace card as the other party sees it. */
  protected readonly preview = computed<UserProfile>(() => {
    const profile = this.store.profile();
    return profile.withChanges({
      role: this.isSpecialistProfile() ? 'specialist' : profile.role,
      fullName: this.fullName(),
      jobTitle: this.jobTitle(),
      specialtyArea: this.specialtyArea(),
      location: this.location(),
      photoUrl: this.photoUrl(),
      totalHectares: this.totalHectares(),
      plotCount: this.plotCount(),
    });
  });

  protected readonly specialistDisplayRole = computed<string>(() => {
    const profile = this.preview();
    return profile.specialtyArea || profile.jobTitle || profile.roleLabel;
  });

  /** Live preview of the selected service tags, mapped to their display labels. */
  protected readonly previewTags = computed<{ value: string; labelKey: string | null }[]>(() =>
    parseServiceTags(this.serviceTags()).map((value) => ({
      value,
      labelKey: SPECIALIST_SERVICE_TAGS.find((option) => option.value === value)?.labelKey ?? null,
    })),
  );

  /** i18n key for the selected availability, or null when none is chosen. */
  protected readonly previewAvailabilityLabelKey = computed<string | null>(
    () => this.availabilityOptions.find((option) => option.value === this.availability())?.labelKey ?? null,
  );

  protected readonly hasSubscriptionData = computed<boolean>(
    () => this.subscription.subscription() !== null || this.subscription.currentPlan() !== null,
  );

  protected readonly isSpecialistProPlan = computed<boolean>(() => {
    const plan = this.subscription.currentPlan();
    const active = this.subscription.subscription();
    return (
      this.isProPlan(plan?.code, plan?.name) || this.isProPlan(active?.planCode, active?.planName)
    );
  });

  constructor() {
    // Hydrate the editable draft from the FIRST real profile load only. The store
    // is a singleton that re-emits on incidental events (a tab's data loading, the
    // sidebar refreshing identity); re-applying then would wipe unsaved edits, so
    // guard against it. A manual refresh or save re-arms hydration explicitly.
    effect(() => {
      const profile = this.store.profile();
      if (this.draftHydrated || !profile.email) {
        return;
      }
      this.applyDraftFrom(profile);
      this.draftHydrated = true;
    });
  }

  ngOnInit(): void {
    this.store.load();
    if (!this.session.isSpecialist()) {
      this.loadFarmTotals();
    } else {
      this.subscription.load();
    }
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
    this.draftHydrated = false;
    this.store.load();
    if (!this.session.isSpecialist()) {
      this.loadFarmTotals();
    } else {
      this.subscription.load();
    }
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
    const specialist = this.session.isSpecialist() || profile.role === 'specialist';
    this.specialtyArea.set(
      profile.specialtyArea || (specialist ? this.defaultSpecialtyArea : ''),
    );
    this.latitude.set(profile.latitude != null ? String(profile.latitude) : '');
    this.longitude.set(profile.longitude != null ? String(profile.longitude) : '');
    this.serviceRadiusKm.set(profile.serviceRadiusKm != null ? String(profile.serviceRadiusKm) : '');
    this.serviceTags.set(profile.serviceTags);
    this.availability.set(profile.availability);
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
    const specialist = this.isSpecialistProfile();
    this.store.save({
      fullName: this.fullName().trim(),
      email: this.email().trim(),
      phone: this.phone().trim(),
      jobTitle: this.jobTitle().trim(),
      language: this.language(),
      location: this.location().trim(),
      specialtyArea: this.specialtyArea().trim(),
      // Specialist-only marketplace fields; omitted for producers.
      latitude: specialist ? this.toNumberOrNull(this.latitude()) : undefined,
      longitude: specialist ? this.toNumberOrNull(this.longitude()) : undefined,
      serviceRadiusKm: specialist ? this.toNumberOrNull(this.serviceRadiusKm()) : undefined,
      serviceTags: specialist ? this.serviceTags().trim() : undefined,
      availability: specialist ? this.availability().trim() : undefined,
      photoUrl: this.photoUrl(),
    });
  }

  /** Parses a numeric input, returning null for blank/invalid values. */
  private toNumberOrNull(value: string): number | null {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
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
      this.passwordMessage.set({
        tone: 'error',
        text: 'New password must be at least 8 characters.',
      });
      return;
    }
    if (this.newPassword() !== this.confirmPassword()) {
      this.passwordMessage.set({
        tone: 'error',
        text: 'New password and confirmation do not match.',
      });
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
          this.passwordMessage.set({
            tone: 'error',
            text: message ?? 'Could not update your password.',
          });
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

  protected goToSubscription(): void {
    void this.router.navigate(['/subscription']);
  }

  private isProPlan(code?: string, name?: string): boolean {
    const value = `${code ?? ''} ${name ?? ''}`.toLowerCase();
    return value.includes('pro');
  }
}
