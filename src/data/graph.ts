// A sparse sample of the existing five-cluster layout, with a connected backbone.
export const graphNodes = Array.from({ length: 48 }, (_, id) => {
	const original = Math.round((id * 91) / 47);
	const group = original % 5;
	const angle = original * 2.399963;
	const radius = 16 + Math.sqrt(Math.floor(original / 5)) * 15;
	const centers = [
		[188, 122],
		[318, 148],
		[266, 270],
		[132, 278],
		[385, 279],
	];
	return {
		id,
		x: 260 + (centers[group][0] + Math.cos(angle) * radius - 260) * 1.1,
		y: 200 + (centers[group][1] + Math.sin(angle) * radius * 0.8 - 200) * 1.1,
		r: original % 13 === 0 ? 5 : original % 4 === 0 ? 3.4 : 2.1,
		accent: group === 1 || group === 4,
	};
});
const candidates = graphNodes
	.flatMap((a, i) =>
		graphNodes.slice(i + 1).map((b) => ({
			a,
			b,
			distance: Math.hypot(a.x - b.x, a.y - b.y),
		})),
	)
	.sort(
		(left, right) =>
			left.distance - right.distance ||
			left.a.id - right.a.id ||
			left.b.id - right.b.id,
	);
const parent = graphNodes.map((node) => node.id);
const find = (id: number): number =>
	parent[id] === id ? id : (parent[id] = find(parent[id]));
const edges: typeof candidates = [];
const degree = graphNodes.map(() => 0);
const selected = new Set<(typeof candidates)[number]>();
const add = (edge: (typeof candidates)[number]) => {
	edges.push(edge);
	selected.add(edge);
	degree[edge.a.id]++;
	degree[edge.b.id]++;
};
// Kruskal's tree prevents isolated clusters; short extra links balance density.
for (const edge of candidates) {
	const a = find(edge.a.id),
		b = find(edge.b.id);
	if (a !== b) {
		parent[a] = b;
		add(edge);
	}
}
for (const edge of candidates) {
	if (edges.length >= 108) break;
	if (!selected.has(edge) && degree[edge.a.id] < 6 && degree[edge.b.id] < 6)
		add(edge);
}
export const graphEdges = edges;
