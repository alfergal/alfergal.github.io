import type { Page } from '@playwright/test';

// Check rendered UI, including generated content. Scientific notation, code,
// plot geometry and functional controls are not decorative separators.
export async function designViolations(page: Page) {
	return page.evaluate(() => {
		const violations: string[] = [];
		const technical = 'svg, math, .katex, pre code, .astro-code .line';
		const controls =
			'table, input, button, select, textarea, temperature-explorer, image-comparison';
		const visible = (el: Element) =>
			el.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true });
		const identify = (el: Element) =>
			`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.getAttribute('class') ? '.' + el.getAttribute('class')!.trim().replace(/\s+/g, '.') : ''}`;
		const walker = document.createTreeWalker(
			document.body,
			NodeFilter.SHOW_TEXT,
		);
		while (walker.nextNode()) {
			const node = walker.currentNode;
			const parent = node.parentElement!;
			if (
				node.textContent?.includes('\u00b7') &&
				!parent.closest(`${technical}, script, style`) &&
				visible(parent)
			)
				violations.push('middle-dot: ' + identify(parent));
		}
		for (const el of document.body.querySelectorAll('*')) {
			if (!visible(el) || el.closest(technical)) continue;
			const css = getComputedStyle(el);
			const exempt = el.closest(controls);
			if (
				el.matches('hr, [role="separator"]:not([aria-orientation="vertical"])')
			)
				violations.push('separator: ' + identify(el));
			if (!exempt) {
				const rect = el.getBoundingClientRect();
				if (
					css.backgroundImage.includes('gradient(') &&
					rect.height <= 4 &&
					rect.width >= 24
				)
					violations.push('gradient-line: ' + identify(el));
				const horizontalBorder =
					parseFloat(css.borderTopWidth) > 0 ||
					parseFloat(css.borderBottomWidth) > 0;
				const sideBorder =
					parseFloat(css.borderLeftWidth) > 0 ||
					parseFloat(css.borderRightWidth) > 0;
				if (
					horizontalBorder &&
					(!sideBorder ||
						el.matches('section, header, footer, nav, .post-card'))
				)
					violations.push('horizontal-border: ' + identify(el));
			}
			for (const pseudo of ['::before', '::after']) {
				const style = getComputedStyle(el, pseudo);
				if (
					style.content === 'none' ||
					style.content === 'normal' ||
					style.display === 'none' ||
					style.visibility === 'hidden'
				)
					continue;
				if (style.content.includes('\u00b7'))
					violations.push('middle-dot: ' + identify(el) + pseudo);
				if (
					!exempt &&
					(parseFloat(style.borderTopWidth) > 0 ||
						parseFloat(style.borderBottomWidth) > 0 ||
						(parseFloat(style.height) <= 4 &&
							parseFloat(style.width) >= 24 &&
							(style.backgroundImage !== 'none' ||
								style.backgroundColor !== 'rgba(0, 0, 0, 0)')))
				)
					violations.push('pseudo-line: ' + identify(el) + pseudo);
			}
		}
		for (const svg of document.querySelectorAll('svg')) {
			const rect = svg.getBoundingClientRect();
			if (
				visible(svg) &&
				rect.height <= 4 &&
				rect.width >= 24 &&
				!svg.closest('figure, .katex, button, .reading-progress')
			)
				violations.push('svg-line: ' + identify(svg));
		}
		return violations;
	});
}
