/**
 * @file user-session.entity.ts
 * @description Domain entity for a signed-in device/session of the account holder
 * (IAM). Backs the "Active sessions" card in Settings › Security.
 */
export interface UserSessionProps {
  id?: number | string | null;
  device?: string;
  client?: string;
  location?: string;
  /** ISO timestamp of the last activity on this session. */
  lastActiveAt?: string | null;
  current?: boolean;
}

export class UserSession {
  readonly id: number | string | null;
  readonly device: string;
  readonly client: string;
  readonly location: string;
  readonly lastActiveAt: string | null;
  readonly current: boolean;

  constructor({
    id = null,
    device = '',
    client = '',
    location = '',
    lastActiveAt = null,
    current = false,
  }: UserSessionProps = {}) {
    this.id = id;
    this.device = device;
    this.client = client;
    this.location = location;
    this.lastActiveAt = lastActiveAt;
    this.current = current;
  }

  /** "MacBook Pro · Chrome" title line. */
  get title(): string {
    return [this.device, this.client].filter(Boolean).join(' · ');
  }

  /** Material icon representing the device family. */
  get icon(): string {
    const label = `${this.device} ${this.client}`.toLowerCase();
    if (/(iphone|android|pixel|galaxy|phone|app)/.test(label)) {
      return 'smartphone';
    }
    if (/(macbook|laptop|notebook)/.test(label)) {
      return 'laptop_mac';
    }
    return 'desktop_windows';
  }

  /** "Active now" / "2 hours ago" / "3 days ago" caption. */
  get lastActiveLabel(): string {
    if (this.current) {
      return 'Active now';
    }
    if (!this.lastActiveAt) {
      return '';
    }
    const then = new Date(this.lastActiveAt).getTime();
    if (Number.isNaN(then)) {
      return '';
    }
    const minutes = Math.max(0, Math.floor((Date.now() - then) / 60000));
    if (minutes < 1) {
      return 'Active now';
    }
    if (minutes < 60) {
      return `${minutes} min ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }

  /** "Tacna, Peru · Active now" subtitle. */
  get subtitle(): string {
    return [this.location, this.lastActiveLabel].filter(Boolean).join(' · ');
  }
}
