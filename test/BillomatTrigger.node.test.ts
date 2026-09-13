import { describe, expect, it } from 'vitest';

import { BillomatTrigger } from '../nodes/BillomatTrigger/BillomatTrigger.node';
import { BILLOMAT_EVENT_OPTIONS } from '../nodes/BillomatTrigger/events';
import { createWebhookMock } from './helpers';

const node = new BillomatTrigger();

const INVOICE_BODY = {
	invoice: { id: '1', invoice_number: 'RE123', contact_id: {} },
};

describe('webhook lifecycle', () => {
	// Billomat has no API to register webhooks, so the lifecycle is a no-op that
	// reports the webhook as present. These assertions pin that down: a `create`
	// returning false would make n8n refuse to activate the workflow.
	it('reports the manually configured webhook as existing', async () => {
		const hooks = node.webhookMethods.default;

		expect(await hooks.checkExists.call({} as never)).toBe(true);
		expect(await hooks.create.call({} as never)).toBe(true);
		expect(await hooks.delete.call({} as never)).toBe(true);
	});
});

describe('credential test', () => {
	const test = node.methods.credentialTest.billomatWebhookAuthTest;

	it('accepts a complete pair and says what it cannot verify', async () => {
		const result = await test.call({} as never, {
			data: { user: 'billo', password: 's3cret' },
		} as never);

		expect(result.status).toBe('OK');
		expect(result.message).toMatch(/no endpoint to verify/i);
	});

	it.each([
		['missing password', { user: 'billo', password: '' }],
		['missing user', { user: '', password: 's3cret' }],
		['whitespace only', { user: '  ', password: '\t' }],
	])('rejects %s', async (_label, data) => {
		const result = await test.call({} as never, { data } as never);

		expect(result.status).toBe('Error');
	});

	// The runtime check compares byte for byte, so padding must be surfaced rather than
	// silently accepted — but it is legal in a password, so it must not be an error.
	it('accepts padded values but warns about them', async () => {
		const result = await test.call({} as never, {
			data: { user: ' billo', password: 's3cret ' },
		} as never);

		expect(result.status).toBe('OK');
		expect(result.message).toMatch(/user and password starts or ends with a space/i);
	});

	it('names only the padded half', async () => {
		const result = await test.call({} as never, {
			data: { user: 'billo', password: 's3cret ' },
		} as never);

		expect(result.message).toMatch(/the password starts or ends with a space/i);
		expect(result.message).not.toMatch(/user/i);
	});
});

describe('event options', () => {
	it('has no duplicates', () => {
		const values = BILLOMAT_EVENT_OPTIONS.map((option) => option.value);
		expect(new Set(values).size).toBe(values.length);
	});

	it('uses the dotted entity.action form Billomat sends', () => {
		for (const option of BILLOMAT_EVENT_OPTIONS) {
			expect(String(option.value)).toMatch(/^[a-z_]+\.[a-z_]+$/);
		}
	});

	it('covers the documented core events', () => {
		const values = BILLOMAT_EVENT_OPTIONS.map((option) => option.value);
		expect(values).toEqual(
			expect.arrayContaining([
				'invoice.create',
				'invoice.status',
				'invoice_payment.create',
				'client.update',
				'offer.status',
				'contact.delete',
			]),
		);
	});
});

