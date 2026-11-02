// Markdown blockquotes beginning with [!NOTE], etc.; MDX can also use Callout.astro.
export default function remarkCallouts() {
	const labels = {
		NOTE: 'Nota',
		IMPORTANT: 'Información importante',
		WARNING: 'Advertencia',
		TIP: 'Consejo',
		RESULT: 'Resultado experimental',
		LIMITATION: 'Limitación metodológica',
	};
	return (tree) => {
		const visit = (node) => {
			const first =
				node.type === 'blockquote' && node.children?.[0]?.children?.[0];
			const match =
				first?.type === 'text' &&
				first.value.match(
					/^\[!(NOTE|IMPORTANT|WARNING|TIP|RESULT|LIMITATION)\](?:\s|$)/,
				);
			if (match) {
				first.value = first.value.slice(match[0].length);
				node.data = {
					hName: 'aside',
					hProperties: {
						className: ['callout'],
						'data-kind': match[1].toLowerCase(),
						'aria-label': labels[match[1]],
					},
				};
				node.children.unshift({
					type: 'paragraph',
					data: { hProperties: { className: ['callout-title'] } },
					children: [{ type: 'text', value: labels[match[1]] }],
				});
			}
			node.children?.forEach(visit);
		};
		visit(tree);
	};
}
