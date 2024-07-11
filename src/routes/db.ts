import Dexie from 'dexie';
import type { initialFormState } from './data';

// Define the database
class InvoiceDB extends Dexie {
	invoices: Dexie.Table<IInvoice, number>;

	constructor() {
		super('InvoiceDB');
		this.version(1).stores({
			invoices: '++id, date'
		});
		this.invoices = this.table('invoices');
	}
}

export const db = new InvoiceDB();

export interface IInvoice {
	id?: number;
	date: string;
	formState: typeof initialFormState;
}
