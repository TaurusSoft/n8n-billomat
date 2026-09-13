import { vi } from 'vitest';
import type { IDataObject, IExecuteFunctions, IWebhookFunctions } from 'n8n-workflow';

export interface ExecuteMockOptions {
	/** Node parameters, keyed by name. Functions receive the item index. */
	parameters: Record<string, unknown | ((itemIndex: number) => unknown)>;
	/** Input items. Defaults to a single empty item. */
	items?: Array<{ json: IDataObject; binary?: Record<string, unknown> }>;
	/** Responses returned by successive HTTP calls, or a function of the request. */
	responses?: unknown[] | ((options: IDataObject) => unknown);
	credentials?: IDataObject;
	continueOnFail?: boolean;
	binaryBuffers?: Record<string, Buffer>;
}

export interface ExecuteMock {
	context: IExecuteFunctions;
	/** Every request passed to httpRequestWithAuthentication, in order. */
	requests: IDataObject[];
}

const DEFAULT_CREDENTIALS: IDataObject = {
	billomatId: 'acme',
	apiKey: 'secret-key',
};

/**
 * Builds the slice of IExecuteFunctions the node actually touches. Keeping it explicit
 * rather than mocking the whole interface makes it obvious which parts of the n8n API
 * the node depends on.
 */
export function createExecuteMock(options: ExecuteMockOptions): ExecuteMock {
	const requests: IDataObject[] = [];
	const items = options.items ?? [{ json: {} }];
	const responses = options.responses ?? [];
	let responseIndex = 0;

	const httpRequestWithAuthentication = vi.fn(
		async (_credentialType: string, requestOptions: IDataObject) => {
			requests.push(requestOptions);

			if (typeof responses === 'function') {
				return responses(requestOptions);
			}

			const response = responses[responseIndex];
			responseIndex += 1;
			return response ?? {};
		},
	);

	const context = {
		getInputData: () => items,
		getNode: () => ({ name: 'Billomat', type: '@taurussoftware/n8n-nodes-billomat.billomat' }),
		continueOnFail: () => options.continueOnFail ?? false,
		getCredentials: async () => options.credentials ?? DEFAULT_CREDENTIALS,
		getNodeParameter: (name: string, itemIndex?: number, fallback?: unknown) => {
			if (!(name in options.parameters)) {
				if (fallback !== undefined) return fallback;
				throw new Error(`Test did not provide the parameter "${name}"`);
			}

			const value = options.parameters[name];
			return typeof value === 'function'
				? (value as (i: number) => unknown)(itemIndex ?? 0)
				: value;
		},
		helpers: {
			httpRequestWithAuthentication,
			prepareBinaryData: async (buffer: Buffer, fileName: string, mimeType: string) => ({
				data: buffer.toString('base64'),
				fileName,
				mimeType,
			}),
			getBinaryDataBuffer: async (_itemIndex: number, propertyName: string) => {
				const buffer = options.binaryBuffers?.[propertyName];
				if (buffer === undefined) {
					throw new Error(`No binary buffer registered for "${propertyName}"`);
				}
				return buffer;
			},
			assertBinaryData: (_itemIndex: number, propertyName: string) => ({
				fileName: `${propertyName}.pdf`,
				mimeType: 'application/pdf',
			}),
		},
	} as unknown as IExecuteFunctions;

	return { context, requests };
}

export interface WebhookMockOptions {
	parameters: Record<string, unknown>;
	headers?: Record<string, unknown>;
	body?: unknown;
	credentials?: IDataObject;
}

export function createWebhookMock(options: WebhookMockOptions): IWebhookFunctions {
	return {
		getHeaderData: () => options.headers ?? {},
		getBodyData: () => options.body ?? {},
		getNode: () => ({ name: 'Billomat Trigger', type: '@taurussoftware/n8n-nodes-billomat.billomatTrigger' }),
		getCredentials: async () => options.credentials ?? { user: 'u', password: 'p' },
		getNodeParameter: (name: string, fallback?: unknown) => {
			if (!(name in options.parameters)) {
				if (fallback !== undefined) return fallback;
				throw new Error(`Test did not provide the parameter "${name}"`);
			}
			return options.parameters[name];
		},
	} as unknown as IWebhookFunctions;
}
