export const sample_row = {
	qty: 1,
	description: '',
	price: 0
};

export const themes = [
	{ id: 'standard', label: 'Standard' },
	{ id: 'classic', label: 'Classic' },
	{ id: 'modern', label: 'Modern' },
	{ id: 'typewriter', label: 'Typewriter' }
] as const;

export type ThemeId = (typeof themes)[number]['id'];

// Define the initial form state
export const initialFormState = {
	theme: 'standard' as ThemeId,
	currency: '$',
	biz: '',
	name: '',
	address: '',
	invoice: '',
	invoiceDate: '',
	due: '',
	notes: '',
	billTo: {
		active: true,
		name: '',
		address: ''
	},
	shipTo: {
		active: false,
		name: '',
		address: ''
	},
	items: [{ ...sample_row }]
};

// Fill in any fields missing from invoices saved before they existed (e.g. theme)
export function hydrate(saved: Partial<typeof initialFormState>): typeof initialFormState {
	const base = structuredClone(initialFormState);
	return {
		...base,
		...saved,
		billTo: { ...base.billTo, ...saved.billTo },
		shipTo: { ...base.shipTo, ...saved.shipTo }
	};
}
