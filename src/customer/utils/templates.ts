import { getRefCode } from './referralCode';

export interface Template {
  id: string;
  name: string;
  type: string;
  body: string;
}

export interface Settings {
  business_name: string;
  google_review_link: string;
  thresholds: { active: number; warm: number; cooling: number; cold: number };
}

export interface TemplateExtras {
  discount?: string;
  promoText?: string;
  offer?: string;
  promo_code?: string;
}

export function fillTemplate(
  body: string,
  customer: any | null,
  extras: TemplateExtras,
  settings: Settings
): string {
  const name = customer?.name ? customer.name.split(' ')[0] : '{name}';
  const fullName = customer?.name || '{fullName}';
  const business = settings.business_name || 'Our Business';
  const reviewLink = settings.google_review_link || '(set review link in Settings)';
  const refCode = customer?.id ? getRefCode(customer.id) : '{refCode}';
  const promoText = extras.promoText || extras.offer || extras.discount || 'Special offer';
  const promoCode = extras.promo_code || '';
  const days = customer?._days != null ? String(customer._days) : '';

  return body
    .replace(/\{\{name\}\}|\{name\}/g, name)
    .replace(/\{\{fullName\}\}|\{fullName\}/g, fullName)
    .replace(/\{\{business\}\}|\{business\}/g, business)
    .replace(/\{\{review_link\}\}|\{\{reviewLink\}\}|\{reviewLink\}/g, reviewLink)
    .replace(/\{\{ref_code\}\}|\{\{refCode\}\}|\{refCode\}/g, refCode)
    .replace(/\{\{offer\}\}|\{discount\}/g, promoText)
    .replace(/\{\{promo_code\}\}|\{promoCode\}/g, promoCode)
    .replace(/\{\{promoText\}\}|\{promoText\}/g, promoText)
    .replace(/\{days\}/g, days);
}

export const MSG_TYPES: Record<string, { label: string; color: string; border: string }> = {
  missyou:  { label: 'We miss you',    color: '#D85A30', border: 'rgba(216,90,48,.5)' },
  promo:    { label: 'Promo',          color: '#CF5BA0', border: 'rgba(207,91,160,.5)' },
  exclusive:{ label: 'Exclusive Days', color: '#B08D30', border: 'rgba(176,141,48,.5)' },
  review:   { label: 'Review',         color: '#5DCAA5', border: 'rgba(93,202,165,.5)' },
  referral: { label: 'Referral',       color: '#9c9b95', border: 'rgba(156,155,149,.5)' },
};

