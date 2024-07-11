export const sample_row = {
	qty: 1,
	description: '',
	price: 0
};

// Define the initial form state
export const initialFormState = {
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
