/**
 * @file user-profile.entity.ts
 * @description Domain entity for the account holder's profile (Profile & Asset
 * Management bounded context). Backs the Settings › Profile screen: editable
 * personal information plus the marketplace-visibility fields that shape how the
 * user's card is presented to the other party in Expert Assistance.
 *
 * The model supports both roles so the specialist variant can reuse it later:
 * for a producer the card is what specialists see when a request arrives; for a
 * specialist it is what producers see among recommended candidates.
 */
export type ProfileRole = 'producer' | 'specialist';

export interface UserProfileProps {
  id?: number | string | null;
  role?: ProfileRole;
  fullName?: string;
  email?: string;
  phone?: string;
  /** Free-text title shown under the name, e.g. "Farm Operations Lead". */
  jobTitle?: string;
  /** Short role caption for the preview card, e.g. "Owner" / "Olive producer". */
  roleLabel?: string;
  timezone?: string;
  language?: string;
  /** Location caption surfaced to the other party, e.g. "Valle de Ica, Peru". */
  location?: string;
  /** Grove/crop focus (producer) or specialty area (specialist). */
  specialtyArea?: string;
  /** Years farming (producer) or years of experience (specialist). */
  yearsExperience?: number;
  /** Focus tags shown on the marketplace card. */
  focusTags?: string[];
  /** When true, the card advertises same-day availability to respond. */
  availableToday?: boolean;
}

export class UserProfile {
  readonly id: number | string | null;
  readonly role: ProfileRole;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly jobTitle: string;
  readonly roleLabel: string;
  readonly timezone: string;
  readonly language: string;
  readonly location: string;
  readonly specialtyArea: string;
  readonly yearsExperience: number;
  readonly focusTags: string[];
  readonly availableToday: boolean;

  constructor({
    id = null,
    role = 'producer',
    fullName = '',
    email = '',
    phone = '',
    jobTitle = '',
    roleLabel = '',
    timezone = 'America/Lima (GMT-5)',
    language = 'English',
    location = '',
    specialtyArea = '',
    yearsExperience = 0,
    focusTags = [],
    availableToday = false,
  }: UserProfileProps = {}) {
    this.id = id;
    this.role = role;
    this.fullName = fullName;
    this.email = email;
    this.phone = phone;
    this.jobTitle = jobTitle;
    this.roleLabel = roleLabel;
    this.timezone = timezone;
    this.language = language;
    this.location = location;
    this.specialtyArea = specialtyArea;
    this.yearsExperience = yearsExperience;
    this.focusTags = focusTags;
    this.availableToday = availableToday;
  }

  /** Two-letter monogram used by the avatar bubble. */
  get initials(): string {
    const parts = this.fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '—';
    }
    const first = parts[0][0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
    return `${first}${last}`.toUpperCase();
  }

  /** "Job title · role" line shown under the name in the editor header. */
  get headline(): string {
    return [this.jobTitle, this.roleLabel].filter(Boolean).join(' · ');
  }

  /** "8 years · Olive oil production" caption for the preview card. */
  get experienceLabel(): string {
    const years = `${this.yearsExperience} ${this.yearsExperience === 1 ? 'year' : 'years'}`;
    return this.specialtyArea ? `${years} · ${this.specialtyArea}` : years;
  }

  get availabilityLabel(): string {
    return this.availableToday ? 'Available today' : 'Availability on request';
  }

  /** Returns a copy with the given fields overridden (immutability helper). */
  withChanges(changes: UserProfileProps): UserProfile {
    return new UserProfile({
      id: this.id,
      role: this.role,
      fullName: this.fullName,
      email: this.email,
      phone: this.phone,
      jobTitle: this.jobTitle,
      roleLabel: this.roleLabel,
      timezone: this.timezone,
      language: this.language,
      location: this.location,
      specialtyArea: this.specialtyArea,
      yearsExperience: this.yearsExperience,
      focusTags: this.focusTags,
      availableToday: this.availableToday,
      ...changes,
    });
  }
}
