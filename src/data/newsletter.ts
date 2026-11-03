import type { Locale } from '../i18n';
/** Activate per language only after the provider's hosted form, consent,
 * privacy information and unsubscribe flow have all been configured and tested.
 * Hosted forms avoid embedding third-party scripts or storing addresses here.
 */
export interface NewsletterSubscription {
	hostedFormUrl: string;
	privacyUrl: string;
}
export const newsletter: Partial<Record<Locale, NewsletterSubscription>> = {};
