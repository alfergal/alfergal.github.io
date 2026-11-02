import type { GraphLink, GraphNode } from './graph-physics';

// Bounded, deterministic low-frequency motion; no D3 ticks while physics is idle.
export function createGraphAmbient(
	svg: SVGSVGElement,
	nodes: GraphNode[],
	links: GraphLink[],
	render: () => void,
	manual: () => boolean,
) {
	const offsets = nodes.map(() => ({ x: 0, y: 0 }));
	const dots = [...svg.querySelectorAll<SVGCircleElement>('.graph-dot')];
	const edges = [...svg.querySelectorAll<SVGLineElement>('.graph-edge')];
	const illuminated = new Set<SVGLineElement>();
	const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	layer.classList.add('graph-ambient');
	layer.setAttribute('aria-hidden', 'true');
	const signals = Array.from({ length: 2 }, () => {
		const dot = document.createElementNS(layer.namespaceURI, 'circle');
		dot.setAttribute('r', '1.5');
		dot.setAttribute('fill', 'var(--accent)');
		dot.setAttribute('opacity', '0');
		layer.append(dot);
		return dot;
	});
	svg.append(layer);
	let frame = 0,
		previous = 0,
		elapsed = 0,
		strength = 1;
	const draw = (time: number) => {
		frame = 0;
		if (previous && time - previous < 32) {
			frame = requestAnimationFrame(draw);
			return;
		}
		const delta = previous ? Math.min(time - previous, 64) : 0;
		previous = time;
		elapsed += delta;
		const t = elapsed / 1000;
		strength += ((manual() ? 0 : 1) - strength) * 0.045;
		offsets.forEach((offset, i) => {
			const phase = i * 2.399963;
			// Ramp in at mount/resume. Different incommensurate frequencies prevent lockstep.
			const ramp = Math.min(1, elapsed / 2400) * strength;
			offset.x =
				(Math.sin(t * (0.21 + (i % 7) * 0.009) + phase) +
					Math.sin(t * 0.137 + phase * 0.7) * 0.35) *
				1.45 *
				ramp;
			offset.y =
				Math.cos(t * (0.18 + (i % 5) * 0.011) + phase * 1.13) * 1.7 * ramp;
			if (i % 4 === 0) {
				const glow = (1 + Math.sin(t * (0.33 + (i % 9) * 0.017) + phase)) / 2;
				dots[i].style.setProperty(
					'--ambient-opacity',
					String(Number(dots[i].getAttribute('opacity')) + glow * 0.1),
				);
				dots[i].style.setProperty('--ambient-glow', `${glow * 1.6}px`);
			}
		});
		illuminated.forEach((edge) => edge.style.removeProperty('opacity'));
		illuminated.clear();
		signals.forEach((signal, i) => {
			const period = 7 + i * 2.37;
			const cycle = Math.floor((t + i * 3.9) / period);
			const fraction = ((t + i * 3.9) % period) / (2.8 + (cycle % 3) * 0.3);
			const index = (cycle * 47 + i * 139) % links.length;
			const link = links[index];
			if (fraction < 1 && !edges[index].hasAttribute('data-active')) {
				edges[index].style.opacity = String(
					Number(edges[index].getAttribute('opacity')) +
						Math.sin(fraction * Math.PI) * 0.1 * strength,
				);
				illuminated.add(edges[index]);
			}
			const source = offsets[link.source.id],
				target = offsets[link.target.id];
			const amount = Math.min(1, fraction);
			signal.setAttribute(
				'cx',
				String(
					link.source.x +
						source.x +
						(link.target.x + target.x - link.source.x - source.x) * amount,
				),
			);
			signal.setAttribute(
				'cy',
				String(
					link.source.y +
						source.y +
						(link.target.y + target.y - link.source.y - source.y) * amount,
				),
			);
			signal.setAttribute(
				'opacity',
				String(
					fraction < 1 ? Math.sin(fraction * Math.PI) * 0.5 * strength : 0,
				),
			);
		});
		render();
		frame = requestAnimationFrame(draw);
	};
	return {
		offsets,
		start() {
			if (!frame) {
				previous = 0;
				svg.dataset.ambient = 'running';
				frame = requestAnimationFrame(draw);
			}
		},
		pause() {
			cancelAnimationFrame(frame);
			frame = 0;
			previous = 0;
			svg.dataset.ambient = 'paused';
		},
		clear() {
			elapsed = 0;
			strength = 1;
			illuminated.forEach((edge) => edge.style.removeProperty('opacity'));
			illuminated.clear();
			offsets.forEach((offset) => {
				offset.x = offset.y = 0;
			});
			dots.forEach((dot) => {
				dot.style.removeProperty('--ambient-opacity');
				dot.style.removeProperty('--ambient-glow');
			});
			signals.forEach((signal) => signal.setAttribute('opacity', '0'));
		},
		destroy() {
			cancelAnimationFrame(frame);
			layer.remove();
		},
	};
}
