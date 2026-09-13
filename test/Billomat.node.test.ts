import { describe, expect, it } from 'vitest';
import type { IDataObject } from 'n8n-workflow';

import { Billomat } from '../nodes/Billomat/Billomat.node';
import { RESOURCES } from '../nodes/Billomat/Resources';
import { createExecuteMock } from './helpers';

const node = new Billomat();

function body(request: IDataObject): IDataObject {
	return request.body as IDataObject;
}

describe('node description', () => {
	const properties = node.description.properties;
	const resourceOptions = (
		properties.find((property) => property.name === 'resource')?.options ?? []
	).map((option) => (option as { value: string }).value);

	const operationsByResource = new Map<string, string[]>();
	for (const property of properties) {
		if (property.name !== 'operation') continue;
		const resource = property.displayOptions?.show?.resource?.[0] as string;
		operationsByResource.set(
			resource,
			(property.options ?? []).map((option) => (option as { value: string }).value),
		);
	}

	it('offers every resource the registry knows and nothing else', () => {
		expect([...resourceOptions].sort()).toEqual(Object.keys(RESOURCES).sort());
	});

	it('declares operations for every resource', () => {
		for (const resource of resourceOptions) {
			expect(operationsByResource.get(resource), `no operations for ${resource}`).toBeTruthy();
		}
	});

	it('only declares operations that execute() handles', () => {
		const handled = new Set([
			'create',
			'update',
			'get',
			'getAll',
			'getMyself',
			'delete',
			'complete',
			'getPdf',
			'sendEmail',
			'cancel',
			'clear',
			'lose',
			'uncancel',
			'unclear',
			'win',
		]);

		for (const [resource, operations] of operationsByResource) {
			for (const operation of operations) {
				expect(handled.has(operation), `${resource}.${operation} is unhandled`).toBe(true);
			}
		}
	});

	it('only references resources and operations that exist', () => {
		for (const property of properties) {
			const show = property.displayOptions?.show;
			if (show === undefined) continue;

			for (const resource of (show.resource ?? []) as string[]) {
				expect(resourceOptions).toContain(resource);
				for (const operation of (show.operation ?? []) as string[]) {
					expect(operationsByResource.get(resource)).toContain(operation);
				}
			}
		}
	});

	it('never shows two properties of the same name at once', () => {
		const seen = new Set<string>();

		for (const property of properties) {
			const show = property.displayOptions?.show ?? {};
			for (const resource of ((show.resource ?? ['*']) as string[])) {
				for (const operation of ((show.operation ?? ['*']) as string[])) {
					const key = `${resource}|${operation}|${property.name}`;
					expect(seen.has(key), `duplicate ${key}`).toBe(false);
					seen.add(key);
				}
			}
		}
	});

	it('defaults each operation dropdown to one of its own options', () => {
		for (const property of properties) {
			if (property.name !== 'operation') continue;
			const values = (property.options ?? []).map((option) => (option as { value: string }).value);
			expect(values).toContain(property.default);
		}
	});
});

