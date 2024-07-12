<script lang="ts">
	import { sample_row, initialFormState } from './data';
	import { db, type IInvoice } from './db';

	let status: 'LOADING' | 'READY' | 'CREATING' | 'CHANGING' = $state('LOADING');
	let savedStates: IInvoice[] = $state([]);
	let selectedStateId: number | null = $state(null);
	let form: typeof initialFormState = $state(structuredClone(initialFormState));

	function add() {
		form.items.push({ ...sample_row });
	}

	function remove() {
		form.items = form.items.slice(0, -1);
	}

	// Function to save the current form state
	async function saveFormState(form: undefined | null | typeof initialFormState) {
		if (status !== 'READY') return;
		if (selectedStateId) {
			// Update existing invoice
			await db.invoices.update(selectedStateId, {
				date: new Date().toISOString(),
				formState: $state.snapshot(form)
			});
		} else {
			// Create new invoice
			const newInvoice = await db.invoices.add({
				date: new Date().toISOString(),
				formState: $state.snapshot(form)
			});
			selectedStateId = newInvoice;
		}
		await loadSavedStates();
	}

	// Function to load the most recent form state
	async function loadMostRecentState() {
		const mostRecent = await db.invoices.orderBy('date').last();
		if (mostRecent) {
			form = mostRecent.formState;
			selectedStateId = mostRecent.id!;
		}
		status = 'READY';
	}

	// Function to load saved states
	async function loadSavedStates() {
		savedStates = await db.invoices.orderBy('date').reverse().toArray();
	}

	// Explain why we aren't binding the id
	// Function to load a specific state
	async function loadState(event: Event) {
		const selectElement = event.target as HTMLSelectElement;
		const selectedId = selectElement.value ? parseInt(selectElement.value, 10) : null;

		if (selectedId !== selectedStateId) {
			status = 'CHANGING';
			if (selectedId === null) {
				// No invoice selected, reset to initial state
				form = structuredClone(initialFormState);
			} else {
				const selectedState = await db.invoices.get(selectedId);
				if (selectedState) {
					form = selectedState.formState;
				} else {
					console.error('Selected invoice not found');
					form = structuredClone(initialFormState);
				}
			}
			selectedStateId = selectedId;
			status = 'READY';
		}
	}

	// Function to create a new invoice
	function createNewInvoice() {
		status = 'CREATING';
		selectedStateId = null;
		form = structuredClone(initialFormState);
		status = 'READY';
	}

	async function exportDatabaseAsJson() {
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

	function getSelectValue(state: IInvoice) {
		let date = new Date(state.date).toLocaleString();
		let name = null;
		if (state.formState.invoice) name = '#' + state.formState.invoice;
		if (state.formState.billTo.name) name += ' ' + state.formState.billTo.name;
		return name ?? date;
	}

	$effect(() => {
		loadMostRecentState();
		loadSavedStates();
	});

	$effect(() => {
		if (status === 'READY') {
			saveFormState(form);
		}
	});
</script>

<header>
	<h1>Invoicer</h1>
	<div class="options">
		<label class="visible" for="currency">Currency:</label>
		<select name="currency" id="currency" bind:value={form.currency}>
			<option value="$">$</option>
			<option value="€">€</option>
		</select>
		<button onclick={createNewInvoice}>New Invoice</button>
		<select value={selectedStateId} onchange={loadState}>
			<option value={null}>Select a saved invoice</option>
			{#each savedStates as state}
				<option value={state.id}>{getSelectValue(state)}</option>
			{/each}
		</select>
		<button onclick={exportDatabaseAsJson}>Export All Invoices as JSON</button>
	</div>
</header>

<section>
	<div class="flex space-between">
		<div>
			<div>
				<label for="biz">Business</label>
				<input bind:value={form.biz} type="text" id="biz" name="biz" placeholder="Company Name" />
			</div>
			<div>
				<label for="name">Name</label>
				<input bind:value={form.name} type="text" id="name" name="name" placeholder="Your Name" />
			</div>
			<div>
				<label for="address">Address</label>
				<textarea bind:value={form.address} id="address" name="address" placeholder="Your Address"
				></textarea>
			</div>
		</div>

		<div class="zone invoice">
			<div class="inline">
				<label for="invoice">Invoice #:</label>
				<input
					bind:value={form.invoice}
					type="text"
					id="invoice"
					name="invoice"
					placeholder="0000"
				/>
			</div>
			<div class="inline">
				<label for="invoice-date">Date:</label>
				<input bind:value={form.invoiceDate} type="date" id="invoice-date" name="invoice-date" />
			</div>
			<div class="inline">
				<label for="due">Due Date:</label>
				<input bind:value={form.due} type="date" id="due" name="due" />
			</div>
		</div>
	</div>

	<div class="flex close">
		<div class="zone" class:inactive={!form.billTo.active}>
			<h3>Bill To</h3>
			<button onclick={() => (form.billTo.active = !form.billTo.active)} class="activate control"
				>{form.billTo.active ? 'Deactivate' : 'Activate'}</button
			>

			<div>
				<label for="name">Name</label>
				<input
					bind:value={form.billTo.name}
					type="text"
					id="name"
					name="name"
					placeholder="Their Name"
				/>
			</div>
			<div>
				<label for="address">Address</label>
				<textarea
					bind:value={form.billTo.address}
					id="address"
					name="address"
					placeholder="Their Address"
				></textarea>
			</div>
		</div>

		<div class="zone" class:inactive={!form.shipTo.active}>
			<h3>Ship To</h3>
			<button onclick={() => (form.shipTo.active = !form.shipTo.active)} class="activate control"
				>{form.shipTo.active ? 'Deactivate' : 'Activate'}</button
			>
			<div>
				<label for="ship-name">Name</label>
				<input
					bind:value={form.shipTo.name}
					type="text"
					id="ship-name"
					name="ship-name"
					placeholder="Their Name"
				/>
			</div>
			<div>
				<label for="ship-address">Address</label>
				<textarea
					bind:value={form.shipTo.address}
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
			{#each form.items as item, i ('item-' + i)}
				<tr>
					<td>
						<label for="qty-{i}">QTY</label>
						<input
							bind:value={form.items[i].qty}
							type="number"
							id="qty-{i}"
							name="qty-{i}"
							placeholder="QTY"
						/>
					</td>
					<td>
						<label for="description-{i}">Description</label>
						<input
							bind:value={form.items[i].description}
							type="text"
							id="description-{i}"
							name="description-{i}"
							placeholder="Description"
						/>
					</td>
					<td>
						<div class="inline">
							<label for="price-{i}">Price</label>
							{form.currency}<input
								bind:value={form.items[i].price}
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
							{form.currency}<input
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
				<td>{form.currency} {form.items.reduce((a, b) => a + b.qty * b.price, 0)}</td>
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
