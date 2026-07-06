/**
 * @file service-tags.catalog.ts
 * @description System catalogue of specialist service tags. Specialists pick from
 * this fixed list instead of typing free text, so the values stay aligned with the
 * backend matching policy (`SpecialistMatchingPolicy`), which scores a specialist's
 * relevance by substring-matching these tags against per-threat keywords
 * (xylella, pest, leaf, ndvi, water, climate, chill…). The canonical `value` is
 * stored verbatim and MUST keep those keywords; the label is translated for display.
 */

export interface ServiceTagOption {
  /** Canonical value persisted and matched by the backend — do not localize. */
  readonly value: string;
  /** i18n key for the chip label shown to the specialist. */
  readonly labelKey: string;
}

export const SPECIALIST_SERVICE_TAGS: readonly ServiceTagOption[] = [
  { value: 'Xylella monitoring', labelKey: 'settingsPage.profile.tags.xylella' },
  { value: 'Phytosanitary inspection', labelKey: 'settingsPage.profile.tags.phytosanitary' },
  { value: 'Biological control', labelKey: 'settingsPage.profile.tags.biological' },
  { value: 'Pest & leaf symptoms', labelKey: 'settingsPage.profile.tags.pest' },
  { value: 'Pest treatment', labelKey: 'settingsPage.profile.tags.treatment' },
  { value: 'Field inspection', labelKey: 'settingsPage.profile.tags.inspection' },
  { value: 'Low-vigor / NDVI diagnosis', labelKey: 'settingsPage.profile.tags.ndvi' },
  { value: 'Water stress & irrigation', labelKey: 'settingsPage.profile.tags.water' },
  { value: 'Climate & phenological risk', labelKey: 'settingsPage.profile.tags.climate' },
  { value: 'Chill deficit', labelKey: 'settingsPage.profile.tags.chill' },
  { value: 'Nutritional deficiency', labelKey: 'settingsPage.profile.tags.nutritional' },
];

/** Splits a stored comma-separated tag string into trimmed, non-empty values. */
export function parseServiceTags(raw: string | null | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}