describe('create', () => {
	it('wraps the payload in the resource key and posts to the endpoint', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'client',
				operation: 'create',
				name: 'ACME GmbH',
				additionalFields: { email: 'billing@acme.test', city: 'Berlin' },
			},
			responses: [{ client: { id: '1', name: 'ACME GmbH' } }],
		});

		const result = await node.execute.call(context);

		expect(requests[0]).toMatchObject({ method: 'POST', url: '/clients' });
		expect(body(requests[0])).toEqual({
			client: { name: 'ACME GmbH', email: 'billing@acme.test', city: 'Berlin' },
		});
		expect(result[0][0].json).toEqual({ id: '1', name: 'ACME GmbH' });
	});

	it('drops empty values but keeps zero and false', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'client',
				operation: 'create',
				name: 'ACME',
				additionalFields: {
					city: '',
					note: '',
					number_length: 0,
					dunning_run: false,
					default_payment_types: [],
				},
			},
			responses: [{ client: {} }],
		});

		await node.execute.call(context);

		expect(body(requests[0]).client).toEqual({
			name: 'ACME',
			number_length: 0,
			dunning_run: 0,
		});
	});

	it('joins multiOptions into the comma separated lists Billomat expects', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'invoice',
				operation: 'create',
				client_id: '5',
				additionalFields: { payment_types: ['CASH', 'PAYPAL'] },
				'lineItems.item': [],
			},
			responses: [{ invoice: {} }],
		});

		await node.execute.call(context);

		expect((body(requests[0]).invoice as IDataObject).payment_types).toBe('CASH,PAYPAL');
	});

	it('reduces n8n date-time values to the plain dates the API takes', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'invoice',
				operation: 'create',
				client_id: '5',
				additionalFields: { date: '2024-03-15T00:00:00.000+01:00' },
				'lineItems.item': [],
			},
			responses: [{ invoice: {} }],
		});

		await node.execute.call(context);

		expect((body(requests[0]).invoice as IDataObject).date).toBe('2024-03-15');
	});

	it('nests inline line items under the hyphenated keys of the document type', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'invoice',
				operation: 'create',
				client_id: '5',
				additionalFields: {},
				'lineItems.item': [
					{ title: 'Work', unit: 'hour', quantity: 8, unit_price: 90, description: '' },
				],
			},
			responses: [{ invoice: {} }],
		});

		await node.execute.call(context);

		expect((body(requests[0]).invoice as IDataObject)['invoice-items']).toEqual({
			'invoice-item': [{ title: 'Work', unit: 'hour', quantity: 8, unit_price: 90 }],
		});
	});

	it('uses the estimate item keys for estimates', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'estimate',
				operation: 'create',
				client_id: '5',
				additionalFields: {},
				'lineItems.item': [{ title: 'Design' }],
			},
			responses: [{ offer: {} }],
		});

		await node.execute.call(context);

		expect(requests[0].url).toBe('/offers');
		expect((body(requests[0]).offer as IDataObject)['offer-items']).toEqual({
			'offer-item': [{ title: 'Design' }],
		});
	});

	it('omits the item container when no line items were given', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'invoice',
				operation: 'create',
				client_id: '5',
				additionalFields: {},
				'lineItems.item': [],
			},
			responses: [{ invoice: {} }],
		});

		await node.execute.call(context);

		expect(body(requests[0]).invoice).not.toHaveProperty('invoice-items');
	});

	it('inlines a binary file as base64 for incoming invoices', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'incoming',
				operation: 'create',
				supplier_id: '3',
				number: 'RE-1',
				date: '2024-03-15T00:00:00.000Z',
				additionalFields: { binaryPropertyName: 'data' },
			},
			responses: [{ incoming: {} }],
			binaryBuffers: { data: Buffer.from('pdf-bytes') },
		});

		await node.execute.call(context);

		const payload = body(requests[0]).incoming as IDataObject;
		expect(payload.base64file).toBe(Buffer.from('pdf-bytes').toString('base64'));
		expect(payload).not.toHaveProperty('binaryPropertyName');
	});
});

describe('getAll', () => {
	it('requests one page and trims to the limit', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'client',
				operation: 'getAll',
				returnAll: false,
				limit: 2,
				filters: { name: 'acme' },
			},
			responses: [
				{ clients: { '@total': '3', client: [{ id: '1' }, { id: '2' }, { id: '3' }] } },
			],
		});

		const result = await node.execute.call(context);

		expect(requests).toHaveLength(1);
		expect(requests[0].qs).toMatchObject({ name: 'acme', per_page: 2, page: 1 });
		expect(result[0]).toHaveLength(2);
	});

	it('returns one output item per record rather than the list envelope', async () => {
		const { context } = createExecuteMock({
			parameters: {
				resource: 'client',
				operation: 'getAll',
				returnAll: true,
				filters: {},
			},
			responses: [{ clients: { '@total': '2', client: [{ id: '1' }, { id: '2' }] } }],
		});

		const result = await node.execute.call(context);

		expect(result[0].map((item) => item.json)).toEqual([{ id: '1' }, { id: '2' }]);
	});

	it('adds the required parent scope to the query', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'contact',
				operation: 'getAll',
				returnAll: false,
				limit: 50,
				filters: {},
				client_id: '42',
			},
			responses: [{ contacts: { contact: [] } }],
		});

		await node.execute.call(context);

		expect(requests[0].url).toBe('/contacts');
		expect((requests[0].qs as IDataObject).client_id).toBe('42');
	});

	it('converts date filters to plain dates', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'invoice',
				operation: 'getAll',
				returnAll: false,
				limit: 10,
				filters: { from: '2024-01-01T00:00:00.000Z', status: ['OPEN', 'OVERDUE'] },
			},
			responses: [{ invoices: { invoice: [] } }],
		});

		await node.execute.call(context);

		expect(requests[0].qs).toMatchObject({ from: '2024-01-01', status: 'OPEN,OVERDUE' });
	});
});

