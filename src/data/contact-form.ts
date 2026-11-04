export interface ContactFormConfiguration {
	endpoint?: string;
	privacyNotice?: string;
}

export function resolveContactFormConfiguration(
	formId: string | undefined,
	privacyNotice: string | undefined,
	privacyApproved: string | undefined,
): ContactFormConfiguration {
	const id = formId?.trim() ?? '';
	const notice = privacyNotice?.trim() ?? '';
	if (!/^[A-Za-z0-9]{6,}$/.test(id) || !notice || privacyApproved !== 'true')
		return {};
	return { endpoint: `https://formspree.io/f/${id}`, privacyNotice: notice };
}

export const contactFormConfiguration = resolveContactFormConfiguration(
	import.meta.env.PUBLIC_FORMSPREE_FORM_ID,
	import.meta.env.PUBLIC_CONTACT_PRIVACY_NOTICE,
	import.meta.env.PUBLIC_CONTACT_PRIVACY_APPROVED,
);
