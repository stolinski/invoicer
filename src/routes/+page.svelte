<script lang="ts">
	import { sample_row, initialFormState as initial_data } from './data';
	import { db, type IInvoice } from './db';

	let status: 'LOADING' | 'READY' | 'CREATING' | 'CHANGING' = $state('LOADING');
	let all_invoices: IInvoice[] = $state([]);
	let selected_id: number | null = $state(null);
	let form_data: typeof initial_data = $state(structuredClone(initial_data));

	function add() {
		form_data.items.push({ ...sample_row });
	}

	function remove() {
		form_data.items = form_data.items.slice(0, -1);
	}

	// Function to save the current form state
	async function save_form_state(form: typeof initial_data) {
		if (status !== 'READY') return;
		if (selected_id) {
			// Update existing invoice
			await db.invoices.update(selected_id, {
				date: new Date().toISOString(),
				formState: form
			});
		} else {
			// Create new invoice
			const newInvoice = await db.invoices.add({
				date: new Date().toISOString(),
				formState: form
			});
			selected_id = newInvoice;
		}
		await load_all_invoices();
	}

	// Function to load the most recent form state
	async function load_recent_invoice() {
		const most_recent = await db.invoices.orderBy('date').last();
		if (most_recent) {
			form_data = most_recent.formState;
			selected_id = most_recent.id!;
		}
		status = 'READY';
	}

	// Function to load saved states
	async function load_all_invoices() {
		all_invoices = await db.invoices.orderBy('date').reverse().toArray();
	}

	// Explain why we aren't binding the id
	// Function to load a specific state
	async function load_state(event: Event) {
		const selectElement = event.target as HTMLSelectElement;
		const selectedId = selectElement.value ? parseInt(selectElement.value, 10) : null;

		if (selectedId !== selected_id) {
			status = 'CHANGING';
			if (selectedId === null) {
				// No invoice selected, reset to initial state
				form_data = structuredClone(initial_data);
			} else {
				const selectedState = await db.invoices.get(selectedId);
				if (selectedState) {
					form_data = selectedState.formState;
				} else {
					console.error('Selected invoice not found');
					form_data = structuredClone(initial_data);
				}
			}
			selected_id = selectedId;
			status = 'READY';
		}
	}

	// Function to create a new invoice
	function new_invoice() {
		status = 'CREATING';
		selected_id = null;
		form_data = structuredClone(initial_data);
		status = 'READY';
	}

	async function export_to_json() {
		try {
			// Fetch all invoices from the database
			const allInvoices = await db.invoices.toArray();

			// Convert the data to a JSON string
			const jsonString = JSON.stringify(allInvoices, null, 2);

			// Create a Blob with the JSON data
			const blob = new Blob([jsonString], { type: 'application/json' });

			// Create a temporary URL for the Blob
			const url = URL.createObjectURL(blob);

			// Create a link element and trigger the download
			const link = document.createElement('a');
			link.href = url;
			link.download = 'invoice_database_export.json';
			document.body.appendChild(link);
			link.click();

			// Clean up
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Error exporting database:', error);
			alert('An error occurred while exporting the database. Please try again.');
		}
	}

	function get_select_display(state: IInvoice) {
		let date = new Date(state.date).toLocaleString();
		let name = null;
		if (state.formState.invoice) name = '#' + state.formState.invoice;
		if (state.formState.billTo.name) name += ' ' + state.formState.billTo.name;
		return name ?? date;
	}

	$effect(() => {
		load_recent_invoice();
		load_all_invoices();
	});

	$effect(() => {
		if (status === 'READY') {
			save_form_state($state.snapshot(form_data));
		}
	});
</script>