describe('webhook', () => {
	it('unwraps the entity and reports the event', async () => {
		const context = createWebhookMock({
			parameters: { authentication: 'none', events: [], options: {} },
			headers: { 'x-billomat-webhook-event': 'invoice.create' },
			body: INVOICE_BODY,
		});

		const result = await node.webhook.call(context);

		expect(result.workflowData?.[0][0].json).toEqual({
			event: 'invoice.create',
			resource: 'invoice',
			data: { id: '1', invoice_number: 'RE123', contact_id: null },
		});
	});

	it('passes a selected event through', async () => {
		const context = createWebhookMock({
			parameters: {
				authentication: 'none',
				events: ['invoice.create', 'invoice.status'],
				options: {},
			},
			headers: { 'x-billomat-webhook-event': 'invoice.status' },
			body: INVOICE_BODY,
		});

		const result = await node.webhook.call(context);

		expect(result.workflowData).toBeDefined();
	});

	it('acknowledges but does not start the workflow for an unselected event', async () => {
		const context = createWebhookMock({
			parameters: { authentication: 'none', events: ['invoice.create'], options: {} },
			headers: { 'x-billomat-webhook-event': 'client.update' },
			body: { client: { id: '1' } },
		});

		const result = await node.webhook.call(context);

		// Anything other than 2xx makes Billomat retry and eventually disable the webhook.
		expect(result.workflowData).toBeUndefined();
		expect(result.webhookResponse).toBe('OK');
	});

	it('returns the raw body when asked to', async () => {
		const context = createWebhookMock({
			parameters: {
				authentication: 'none',
				events: [],
				options: { rawBody: true },
			},
			headers: { 'x-billomat-webhook-event': 'invoice.create' },
			body: INVOICE_BODY,
		});

		const result = await node.webhook.call(context);

		expect(result.workflowData?.[0][0].json).toEqual({
			invoice: { id: '1', invoice_number: 'RE123', contact_id: null },
		});
	});

	it('adds the headers when asked to', async () => {
		const context = createWebhookMock({
			parameters: {
				authentication: 'none',
				events: [],
				options: { includeHeaders: true },
			},
			headers: {
				'x-billomat-webhook-event': 'invoice.create',
				'x-billomat-webhook-request-id': '510',
			},
			body: INVOICE_BODY,
		});

		const result = await node.webhook.call(context);

		expect(result.workflowData?.[0][0].json.headers).toMatchObject({
			'x-billomat-webhook-request-id': '510',
		});
	});

	it('redacts credential headers so they cannot leak into workflow data', async () => {
		const context = createWebhookMock({
			parameters: {
				authentication: 'basicAuth',
				events: [],
				options: { includeHeaders: true },
			},
			headers: {
				authorization: 'Basic ' + Buffer.from('billo:s3cret').toString('base64'),
				cookie: 'session=abc',
				'x-billomat-webhook-event': 'invoice.create',
			},
			body: INVOICE_BODY,
			credentials: { user: 'billo', password: 's3cret' },
		});

		const result = await node.webhook.call(context);
		const emitted = result.workflowData?.[0][0].json.headers as Record<string, string>;

		expect(emitted.authorization).toBe('[redacted]');
		expect(emitted.cookie).toBe('[redacted]');
		expect(emitted['x-billomat-webhook-event']).toBe('invoice.create');
		expect(JSON.stringify(result.workflowData)).not.toContain('s3cret');
	});

	it('redacts regardless of header casing', async () => {
		const context = createWebhookMock({
			parameters: {
				authentication: 'none',
				events: [],
				options: { includeHeaders: true },
			},
			headers: { Authorization: 'Basic c2VjcmV0', 'x-billomat-webhook-event': 'invoice.create' },
			body: INVOICE_BODY,
		});

		const result = await node.webhook.call(context);
		const emitted = result.workflowData?.[0][0].json.headers as Record<string, string>;

		expect(emitted.Authorization).toBe('[redacted]');
	});

	it('points at the JSON setting when the body could not be parsed', async () => {
		const context = createWebhookMock({
			parameters: { authentication: 'none', events: [], options: {} },
			headers: { 'x-billomat-webhook-event': 'invoice.create' },
			body: {},
		});

		await expect(node.webhook.call(context)).rejects.toThrow(/JSON/);
	});

	it('handles a missing event header', async () => {
		const context = createWebhookMock({
			parameters: { authentication: 'none', events: [], options: {} },
			headers: {},
			body: INVOICE_BODY,
		});

		const result = await node.webhook.call(context);

		expect(result.workflowData?.[0][0].json.event).toBeNull();
	});
});

describe('basic auth', () => {
	const credentials = { user: 'billo', password: 's3cret' };
	const valid = 'Basic ' + Buffer.from('billo:s3cret').toString('base64');

	it('accepts a request carrying the configured credentials', async () => {
		const context = createWebhookMock({
			parameters: { authentication: 'basicAuth', events: [], options: {} },
			headers: { authorization: valid, 'x-billomat-webhook-event': 'invoice.create' },
			body: INVOICE_BODY,
			credentials,
		});

		const result = await node.webhook.call(context);

		expect(result.workflowData).toBeDefined();
	});

	it('rejects a wrong password', async () => {
		const context = createWebhookMock({
			parameters: { authentication: 'basicAuth', events: [], options: {} },
			headers: {
				authorization: 'Basic ' + Buffer.from('billo:wrong').toString('base64'),
			},
			body: INVOICE_BODY,
			credentials,
		});

		await expect(node.webhook.call(context)).rejects.toThrow(/Authorization failed/);
	});

	it('rejects a missing header', async () => {
		const context = createWebhookMock({
			parameters: { authentication: 'basicAuth', events: [], options: {} },
			headers: {},
			body: INVOICE_BODY,
			credentials,
		});

		await expect(node.webhook.call(context)).rejects.toThrow(/Authorization failed/);
	});
});