describe('single record operations', () => {
	it('gets a record by ID', async () => {
		const { context, requests } = createExecuteMock({
			parameters: { resource: 'invoice', operation: 'get', itemId: '7' },
			responses: [{ invoice: { id: '7', contact_id: {} } }],
		});

		const result = await node.execute.call(context);

		expect(requests[0]).toMatchObject({ method: 'GET', url: '/invoices/7' });
		expect(result[0][0].json).toEqual({ id: '7', contact_id: null });
	});

	it('gets the own account through the myself alias', async () => {
		const { context, requests } = createExecuteMock({
			parameters: { resource: 'client', operation: 'getMyself' },
			responses: [{ client: { id: '1' } }],
		});

		await node.execute.call(context);

		expect(requests[0].url).toBe('/clients/myself');
	});

	it('updates with only the additional fields', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'client',
				operation: 'update',
				itemId: '3',
				additionalFields: { name: 'ACME AG' },
			},
			responses: [{ client: { id: '3' } }],
		});

		await node.execute.call(context);

		expect(requests[0]).toMatchObject({ method: 'PUT', url: '/clients/3' });
		expect(body(requests[0])).toEqual({ client: { name: 'ACME AG' } });
	});

	it('reports success for a delete, which returns no body', async () => {
		const { context, requests } = createExecuteMock({
			parameters: { resource: 'client', operation: 'delete', itemId: '3' },
			responses: [''],
		});

		const result = await node.execute.call(context);

		expect(requests[0].method).toBe('DELETE');
		expect(result[0][0].json).toEqual({ success: true, id: '3' });
	});
});

describe('document actions', () => {
	it('completes without a body when no template was chosen', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'invoice',
				operation: 'complete',
				itemId: '7',
				template_id: '',
			},
			responses: [{ invoice: { id: '7', status: 'OPEN' } }],
		});

		await node.execute.call(context);

		expect(requests[0]).toMatchObject({ method: 'PUT', url: '/invoices/7/complete' });
		expect(requests[0]).not.toHaveProperty('body');
	});

	it('passes the template override to complete', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'invoice',
				operation: 'complete',
				itemId: '7',
				template_id: '99',
			},
			responses: [{ invoice: {} }],
		});

		await node.execute.call(context);

		expect(body(requests[0])).toEqual({ complete: { template_id: '99' } });
	});

	it.each([
		['cancel', 'invoice', '/invoices/7/cancel'],
		['uncancel', 'invoice', '/invoices/7/uncancel'],
		['win', 'estimate', '/offers/7/win'],
		['lose', 'estimate', '/offers/7/lose'],
		['clear', 'estimate', '/offers/7/clear'],
		['unclear', 'estimate', '/offers/7/unclear'],
	])('sends %s as a PUT to %s', async (operation, resource, url) => {
		const { context, requests } = createExecuteMock({
			parameters: { resource, operation, itemId: '7' },
			responses: [{ [RESOURCES[resource].itemKey]: { id: '7' } }],
		});

		await node.execute.call(context);

		expect(requests[0]).toMatchObject({ method: 'PUT', url });
	});
});

describe('getPdf', () => {
	it('returns the PDF as binary and keeps the metadata in json', async () => {
		const pdf = Buffer.from('%PDF-1.4 fake');
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'invoice',
				operation: 'getPdf',
				itemId: '7',
				binaryPropertyName: 'invoice',
			},
			responses: [
				{
					pdf: {
						id: '4882',
						filename: 'invoice_123.pdf',
						mimetype: 'application/pdf',
						filesize: '13',
						base64file: pdf.toString('base64'),
					},
				},
			],
		});

		const result = await node.execute.call(context);

		expect(requests[0].url).toBe('/invoices/7/pdf');
		expect(result[0][0].json).toEqual({
			id: '4882',
			filename: 'invoice_123.pdf',
			mimetype: 'application/pdf',
			filesize: '13',
		});
		expect(result[0][0].binary?.invoice).toMatchObject({
			fileName: 'invoice_123.pdf',
			mimeType: 'application/pdf',
		});
	});

	it('explains that drafts have no PDF yet', async () => {
		const { context } = createExecuteMock({
			parameters: {
				resource: 'invoice',
				operation: 'getPdf',
				itemId: '7',
				binaryPropertyName: 'data',
			},
			responses: [{ pdf: {} }],
		});

		await expect(node.execute.call(context)).rejects.toThrow(/completed/);
	});
});

