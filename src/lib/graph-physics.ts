import {
	forceLink,
	forceSimulation,
	forceX,
	forceY,
	type SimulationNodeDatum,
	type SimulationLinkDatum,
} from 'd3-force';

export interface GraphNode extends SimulationNodeDatum {
	id: number;
	x: number;
	y: number;
	vx: number;
	vy: number;
	homeX: number;
	homeY: number;
	radius: number;
}
export interface GraphLink extends SimulationLinkDatum<GraphNode> {
	source: GraphNode;
	target: GraphNode;
	distance: number;
}

// All dimensions are SVG units. Rest lengths and anchors preserve the existing graph.
export function boundedPosition(node: GraphNode, x: number, y: number) {
	const dx = x - node.homeX;
	const dy = y - node.homeY;
	const scale = Math.min(1, 105 / Math.max(1, Math.hypot(dx, dy)));
	const padding = node.radius + 12;
	return {
		x: Math.max(padding, Math.min(520 - padding, node.homeX + dx * scale)),
		y: Math.max(padding, Math.min(400 - padding, node.homeY + dy * scale)),
	};
}

export function createGraphPhysics(nodes: GraphNode[], links: GraphLink[]) {
	// Tick manually: D3's timer stays stopped, including while the SVG is idle.
	const simulation = forceSimulation(nodes)
		.stop()
		.alpha(1)
		.alphaDecay(0)
		.velocityDecay(0.36)
		.force(
			'links',
			forceLink<GraphNode, GraphLink>(links)
				.distance((link) => link.distance)
				.strength(0.22)
				.iterations(2),
		)
		.force('home-x', forceX<GraphNode>((node) => node.homeX).strength(0.055))
		.force('home-y', forceY<GraphNode>((node) => node.homeY).strength(0.055))
		.force('velocity-limit', () => {
			// Clamp before D3 integrates positions, not just after a large step.
			for (const node of nodes) {
				const factor = Math.min(
					1,
					8 / Math.max(1, Math.hypot(node.vx, node.vy)),
				);
				node.vx *= factor;
				node.vy *= factor;
			}
		});

	return {
		tick() {
			simulation.tick();
			let settled = true;
			for (const node of nodes) {
				const speed = Math.hypot(node.vx, node.vy);
				if (speed > 5.5) {
					node.vx *= 5.5 / speed;
					node.vy *= 5.5 / speed;
				}
				const position = boundedPosition(node, node.x, node.y);
				if (position.x !== node.x) node.vx = 0;
				if (position.y !== node.y) node.vy = 0;
				Object.assign(node, position);
				if (
					Math.hypot(node.x - node.homeX, node.y - node.homeY) > 0.06 ||
					speed > 0.03
				)
					settled = false;
			}
			return settled;
		},
		stop: () => simulation.stop(),
	};
}
