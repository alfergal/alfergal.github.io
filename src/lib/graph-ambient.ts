import type { GraphLink, GraphNode } from './graph-physics';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Ambient motion never rewrites node/edge geometry or starts a JS frame loop.
// The entire SVG drifts by less than a pixel; only two nodes pulse in opacity.
export function createGraphAmbient(
	svg: SVGSVGElement,
	nodes: GraphNode[],
	links: GraphLink[],
) {
	const dots = [...svg.querySelectorAll<SVGCircleElement>('.graph-dot')];
	const animations: Animation[] = [];
	let timer: ReturnType<typeof setTimeout> | undefined;
	let signal: SVGLineElement | undefined;
	let signalAnimation: Animation | undefined;
	let layer: SVGGElement | undefined;
	let active = false;
	let cycle = 0;
	const cancelSignal = () => {
		clearTimeout(timer);
		timer = undefined;
		signalAnimation?.cancel();
		signalAnimation = undefined;
		signal?.remove();
		signal = undefined;
	};
	const scheduleSignal = (delay: number) => {
		timer = setTimeout(() => {
			timer = undefined;
			if (!active) return;
			const link = links[(cycle * 37) % links.length];
			cycle++;
			layer ??= document.createElementNS(SVG_NS, 'g');
			layer.classList.add('graph-ambient');
			layer.setAttribute('aria-hidden', 'true');
			if (!layer.isConnected) svg.append(layer);
			const line = document.createElementNS(SVG_NS, 'line');
			const length = Math.hypot(
				link.source.homeX - link.target.homeX,
				link.source.homeY - link.target.homeY,
			);
			for (const [name, value] of Object.entries({
				x1: link.source.homeX,
				y1: link.source.homeY,
				x2: link.target.homeX,
				y2: link.target.homeY,
				stroke: 'var(--accent)',
				'stroke-width': 1.1,
				'stroke-dasharray': `6 ${length + 6}`,
			}))
				line.setAttribute(name, String(value));
			layer.append(line);
			signal = line;
			const animation = line.animate(
				[
					{ strokeDashoffset: '6', opacity: 0 },
					{ opacity: 0.35, offset: 0.35 },
					{ strokeDashoffset: String(-length), opacity: 0 },
				],
				{ duration: 1800, easing: 'linear' },
			);
			signalAnimation = animation;
			void animation.finished
				.catch(() => {})
				.then(() => {
					line.remove();
					if (signal === line) {
						signal = undefined;
						signalAnimation = undefined;
					}
				});
			if (active) scheduleSignal(8500 + (cycle % 3) * 1700);
		}, delay);
	};
	const pause = () => {
		active = false;
		animations.forEach((animation) => animation.pause());
		cancelSignal();
		if (svg.dataset.ambient !== 'paused') svg.dataset.ambient = 'paused';
	};
	const clear = () => {
		pause();
		animations.forEach((animation) => animation.cancel());
		animations.length = 0;
		layer?.remove();
		layer = undefined;
	};
	return {
		start() {
			if (active) return;
			active = true;
			if (!animations.length) {
				animations.push(
					svg.animate(
						[
							{ transform: 'translate(0px, 0px)' },
							{ transform: 'translate(0.65px, -0.8px)', offset: 0.4 },
							{ transform: 'translate(-0.5px, 0.45px)', offset: 0.75 },
							{ transform: 'translate(0px, 0px)' },
						],
						{ duration: 20000, iterations: Infinity, easing: 'ease-in-out' },
					),
				);
				for (const [index, duration] of [
					[0, 11000],
					[Math.floor(nodes.length / 2), 13700],
				]) {
					const opacity = Number(dots[index].getAttribute('opacity'));
					animations.push(
						dots[index].animate(
							[
								{ opacity },
								{ opacity, offset: 0.45 },
								{ opacity: Math.min(1, opacity + 0.14), offset: 0.65 },
								{ opacity },
							],
							{ duration, iterations: Infinity, easing: 'ease-in-out' },
						),
					);
				}
			} else animations.forEach((animation) => animation.play());
			svg.dataset.ambient = 'running';
			scheduleSignal(1200);
		},
		pause,
		clear,
		destroy: clear,
	};
}