<header>
	<h1>Invoicer</h1>
	<div class="options">
		<label class="visible" for="currency">Currency:</label>
		<select name="currency" id="currency" bind:value={form_data.currency}>
			<option value="$">$</option>
			<option value="€">€</option>
		</select>
		<button onclick={new_invoice}>New Invoice</button>
		<select value={selected_id} onchange={load_state}>
			<option value={null}>Select a saved invoice</option>
			{#each all_invoices as state}
				<option value={state.id}>{get_select_display(state)}</option>
			{/each}
		</select>
		<button onclick={export_to_json}>Export All Invoices as JSON</button>
	</div>
</header>

<section>
	<div class="flex space-between">
		<div>
			<div>
				<label for="biz">Business</label>
				<input
					bind:value={form_data.biz}
					type="text"
					id="biz"
					name="biz"
					placeholder="Company Name"
				/>
			</div>
			<div>
				<label for="name">Name</label>
				<input
					bind:value={form_data.name}
					type="text"
					id="name"
					name="name"
					placeholder="Your Name"
				/>
			</div>
			<div>
				<label for="address">Address</label>
				<textarea
					bind:value={form_data.address}
					id="address"
					name="address"
					placeholder="Your Address"
				></textarea>
			</div>
		</div>

		<div class="zone invoice">
			<div class="inline">
				<label for="invoice">Invoice #:</label>
				<input
					bind:value={form_data.invoice}
					type="text"
					id="invoice"
					name="invoice"
					placeholder="0000"
				/>
			</div>
			<div class="inline">
				<label for="invoice-date">Date:</label>
				<input
					bind:value={form_data.invoiceDate}
					type="date"
					id="invoice-date"
					name="invoice-date"
				/>
			</div>
			<div class="inline">
				<label for="due">Due Date:</label>
				<input bind:value={form_data.due} type="date" id="due" name="due" />
			</div>
		</div>
	</div>

	<div class="flex close">
		<div class="zone" class:inactive={!form_data.billTo.active}>
			<h3>Bill To</h3>
			<button
				onclick={() => (form_data.billTo.active = !form_data.billTo.active)}
				class="activate control">{form_data.billTo.active ? 'Deactivate' : 'Activate'}</button
			>

			<div>
				<label for="name">Name</label>
				<input
					bind:value={form_data.billTo.name}
					type="text"
					id="name"
					name="name"
					placeholder="Their Name"
				/>
			</div>
			<div>
				<label for="address">Address</label>
				<textarea
					bind:value={form_data.billTo.address}
					id="address"
					name="address"
					placeholder="Their Address"
				></textarea>
			</div>
		</div>

		<div class="zone" class:inactive={!form_data.shipTo.active}>
			<h3>Ship To</h3>
			<button
				onclick={() => (form_data.shipTo.active = !form_data.shipTo.active)}
				class="activate control">{form_data.shipTo.active ? 'Deactivate' : 'Activate'}</button
			>
			<div>
				<label for="ship-name">Name</label>
				<input
					bind:value={form_data.shipTo.name}
					type="text"
					id="ship-name"
					name="ship-name"
					placeholder="Their Name"
				/>
			</div>
			<div>
				<label for="ship-address">Address</label>
				<textarea
					bind:value={form_data.shipTo.address}
					id="ship-address"
					name="ship-address"
					placeholder="Their Address"
				></textarea>
			</div>
		</div>
	</div>

	<h3>Items</h3>
	<table>
		<thead>
			<tr>
				<th style="width: 40px;">QTY</th>
				<th>Description</th>
				<th style="width: 100px;">Price</th>
				<th style="width: 100px;">Amount</th>
			</tr>
		</thead>
		<tbody>
			{#each form_data.items as item, i ('item-' + i)}
				<tr>
					<td>
						<label for="qty-{i}">QTY</label>
						<input
							bind:value={form_data.items[i].qty}
							type="number"
							id="qty-{i}"
							name="qty-{i}"
							placeholder="QTY"
						/>
					</td>
					<td>
						<label for="description-{i}">Description</label>
						<input
							bind:value={form_data.items[i].description}
							type="text"
							id="description-{i}"
							name="description-{i}"
							placeholder="Description"
						/>
					</td>
					<td>
						<div class="inline">
							<label for="price-{i}">Price</label>
							{form_data.currency}<input
								bind:value={form_data.items[i].price}
								type="number"
								id="price-{i}"
								name="price-{i}"
								placeholder="Price"
							/>
						</div>
					</td>
					<td>
						<div class="inline">
							<label for="amount-{i}">Amount</label>
							{form_data.currency}<input
								readonly
								value={item.qty * item.price}
								type="number"
								id="amount-{i}"
								name="amount-{i}"
								placeholder="Amount"
							/>
						</div>
					</td>
				</tr>
			{/each}
			<tr class="control">
				<td style="text-align: center;" colspan="4">
					<button onclick={add}>+</button>
					<button onclick={remove}>-</button>
				</td>
			</tr>

			<tr class="total">
				<td style="text-align: right;" colspan="3">Total</td>
				<td>{form_data.currency} {form_data.items.reduce((a, b) => a + b.qty * b.price, 0)}</td>
			</tr>
		</tbody>
	</table>

	<label for="notes">Notes</label>
	<textarea id="notes" name="notes" placeholder="Notes"></textarea>
</section>

<style>
	label {
		display: none;
	}

	section {
		padding: 20px;
		border-radius: 10px;
		background: linear-gradient(to bottom, #ffffff, var(--sheet));
		box-shadow:
			rgba(0, 0, 0, 0.16) 0px 10px 36px 0px,
			rgba(0, 0, 0, 0.06) 0px 0px 0px 1px;
	}

	.flex {
		display: flex;
		gap: 40px;
		margin-bottom: 2rem;
		&.space-between {
			justify-content: space-between;
		}
		&.close {
			justify-content: start;
		}
	}

	table {
		width: 100%;
		border: 1px solid var(--200);
		border-radius: 4px;
	}

	table,
	table input {
		font-size: var(--fs-xxs);
	}

	th {
		padding: 10px;
		text-align: left;
	}

	td {
		padding: 10px;
	}

	tbody tr {
		box-shadow: 0 -1px 0 0 var(--200);
		height: 40px;
	}

	.inactive {
		opacity: 0.1;
		&:hover {
			opacity: 1;
		}
	}

	input,
	textarea {
		font-size: var(--fs-base);
		padding: 5px 0;
		border-bottom: solid 1px #aaaaaa00;
		transition: border 0.2s ease-in-out;
		&:focus,
		&:hover {
			border-bottom: solid 1px var(--400);
		}
	}

	.activate {
		position: absolute;
		top: 0;
		right: 0;
	}

	.zone {
		position: relative;
	}

	input,
	textarea {
		width: 100%;
		border: none;
	}

	.invoice label {
		display: block;
		flex-shrink: 0;
	}

	.inline {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		justify-self: start;
		gap: 10px;
	}

	.invoice .inline {
		display: grid;
		grid-template-columns: 1fr 1fr;
		& > :first-child {
			justify-self: end;
		}
	}

	#notes {
		font-size: var(--fs-xxs);
		margin-top: 2rem;
	}
	.total {
		font-weight: bold;
		font-size: var(--fs-xs);
	}

	.visible {
		display: inline-block;
	}
	.options {
		margin-bottom: 2rem;
	}
</style>
