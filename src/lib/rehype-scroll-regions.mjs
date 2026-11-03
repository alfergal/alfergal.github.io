/** Make native overflow regions keyboard-scrollable, including without JavaScript.
 * No wrappers or layout changes: the existing prose CSS provides scrolling.
 */
export default function rehypeScrollRegions() {
	return (tree) => {
		const walk = (node) => {
			if (node.type === 'element') {
				const classes = node.properties?.className ?? [];
				if (
					node.tagName === 'table' ||
					(node.tagName === 'span' && classes.includes('katex-display'))
				) {
					node.properties ??= {};
					node.properties.tabIndex = 0;
				}
			}
			for (const child of node.children ?? []) walk(child);
		};
		walk(tree);
	};
}
