import { describe, expect, it } from 'vitest';
import type { IExecuteFunctions } from 'n8n-workflow';

import {
	billomatApiRequest,
	billomatApiRequestAllItems,
	normalizeBillomatId,
	normalizeEmptyValues,
	unwrapItem,
	unwrapList,
} from '../nodes/Billomat/GenericFunctions';
import { createExecuteMock } from './helpers';

describe('normalizeBillomatId', () => {
	it.each([
		['acme', 'acme'],
		['  acme  ', 'acme'],
		['acme.billomat.net', 'acme'],
		['https://acme.billomat.net', 'acme'],
		['https://acme.billomat.net/', 'acme'],
		['http://acme.billomat.net/api', 'acme'],
	])('turns %s into %s', (input, expected) => {
		expect(normalizeBillomatId(input)).toBe(expected);
	});
});

describe('normalizeEmptyValues', () => {
	it('turns the empty objects of unset XML elements into null', () => {
		expect(normalizeEmptyValues({ id: '1', contact_id: {} })).toEqual({
			id: '1',
			contact_id: null,
		});
	});

	it('recurses into nested objects and arrays', () => {
		expect(
			normalizeEmptyValues({
				taxes: { tax: [{ name: 'MwSt', amount: {} }] },
			}),
		).toEqual({ taxes: { tax: [{ name: 'MwSt', amount: null }] } });
	});

	it('leaves populated values untouched', () => {
		expect(normalizeEmptyValues({ total: '107.1', paid: '0' })).toEqual({
			total: '107.1',
			paid: '0',
		});
	});
});

describe('unwrapItem', () => {
	it('unwraps the resource envelope', () => {
		expect(unwrapItem({ client: { id: '1' } }, 'client')).toEqual({ id: '1' });
	});

	it('passes through a response that is not wrapped', () => {
		expect(unwrapItem({ id: '1' }, 'client')).toEqual({ id: '1' });
	});
});

describe('unwrapList', () => {
	it('unwraps a list envelope', () => {
		const response = {
			clients: { '@page': '1', '@total': '2', client: [{ id: '1' }, { id: '2' }] },
		};
		expect(unwrapList(response, 'clients', 'client')).toEqual([{ id: '1' }, { id: '2' }]);
	});

	it('wraps a single hit into an array', () => {
		const response = { clients: { '@total': '1', client: { id: '1' } } };
		expect(unwrapList(response, 'clients', 'client')).toEqual([{ id: '1' }]);
	});

	it('returns an empty array when the item key is missing', () => {
		expect(unwrapList({ clients: { '@total': '0' } }, 'clients', 'client')).toEqual([]);
	});

	it('normalizes empty values inside the list', () => {
		const response = { clients: { client: [{ id: '1', note: {} }] } };
		expect(unwrapList(response, 'clients', 'client')).toEqual([{ id: '1', note: null }]);
	});
});

describe('billomatApiRequest', () => {
	it('builds the account base URL and asks for JSON', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {},
			responses: [{ client: { id: '1' } }],
		});

		await billomatApiRequest.call(context, 'GET', '/clients/1');

		expect(requests[0]).toMatchObject({
			method: 'GET',
			baseURL: 'https://acme.billomat.net/api',
			url: '/clients/1',
			json: true,
		});
		expect((requests[0].headers as Record<string, string>).Accept).toBe('application/json');
	});

	it('omits an empty body and query string', async () => {
		const { context, requests } = createExecuteMock({ parameters: {}, responses: [{}] });

		await billomatApiRequest.call(context, 'DELETE', '/clients/1');

		expect(requests[0]).not.toHaveProperty('body');
		expect(requests[0]).not.toHaveProperty('qs');
	});

	it('sets the JSON content type when there is a body', async () => {
		const { context, requests } = createExecuteMock({ parameters: {}, responses: [{}] });

		await billomatApiRequest.call(context, 'POST', '/clients', { client: { name: 'ACME' } });

		expect(requests[0].body).toEqual({ client: { name: 'ACME' } });
		expect((requests[0].headers as Record<string, string>)['Content-Type']).toBe(
			'application/json',
		);
	});

	it('surfaces the Billomat error message', async () => {
		const { context } = createExecuteMock({
			parameters: {},
			responses: () => {
				throw Object.assign(new Error('Request failed'), {
					response: { body: { errors: { error: 'Ressource not found' } } },
				});
			},
		});

		await expect(billomatApiRequest.call(context, 'GET', '/clients/999')).rejects.toThrow(
			'Ressource not found',
		);
	});

	it('joins a list of Billomat error messages', async () => {
		const { context } = createExecuteMock({
			parameters: {},
			responses: () => {
				throw Object.assign(new Error('Request failed'), {
					response: { body: { errors: { error: ['Name is missing', 'Date is invalid'] } } },
				});
			},
		});

		await expect(billomatApiRequest.call(context, 'POST', '/clients')).rejects.toThrow(
			'Name is missing; Date is invalid',
		);
	});

	it('parses an error body that arrives as a string', async () => {
		const { context } = createExecuteMock({
			parameters: {},
			responses: () => {
				throw Object.assign(new Error('Request failed'), {
					response: { body: JSON.stringify({ errors: { error: 'Unauthorized' } }) },
				});
			},
		});

		await expect(billomatApiRequest.call(context, 'GET', '/clients')).rejects.toThrow(
			'Unauthorized',
		);
	});
});

describe('billomatApiRequestAllItems', () => {
	function page(items: number[], total: number) {
		return {
			clients: {
				'@total': String(total),
				client: items.map((id) => ({ id: String(id) })),
			},
		};
	}

	it('stops after a partial page', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {},
			responses: [page([1, 2], 2)],
		});

		const result = await billomatApiRequestAllItems.call(
			context as unknown as IExecuteFunctions,
			'/clients',
			'clients',
			'client',
		);

		expect(result).toHaveLength(2);
		expect(requests).toHaveLength(1);
		expect((requests[0].qs as Record<string, number>).per_page).toBe(1000);
	});

	it('follows pages until the reported total is reached', async () => {
		const full = Array.from({ length: 1000 }, (_, i) => i + 1);
		const { context, requests } = createExecuteMock({
			parameters: {},
			responses: [page(full, 1500), page(full.slice(0, 500), 1500)],
		});

		const result = await billomatApiRequestAllItems.call(
			context as unknown as IExecuteFunctions,
			'/clients',
			'clients',
			'client',
		);

		expect(result).toHaveLength(1500);
		expect(requests).toHaveLength(2);
		expect((requests[1].qs as Record<string, number>).page).toBe(2);
	});

	it('keeps the caller filters on every page', async () => {
		const { context, requests } = createExecuteMock({
			parameters: {},
			responses: [page([1], 1)],
		});

		await billomatApiRequestAllItems.call(
			context as unknown as IExecuteFunctions,
			'/clients',
			'clients',
			'client',
			{ name: 'acme' },
		);

		expect((requests[0].qs as Record<string, string>).name).toBe('acme');
	});
});
