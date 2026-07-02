/**
 * @file user-profile.entity.ts
 * @description Domain entity for the account holder's profile (Profile & Asset
 * Management bounded context). Backs the Settings › Profile screen: editable
 * personal information plus the marketplace-visibility fields that shape how the
 * user's card is presented to the other party in Expert Assistance.
 *
 * The model supports both roles so the specialist variant can reuse it later.
 * For a producer the marketplace card shows real account facts (grove focus and
 * total farmed area) rather than specialist-only concepts (years of experience,
 * focus tags, same-day availability), which were intentionally dropped.
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
  /** Short role caption for the preview card, e.g. "Olive producer". */
  roleLabel?: string;
  language?: string;
  /** Location caption surfaced to the other party, e.g. "Valle de Ica, Peru". */
  location?: string;
  /** Grove/crop focus (producer) or specialty area (specialist). */
  specialtyArea?: string;
  /**
   * Total farmed area (hectares) across the account's plots. Display-only —
   * derived live from the real My Plots data, never persisted on the profile.
   */
  totalHectares?: number;
  /** Number of plots in the account. Display-only, derived from My Plots. */
  plotCount?: number;
}

export class UserProfile {
  readonly id: number | string | null;
  readonly role: ProfileRole;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly jobTitle: string;
  readonly roleLabel: string;
  readonly language: string;
  readonly location: string;
  readonly specialtyArea: string;
  readonly totalHectares: number;
  readonly plotCount: number;

  constructor({
    id = null,
    role = 'producer',
    fullName = '',
    email = '',
    phone = '',
    jobTitle = '',
    roleLabel = '',
    language = 'English',
    location = '',
    specialtyArea = '',
    totalHectares = 0,
    plotCount = 0,
  }: UserProfileProps = {}) {
    this.id = id;
    this.role = role;
    this.fullName = fullName;
    this.email = email;
    this.phone = phone;
    this.jobTitle = jobTitle;
    this.roleLabel = roleLabel;
    this.language = language;
    this.location = location;
    this.specialtyArea = specialtyArea;
    this.totalHectares = totalHectares;
    this.plotCount = plotCount;
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

  /** "24.6 ha · 3 plots" caption for the preview card (real My Plots data). */
  get farmSizeLabel(): string {
    const ha = `${this.totalHectares.toFixed(1)} ha`;
    if (this.plotCount <= 0) {
      return ha;
    }
    return `${ha} · ${this.plotCount} ${this.plotCount === 1 ? 'plot' : 'plots'}`;
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
      language: this.language,
      location: this.location,
      specialtyArea: this.specialtyArea,
      totalHectares: this.totalHectares,
      plotCount: this.plotCount,
      ...changes,
    });
  }
}
