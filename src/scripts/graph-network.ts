import {
	boundedPosition,
	createGraphPhysics,
	type GraphNode,
	type GraphLink,
} from '../lib/graph-physics';
import { createGraphAmbient } from '../lib/graph-ambient';

const SVG_NS = 'http://www.w3.org/2000/svg';
const FRAME = 1000 / 60;

function mountGraph(svg: SVGSVGElement) {
	const abort = new AbortController();
	const { signal } = abort;
	const reduced = matchMedia('(prefers-reduced-motion: reduce)');
	const mobile = matchMedia('(max-width: 760px), (pointer: coarse)');
	const groups = [...svg.querySelectorAll<SVGGElement>('[data-node]')];
	const dots = groups.map((group) =>
		group.querySelector<SVGCircleElement>('.graph-dot')!,
	);
	const hits = groups.map((group) =>
		group.querySelector<SVGCircleElement>('.graph-hit')!,
	);
	const nodes: GraphNode[] = dots.map((dot, id) => ({
		id,
		x: +dot.getAttribute('cx')!,
		y: +dot.getAttribute('cy')!,
		homeX: +dot.getAttribute('cx')!,
		homeY: +dot.getAttribute('cy')!,
		radius: +dot.getAttribute('r')!,
		vx: 0,
		vy: 0,
	}));
	const lines = [...svg.querySelectorAll<SVGLineElement>('.graph-edge')];
	const links: GraphLink[] = lines.map((line) => {
		const source = nodes[+line.dataset.source!];
		const target = nodes[+line.dataset.target!];
		return {
			source,
			target,
			distance: Math.hypot(source.x - target.x, source.y - target.y),
		};
	});
	const effects = svg.querySelector<SVGGElement>('.graph-effects')!;
	const adjacency = nodes.map(
		() => [] as { line: SVGLineElement; x: string; y: string }[],
	);
	links.forEach(({ source, target }, i) => {
		adjacency[source.id].push({ line: lines[i], x: 'x1', y: 'y1' });
		adjacency[target.id].push({ line: lines[i], x: 'x2', y: 'y2' });
	});
	let physics: ReturnType<typeof createGraphPhysics> | undefined;
	let frame = 0;
	let previousTime = 0;
	let accumulator = 0;
	let quietFrames = 0;
	let started = 0;
	let selected = 0;
	let hover: number | undefined;
	let keyboardNode: GraphNode | undefined;
	let drag:
		| {
				pointer: number;
				node: GraphNode;
				x: number;
				y: number;
				offsetX: number;
				offsetY: number;
				moved: boolean;
		  }
		| undefined;
	const animations = new Set<Animation>();
	const timers = new Set<ReturnType<typeof setTimeout>>();
	const pulseLines = new Map<
		SVGLineElement,
		{ source: GraphNode; target: GraphNode }
	>();
	let ambient: ReturnType<typeof createGraphAmbient> | undefined;
	let visible = false;
	let focused = true;

	const attributes = new WeakMap<SVGElement, Map<string, string>>();
	const setAttribute = (element: SVGElement, name: string, value: string) => {
		let cache = attributes.get(element);
		if (!cache) {
			cache = new Map();
			attributes.set(element, cache);
		}
		if ((cache.get(name) ?? element.getAttribute(name)) !== value)
			element.setAttribute(name, value);
		cache.set(name, value);
	};
	const coordinate = (value: number, home: number) =>
		value === home ? value : Math.round(value * 100) / 100;
	const setPosition = (
		element: SVGElement,
		node: GraphNode,
		x = 'cx',
		y = 'cy',
	) => {
		setAttribute(element, x, String(coordinate(node.x, node.homeX)));
		setAttribute(element, y, String(coordinate(node.y, node.homeY)));
	};
	const previousPositions = nodes.map((node) => ({ x: node.x, y: node.y }));
	const render = () => {
		for (const node of nodes) {
			const x = coordinate(node.x, node.homeX),
				y = coordinate(node.y, node.homeY);
			const previous = previousPositions[node.id];
			if (x === previous.x && y === previous.y) continue;
			previous.x = x;
			previous.y = y;
			setPosition(dots[node.id], node);
			setPosition(hits[node.id], node);
			for (const edge of adjacency[node.id])
				setPosition(edge.line, node, edge.x, edge.y);
		}
		pulseLines.forEach(({ source, target }, line) => {
			setPosition(line, source, 'x1', 'y1');
			setPosition(line, target, 'x2', 'y2');
		});
	};
	const reset = () => {
		cancelAnimationFrame(frame);
		frame = 0;
		previousTime = 0;
		accumulator = 0;
		quietFrames = 0;
		for (const node of nodes)
			Object.assign(node, {
				x: node.homeX,
				y: node.homeY,
				vx: 0,
				vy: 0,
				fx: null,
				fy: null,
			});
		render();

		svg.dataset.simulation = 'idle';
	};
	const step = (time: number) => {
		frame = 0;
		accumulator += previousTime ? Math.min(time - previousTime, 50) : FRAME;
		previousTime = time;
		let advanced = false;
		while (accumulator >= FRAME) {
			const settled = physics!.tick();
			quietFrames =
				settled && !drag?.moved && !keyboardNode ? quietFrames + 1 : 0;
			accumulator -= FRAME;
			advanced = true;
		}
		// Count equilibrium in physics steps, including on 120/144 Hz displays.
		if (advanced) render();
		// The guard also bounds recovery if future force tuning introduces a slow tail.
		if (quietFrames >= 6 || (!drag && !keyboardNode && time - started > 8000)) {
			reset();
			resume();
			return;
		}
		frame = requestAnimationFrame(step);
	};
	const wake = () => {
		if (reduced.matches || frame || document.hidden || !visible || !focused)
			return;
		ambient?.pause();
		physics ??= createGraphPhysics(nodes, links);
		previousTime = 0;
		quietFrames = 0;
		started = performance.now();
		svg.dataset.simulation = 'running';
		frame = requestAnimationFrame(step);
	};
	let highlighted: number | undefined;
	let near = false;
	const highlight = () => {
		const active =
			drag?.node.id ??
			hover ??
			(svg.hasAttribute('data-keyboard') ? selected : undefined);
		if (active !== highlighted) {
			if (highlighted !== undefined) {
				groups[highlighted].removeAttribute('data-active');
				adjacency[highlighted].forEach(({ line }) =>
					line.removeAttribute('data-active'),
				);
			}
			if (active !== undefined) {
				groups[active].setAttribute('data-active', '');
				adjacency[active].forEach(({ line }) =>
					line.setAttribute('data-active', ''),
				);
			}
			highlighted = active;
		}
		if (near !== (hover !== undefined)) {
			near = hover !== undefined;
			svg.toggleAttribute('data-near-node', near);
		}
	};
	let lastSelected: number | undefined;
	const select = (id: number) => {
		selected = id;
		if (lastSelected === id) return;
		if (lastSelected !== undefined)
			groups[lastSelected].removeAttribute('data-selected');
		groups[id].setAttribute('data-selected', '');
		lastSelected = id;
		svg.setAttribute(
			'aria-label',
			`Grafo interactivo. Nodo ${id + 1} de ${nodes.length}.`,
		);
	};
	const point = (event: PointerEvent) => {
		const matrix = svg.getScreenCTM();
		return matrix
			? new DOMPoint(event.clientX, event.clientY).matrixTransform(
					matrix.inverse(),
				)
			: null;
	};
	// Hit areas overlap on small screens: choose the visible point nearest to the input.
	// Squared distances avoid the repeated square roots of the old implementation.
	const nearest = (x: number, y: number) => {
		let best = nodes[0],
			distance = Infinity;
		for (const node of nodes) {
			const value = (node.x - x) ** 2 + (node.y - y) ** 2;
			if (value < distance) {
				best = node;
				distance = value;
			}
		}
		return best;
	};
	const timeout = (fn: () => void, delay: number) => {
		const timer = setTimeout(() => {
			timers.delete(timer);
			fn();
		}, delay);
		timers.add(timer);
	};
	const pulse = (node: GraphNode) => {
		if (reduced.matches) {
			groups[node.id].setAttribute('data-pressed', '');
			timeout(() => groups[node.id].removeAttribute('data-pressed'), 160);
			return;
		}
		// Keep rapid repeated clicks bounded; every temporary element is removed on completion.
		if (effects.childElementCount >= 1) return;
		ambient?.pause();
		timeout(resume, 600);
		const group = document.createElementNS(SVG_NS, 'g');
		effects.append(group);
		const pending: Promise<unknown>[] = [];
		const animate = (
			element: SVGElement,
			frames: Keyframe[],
			duration: number,
			delay = 0,
		) => {
			const animation = element.animate(frames, {
				duration,
				delay,
				easing: 'ease-out',
				fill: 'both',
			});
			animations.add(animation);
			pending.push(
				animation.finished
					.catch(() => {})
					.finally(() => animations.delete(animation)),
			);
		};
		const ring = (target: GraphNode, expansion: number, delay = 0) => {
			const circle = document.createElementNS(SVG_NS, 'circle');
			setPosition(circle, target);
			circle.setAttribute('fill', 'none');
			circle.setAttribute('stroke', 'var(--graph-accent)');
			circle.setAttribute('stroke-width', '1');
			group.append(circle);
			animate(
				circle,
				[
					{ r: `${target.radius + 1}px`, opacity: 0.55 },
					{ r: `${target.radius + expansion}px`, opacity: 0 },
				],
				440,
				delay,
			);
		};
		ring(node, 19);
		for (const link of links
			.filter((link) => link.source === node || link.target === node)
			.slice(0, mobile.matches ? 3 : 6)) {
			const target = link.source === node ? link.target : link.source;
			const line = document.createElementNS(SVG_NS, 'line');
			const length = Math.hypot(target.x - node.x, target.y - node.y);
			setPosition(line, node, 'x1', 'y1');
			setPosition(line, target, 'x2', 'y2');
			line.setAttribute('stroke', 'var(--accent)');
			line.setAttribute('stroke-width', '1.1');
			line.setAttribute('stroke-dasharray', `8 ${length + 8}`);
			group.append(line);
			pulseLines.set(line, { source: node, target });
			animate(
				line,
				[
					{ strokeDashoffset: '8', opacity: 0.6 },
					{ strokeDashoffset: String(-length), opacity: 0 },
				],
				340,
				40,
			);
			if (!mobile.matches) ring(target, 7, 190);
		}
		void Promise.all(pending).then(() => {
			group.querySelectorAll('line').forEach((line) => pulseLines.delete(line));
			group.remove();
		});
	};
	const releaseKeyboard = () => {
		if (!keyboardNode) return;
		keyboardNode.fx = null;
		keyboardNode.fy = null;
		keyboardNode = undefined;
		started = performance.now();
		if (reduced.matches) reset();
		else wake();
	};
	const finishDrag = (cancelled = false) => {
		if (!drag) return;
		const { node, pointer, moved } = drag;
		drag = undefined;
		if (svg.hasPointerCapture(pointer)) svg.releasePointerCapture(pointer);
		node.fx = null;
		node.fy = null;
		svg.removeAttribute('data-dragging');
		if (moved) {
			if (reduced.matches) reset();
			else {
				started = performance.now();
				wake();
			}
		} else if (!cancelled) pulse(node);
		else resume();
		highlight();
	};
	const moveNode = (node: GraphNode, x: number, y: number) => {
		const position = boundedPosition(node, x, y);
		node.fx = position.x;
		node.fy = position.y;
		// The grabbed node tracks the input immediately; neighbors are integrated by D3.
		node.x = position.x;
		node.y = position.y;
		node.vx = 0;
		node.vy = 0;
		render();
		wake();
	};

	svg.addEventListener(
		'pointerdown',
		(event) => {
			if (
				!event.isPrimary ||
				event.button !== 0 ||
				drag ||
				!(event.target instanceof Element) ||
				!event.target.closest('[data-node]')
			)
				return;
			const location = point(event);
			if (!location) return;
			releaseKeyboard();
			const node = nearest(location.x, location.y);
			ambient?.pause();
			select(node.id);
			svg.removeAttribute('data-keyboard');
			svg.focus({ preventScroll: true });
			drag = {
				pointer: event.pointerId,
				node,
				x: event.clientX,
				y: event.clientY,
				offsetX: node.x - location.x,
				offsetY: node.y - location.y,
				moved: false,
			};
			svg.setPointerCapture(event.pointerId);
			event.preventDefault();
			highlight();
		},
		{ signal },
	);
	svg.addEventListener(
		'pointermove',
		(event) => {
			if (!drag) {
				const group =
					event.target instanceof Element
						? event.target.closest<SVGGElement>('[data-node]')
						: null;
				const location = group ? point(event) : null;
				hover = location ? nearest(location.x, location.y).id : undefined;
				highlight();
				return;
			}
			const location = point(event);
			if (!location) return;
			if (drag) {
				if (event.pointerId !== drag.pointer) return;
				if (
					!drag.moved &&
					Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4
				)
					return;
				if (!drag.moved) svg.setAttribute('data-dragging', '');
				drag.moved = true;
				moveNode(
					drag.node,
					location.x + drag.offsetX,
					location.y + drag.offsetY,
				);
				return;
			}
		},
		{ signal },
	);
	svg.addEventListener(
		'pointerleave',
		() => {
			hover = undefined;
			highlight();
		},
		{ signal },
	);
	svg.addEventListener(
		'pointerup',
		(event) => {
			if (event.pointerId === drag?.pointer) finishDrag();
		},
		{ signal },
	);
	for (const type of ['pointercancel', 'lostpointercapture'] as const)
		svg.addEventListener(
			type,
			(event) => {
				if (event.pointerId === drag?.pointer) finishDrag(true);
			},
			{ signal },
		);
	svg.addEventListener(
		'keydown',
		(event) => {
			const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
			if (
				![...arrows, 'Home', 'End', 'Enter', ' ', 'Escape'].includes(event.key)
			)
				return;
			event.preventDefault();
			svg.setAttribute('data-keyboard', '');
			hover = undefined;
			if (event.key === 'Escape') {
				finishDrag(true);
				releaseKeyboard();
				reset();
				resume();
			} else if (event.key === 'Enter' || event.key === ' ') {
				if (!event.repeat) pulse(nodes[selected]);
			} else if (event.shiftKey && arrows.includes(event.key)) {
				keyboardNode = nodes[selected];
				moveNode(
					keyboardNode,
					keyboardNode.x +
						(event.key === 'ArrowRight'
							? 12
							: event.key === 'ArrowLeft'
								? -12
								: 0),
					keyboardNode.y +
						(event.key === 'ArrowDown'
							? 12
							: event.key === 'ArrowUp'
								? -12
								: 0),
				);
			} else {
				releaseKeyboard();
				select(
					event.key === 'Home'
						? 0
						: event.key === 'End'
							? nodes.length - 1
							: (selected +
									(event.key === 'ArrowLeft' || event.key === 'ArrowUp'
										? -1
										: 1) +
									nodes.length) %
								nodes.length,
				);
			}
			highlight();
		},
		{ signal },
	);
	svg.addEventListener(
		'keyup',
		(event) => {
			if (event.key.startsWith('Arrow') || event.key === 'Shift')
				releaseKeyboard();
		},
		{ signal },
	);
	svg.addEventListener(
		'focus',
		() => {
			if (svg.matches(':focus-visible')) svg.setAttribute('data-keyboard', '');
			highlight();
		},
		{ signal },
	);
	svg.addEventListener(
		'blur',
		() => {
			releaseKeyboard();
			svg.removeAttribute('data-keyboard');
			highlight();
		},
		{ signal },
	);
	const clearEffects = () => {
		animations.forEach((animation) => animation.cancel());
		animations.clear();
		timers.forEach(clearTimeout);
		timers.clear();
		effects.replaceChildren();
		pulseLines.clear();
		groups.forEach((group) => group.removeAttribute('data-pressed'));
	};
	const suspend = () => {
		ambient?.pause();
		finishDrag(true);
		releaseKeyboard();
		reset();
		clearEffects();
		hover = undefined;
		highlight();
	};
	const resume = () => {
		if (
			!reduced.matches &&
			!mobile.matches &&
			!frame &&
			!drag &&
			!keyboardNode &&
			visible &&
			focused &&
			!document.hidden
		)
			ambient?.start();
	};
	const policy = () => {
		suspend();
		svg.dataset.ambientPolicy = reduced.matches
			? 'reduced'
			: mobile.matches
				? 'static'
				: 'animated';
		if (reduced.matches || mobile.matches) {
			ambient?.clear();
			reset();
		}
		resume();
	};
	reduced.addEventListener('change', policy, { signal });
	mobile.addEventListener('change', policy, { signal });
	document.addEventListener(
		'visibilitychange',
		() => {
			if (document.hidden) suspend();
			else resume();
		},
		{ signal },
	);
	window.addEventListener(
		'blur',
		() => {
			focused = false;
			suspend();
		},
		{ signal },
	);
	window.addEventListener(
		'focus',
		() => {
			focused = true;
			resume();
		},
		{ signal },
	);
	const intersection = new IntersectionObserver(
		([entry]) => {
			visible = entry.isIntersecting;
			if (visible) resume();
			else suspend();
		},
		{ threshold: 0 },
	);
	intersection.observe(svg);
	const resize = new ResizeObserver(() => {
		const matrix = svg.getScreenCTM();
		if (!matrix) return;
		const scale = Math.hypot(matrix.a, matrix.b);
		if (!Number.isFinite(scale) || scale <= 0) return;
		const radius = (matchMedia('(pointer: coarse)').matches ? 14 : 12) / scale;
		hits.forEach((hit) => hit.setAttribute('r', String(radius)));
	});
	resize.observe(svg);
	svg.removeAttribute('aria-hidden');
	svg.setAttribute('role', 'group');
	svg.setAttribute('tabindex', '0');
	svg.setAttribute(
		'aria-description',
		'Flechas para recorrer los nodos. Intro o espacio para un destello. Mayúsculas y flechas para desplazar; suelta para recuperar la forma. Escape restablece el grafo.',
	);
	svg.dataset.ready = '';
	svg.dataset.simulation = 'idle';
	select(0);
	ambient = createGraphAmbient(svg, nodes, links);
	svg.dataset.ambient = 'paused';
	svg.dataset.ambientPolicy = reduced.matches
		? 'reduced'
		: mobile.matches
			? 'static'
			: 'animated';

	return () => {
		abort.abort();
		intersection.disconnect();
		ambient?.destroy();
		resize.disconnect();
		cancelAnimationFrame(frame);
		physics?.stop();
		clearEffects();
		drag = undefined;
		keyboardNode = undefined;
		reset();
		for (const attribute of [
			'data-dragging',
			'data-keyboard',
			'data-near-node',
			'data-ready',
		])
			svg.removeAttribute(attribute);
		for (const group of groups) {
			group.removeAttribute('data-active');
			group.removeAttribute('data-selected');
		}
	};
}

class ElasticGraph extends HTMLElement {
	private dispose?: () => void;
	connectedCallback() {
		const svg = this.querySelector<SVGSVGElement>('.graph-network');
		if (svg && !this.dispose) this.dispose = mountGraph(svg);
	}
	disconnectedCallback() {
		this.dispose?.();
		this.dispose = undefined;
	}
}
if (!customElements.get('elastic-graph'))
	customElements.define('elastic-graph', ElasticGraph);
