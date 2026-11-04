interface NodePosition {
	id: string;
	x: number;
	y: number;
}

interface Candidate {
	u: string;
	v: string;
	kirchhoff: number;
	lambda2: number;
	resistances: number[][];
}

interface GraphData {
	nodes: NodePosition[];
	edges: [string, string][];
	kirchhoff: number;
	lambda2: number;
	resistances: number[][];
	candidates: Candidate[];
}

const format = (value: number) =>
	value.toLocaleString('es-ES', {
		minimumFractionDigits: 3,
		maximumFractionDigits: 3,
	});
const change = (before: number, after: number) => {
	if (Math.abs(before) < Number.EPSILON) return '0,0 %';
	const percent = ((after - before) / before) * 100;
	const sign = percent < -0.00005 ? '−' : percent > 0.00005 ? '+' : '';
	return `${sign}${Math.abs(percent).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
};

class EffectiveResistanceExplorer extends HTMLElement {
	#data: GraphData;
	#selectU: HTMLSelectElement;
	#selectV: HTMLSelectElement;
	#addButton: HTMLButtonElement;
	#resetButton: HTMLButtonElement;
	#status: HTMLElement;
	#addedLine: SVGLineElement;
	#description: SVGDescElement;
	#added: Candidate | undefined;
	#initialU: string;
	#initialV: string;

	constructor() {
		super();
		this.#data = JSON.parse(this.dataset.graph ?? '{}') as GraphData;
		this.#selectU = this.querySelector('[data-node-u]')!;
		this.#selectV = this.querySelector('[data-node-v]')!;
		this.#addButton = this.querySelector('[data-add]')!;
		this.#resetButton = this.querySelector('[data-reset]')!;
		this.#status = this.querySelector('[data-status]')!;
		this.#addedLine = this.querySelector('[data-added-edge]')!;
		this.#description = this.querySelector('[data-description]')!;
		this.#initialU = this.dataset.initialU ?? 'A';
		this.#initialV = this.dataset.initialV ?? 'H';
	}

	connectedCallback() {
		this.#selectU.disabled = false;
		this.#selectV.disabled = false;
		this.#resetButton.disabled = false;
		this.#selectU.addEventListener('change', this.#refresh);
		this.#selectV.addEventListener('change', this.#refresh);
		this.#addButton.addEventListener('click', this.#add);
		this.#resetButton.addEventListener('click', this.#reset);
		this.#refresh();
	}

	disconnectedCallback() {
		this.#selectU.removeEventListener('change', this.#refresh);
		this.#selectV.removeEventListener('change', this.#refresh);
		this.#addButton.removeEventListener('click', this.#add);
		this.#resetButton.removeEventListener('click', this.#reset);
	}

	#refresh = () => {
		const u = this.#selectU.value;
		const v = this.#selectV.value;
		const index = new Map(
			this.#data.nodes.map((node, position) => [node.id, position]),
		);
		const edge = [u, v].sort();
		const alreadyExists = this.#data.edges.some(
			([left, right]) =>
				(left === edge[0] && right === edge[1]) ||
				(left === edge[1] && right === edge[0]),
		);
		const candidate = this.#data.candidates.find(
			(item) => item.u === edge[0] && item.v === edge[1],
		);
		this.#addButton.disabled = Boolean(
			this.#added || alreadyExists || !candidate || u === v,
		);
		if (!this.#added) {
			this.#status.textContent = alreadyExists
				? `La arista ${u}–${v} ya existe. Prueba otra.`
				: u === v
					? 'Elige dos nodos distintos.'
					: 'Red inicial, sin cambios.';
		}
		this.querySelector('[data-pair-label]')!.textContent = `(${u}, ${v})`;
		this.querySelectorAll('[data-node]').forEach((node) => {
			node.classList.toggle(
				'is-selected',
				node.getAttribute('data-node') === u ||
					node.getAttribute('data-node') === v,
			);
		});

		const pairIndexU = index.get(u)!;
		const pairIndexV = index.get(v)!;
		const baselineResistance = this.#data.resistances[pairIndexU][pairIndexV];
		const current = this.#added ?? undefined;
		const currentResistance = current
			? current.resistances[pairIndexU][pairIndexV]
			: baselineResistance;
		this.#writeMetric(
			'resistance',
			format(baselineResistance),
			format(currentResistance),
		);
		this.#writeChange('resistance', baselineResistance, currentResistance);
		this.#writeMetric(
			'kirchhoff',
			format(this.#data.kirchhoff),
			format(current?.kirchhoff ?? this.#data.kirchhoff),
		);
		this.#writeChange(
			'kirchhoff',
			this.#data.kirchhoff,
			current?.kirchhoff ?? this.#data.kirchhoff,
		);
		this.#writeMetric(
			'lambda',
			format(this.#data.lambda2),
			format(current?.lambda2 ?? this.#data.lambda2),
		);
		this.#writeChange(
			'lambda',
			this.#data.lambda2,
			current?.lambda2 ?? this.#data.lambda2,
		);
	};

	#writeMetric(name: string, before: string, after: string) {
		this.querySelector(`[data-${name}]`)!.textContent = `${before} → ${after}`;
	}

	#writeChange(name: string, before: number, after: number) {
		this.querySelector(`[data-${name}-change]`)!.textContent = change(
			before,
			after,
		);
	}

	#add = () => {
		const edge = [this.#selectU.value, this.#selectV.value].sort();
		const candidate = this.#data.candidates.find(
			(item) => item.u === edge[0] && item.v === edge[1],
		);
		if (!candidate || this.#addButton.disabled) return;
		const nodes = new Map(this.#data.nodes.map((node) => [node.id, node]));
		const start = nodes.get(candidate.u)!;
		const end = nodes.get(candidate.v)!;
		this.#addedLine.setAttribute('x1', String(start.x));
		this.#addedLine.setAttribute('y1', String(start.y));
		this.#addedLine.setAttribute('x2', String(end.x));
		this.#addedLine.setAttribute('y2', String(end.y));
		this.#addedLine.setAttribute('display', 'inline');
		this.#added = candidate;
		this.#selectU.disabled = true;
		this.#selectV.disabled = true;
		this.#addButton.disabled = true;
		this.#status.textContent = `Añadida ${candidate.u}–${candidate.v}. Variación frente a la red inicial.`;
		this.#description.textContent = `La red inicial tiene una arista adicional entre ${candidate.u} y ${candidate.v}.`;
		this.#refresh();
	};

	#reset = () => {
		this.#added = undefined;
		this.#selectU.disabled = false;
		this.#selectV.disabled = false;
		this.#selectU.value = this.#initialU;
		this.#selectV.value = this.#initialV;
		this.#addedLine.setAttribute('display', 'none');
		this.#status.textContent = 'Red inicial, sin cambios.';
		this.#description.textContent =
			'Ocho nodos A a H forman dos ciclos conectados por la arista D-E. No hay una conexión adicional.';
		this.#refresh();
		this.#selectU.focus();
	};
}

if (!customElements.get('effective-resistance-explorer')) {
	customElements.define(
		'effective-resistance-explorer',
		EffectiveResistanceExplorer,
	);
}