describe('sendEmail', () => {
	it('sends a single recipient as a scalar', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'invoice',
				operation: 'sendEmail',
				itemId: '7',
				to: 'billing@acme.test',
				emailOptions: {},
			},
			responses: [{ invoice: { id: '7' } }],
		});

		await node.execute.call(context);

		expect(requests[0]).toMatchObject({ method: 'POST', url: '/invoices/7/email' });
		expect(body(requests[0])).toEqual({
			email: { recipients: { to: 'billing@acme.test' } },
		});
	});

	it('sends several recipients as an array and carries the options over', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'invoice',
				operation: 'sendEmail',
				itemId: '7',
				to: 'a@acme.test, b@acme.test',
				emailOptions: {
					cc: 'c@acme.test',
					subject: 'Your invoice',
					body: 'Dear customer',
					from: '',
				},
			},
			responses: [{ invoice: {} }],
		});

		await node.execute.call(context);

		expect(body(requests[0]).email).toEqual({
			recipients: { to: ['a@acme.test', 'b@acme.test'], cc: 'c@acme.test' },
			subject: 'Your invoice',
			body: 'Dear customer',
		});
	});

	it('attaches the named binary fields', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'invoice',
				operation: 'sendEmail',
				itemId: '7',
				to: 'a@acme.test',
				emailOptions: { attachmentsBinaryProperties: 'drawing' },
			},
			responses: [{ invoice: {} }],
			binaryBuffers: { drawing: Buffer.from('bytes') },
		});

		await node.execute.call(context);

		expect((body(requests[0]).email as IDataObject).attachments).toEqual({
			attachment: [
				{
					filename: 'drawing.pdf',
					mimetype: 'application/pdf',
					base64file: Buffer.from('bytes').toString('base64'),
				},
			],
		});
	});

	it('rejects an empty recipient list', async () => {
		const { context } = createExecuteMock({
			parameters: {
				resource: 'invoice',
				operation: 'sendEmail',
				itemId: '7',
				to: '  ,  ',
				emailOptions: {},
			},
		});

		await expect(node.execute.call(context)).rejects.toThrow(/recipient/i);
	});
});

describe('error handling', () => {
	it('collects the error per item when continueOnFail is set', async () => {
		const { context } = createExecuteMock({
			parameters: { resource: 'client', operation: 'get', itemId: '999' },
			items: [{ json: {} }, { json: {} }],
			continueOnFail: true,
			responses: () => {
				throw Object.assign(new Error('Request failed'), {
					response: { body: { errors: { error: 'Ressource not found' } } },
				});
			},
		});

		const result = await node.execute.call(context);

		expect(result[0]).toHaveLength(2);
		expect(result[0][0].json.error).toContain('Ressource not found');
	});

	it('throws otherwise', async () => {
		const { context } = createExecuteMock({
			parameters: { resource: 'client', operation: 'get', itemId: '999' },
			responses: () => {
				throw Object.assign(new Error('Request failed'), {
					response: { body: { errors: { error: 'Ressource not found' } } },
				});
			},
		});

		await expect(node.execute.call(context)).rejects.toThrow('Ressource not found');
	});
});

describe('multiple input items', () => {
	it('runs once per item and tags the output with the source item', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {
				resource: 'client',
				operation: 'get',
				itemId: (itemIndex: number) => String(itemIndex + 1),
			},
			items: [{ json: {} }, { json: {} }],
			responses: [{ client: { id: '1' } }, { client: { id: '2' } }],
		});

		const result = await node.execute.call(context);

		expect(requests.map((request) => request.url)).toEqual(['/clients/1', '/clients/2']);
		expect(result[0].map((item) => item.pairedItem)).toEqual([{ item: 0 }, { item: 1 }]);
	});
});
