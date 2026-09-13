import { describe, expect, it } from 'vitest';
import type { ICredentialDataDecryptedObject, IHttpRequestOptions } from 'n8n-workflow';

import { BillomatApi } from '../credentials/BillomatApi.credentials';
import { BillomatWebhookAuthApi } from '../credentials/BillomatWebhookAuthApi.credentials';

const credential = new BillomatApi();

async function authenticate(
	values: ICredentialDataDecryptedObject,
	requestOptions: Partial<IHttpRequestOptions> = {},
) {
	return await credential.authenticate(values, {
		url: '/clients',
		headers: {},
		...requestOptions,
	} as IHttpRequestOptions);
}

describe('BillomatApi', () => {
	it('sends the API key header', async () => {
		const result = await authenticate({ billomatId: 'acme', apiKey: 'secret' });

		expect(result.headers).toMatchObject({ 'X-BillomatApiKey': 'secret' });
	});

	it('omits the app headers when no app is registered', async () => {
		const result = await authenticate({ billomatId: 'acme', apiKey: 'secret' });

		expect(result.headers).not.toHaveProperty('X-AppId');
		expect(result.headers).not.toHaveProperty('X-AppSecret');
	});

	it('omits the app headers when they are left blank', async () => {
		const result = await authenticate({
			billomatId: 'acme',
			apiKey: 'secret',
			appId: '',
			appSecret: '',
		});

		expect(result.headers).not.toHaveProperty('X-AppId');
		expect(result.headers).not.toHaveProperty('X-AppSecret');
	});

	it('sends the app headers that raise the rate limit when both are set', async () => {
		const result = await authenticate({
			billomatId: 'acme',
			apiKey: 'secret',
			appId: 'app-1',
			appSecret: 'app-secret',
		});

		expect(result.headers).toMatchObject({
			'X-AppId': 'app-1',
			'X-AppSecret': 'app-secret',
		});
	});

	it('keeps headers the caller already set', async () => {
		const result = await authenticate(
			{ billomatId: 'acme', apiKey: 'secret' },
			{ headers: { Accept: 'application/json' } },
		);

		expect(result.headers).toMatchObject({
			Accept: 'application/json',
			'X-BillomatApiKey': 'secret',
		});
	});

	it('tests the connection against the account subdomain', () => {
		expect(credential.test.request.baseURL).toBe(
			'=https://{{$credentials.billomatId}}.billomat.net/api',
		);
		expect(credential.test.request.url).toBe('/users/myself');
	});

	it('marks the secrets as passwords', () => {
		const secret = (name: string) =>
			credential.properties.find((property) => property.name === name);

		expect(secret('apiKey')?.typeOptions?.password).toBe(true);
		expect(secret('appSecret')?.typeOptions?.password).toBe(true);
		expect(secret('billomatId')?.typeOptions?.password).toBeUndefined();
	});
});

describe('BillomatWebhookAuthApi', () => {
	it('asks for a user and a password only', () => {
		const credentials = new BillomatWebhookAuthApi();

		expect(credentials.properties.map((property) => property.name)).toEqual([
			'user',
			'password',
		]);
		expect(
			credentials.properties.find((property) => property.name === 'password')?.typeOptions
				?.password,
		).toBe(true);
	});
});
