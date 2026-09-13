import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

type BillomatFunctions = IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions;

/**
 * Billomat accounts are addressed by subdomain. Users tend to paste the whole URL,
 * so accept `mycompany`, `mycompany.billomat.net` and `https://mycompany.billomat.net/`
 * alike.
 */
export function normalizeBillomatId(rawId: string): string {
	return rawId
		.trim()
		.replace(/^https?:\/\//i, '')
		.replace(/\.billomat\.net.*$/i, '')
		.replace(/\/+$/, '');
}

/**
 * Billomat reports failures as `{"errors": {"error": "message"}}`, where `error` is
 * either a single string or a list of them. Depending on where the request failed the
 * payload shows up under different keys, so probe the known shapes.
 */
function extractBillomatError(error: unknown): string | undefined {
	const candidates: unknown[] = [];
	const err = error as IDataObject;

	if (err?.response && typeof err.response === 'object') {
		const response = err.response as IDataObject;
		candidates.push(response.body, response.data);
	}
	candidates.push(err?.error, err?.body, err?.cause, error);

	for (const candidate of candidates) {
		let payload = candidate;

		if (typeof payload === 'string') {
			try {
				payload = JSON.parse(payload);
			} catch {
				continue;
			}
		}

		const errors = (payload as IDataObject)?.errors as IDataObject | undefined;
		const message = errors?.error;

		if (typeof message === 'string' && message !== '') {
			return message;
		}
		if (Array.isArray(message) && message.length > 0) {
			return message.join('; ');
		}
	}

	return undefined;
}

export async function billomatApiRequest(
	this: BillomatFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	option: Partial<IHttpRequestOptions> = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('billomatApi');
	const billomatId = normalizeBillomatId(credentials.billomatId as string);

	const options: IHttpRequestOptions = {
		method,
		baseURL: `https://${billomatId}.billomat.net/api`,
		url: endpoint,
		qs,
		headers: {
			Accept: 'application/json',
		},
		json: true,
		...option,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	} else {
		options.body = body;
		options.headers = { ...options.headers, 'Content-Type': 'application/json' };
	}

	if (Object.keys(qs).length === 0) {
		delete options.qs;
	}

	try {
		const response = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'billomatApi',
			options,
		);

		// DELETE returns an empty body on success.
		return (response ?? {}) as IDataObject;
	} catch (error) {
		const message = extractBillomatError(error);
		throw new NodeApiError(this.getNode(), error as JsonObject, message ? { message } : undefined);
	}
}

/**
 * Empty XML elements (`<contact_id />`) survive Billomat's JSON conversion as empty
 * objects. Turn them into `null` so downstream expressions can test them normally.
 */
export function normalizeEmptyValues<T>(value: T): T {
	if (Array.isArray(value)) {
		return value.map((entry) => normalizeEmptyValues(entry)) as unknown as T;
	}

	if (value !== null && typeof value === 'object') {
		const entries = Object.entries(value as IDataObject);

		if (entries.length === 0) {
			return null as unknown as T;
		}

		return Object.fromEntries(
			entries.map(([key, entry]) => [key, normalizeEmptyValues(entry)]),
		) as unknown as T;
	}

	return value;
}

/**
 * Normalizes the fields of one record. Unlike `normalizeEmptyValues` this keeps the
 * record itself an object even when it has no fields, so callers can always read
 * properties off the result.
 */
function normalizeRecord(record: IDataObject): IDataObject {
	return Object.fromEntries(
		Object.entries(record).map(([key, value]) => [key, normalizeEmptyValues(value)]),
	);
}

/**
 * Unwraps a single resource: `{"client": {...}}` -> `{...}`.
 */
export function unwrapItem(response: IDataObject, itemKey: string): IDataObject {
	const item = (response[itemKey] ?? response) as IDataObject | null | undefined;

	if (item === null || item === undefined || typeof item !== 'object') {
		return {};
	}

	return normalizeRecord(item);
}

/**
 * Unwraps a list: `{"clients": {"@total": "2", "client": [{...}, {...}]}}` -> `[{...}, {...}]`.
 * A list with a single hit returns the item as an object rather than a one-element array,
 * and an empty list omits the item key entirely.
 */
export function unwrapList(
	response: IDataObject,
	listKey: string,
	itemKey: string,
): IDataObject[] {
	const container = (response[listKey] ?? response) as IDataObject;
	const items = container?.[itemKey];

	if (items === undefined || items === null) {
		return [];
	}

	const list = (Array.isArray(items) ? items : [items]) as IDataObject[];
	return list.map((item) => normalizeRecord(item));
}

/**
 * Reads the paging attributes off a list envelope. Billomat exposes them as XML
 * attributes, which the JSON conversion may or may not prefix with `@`.
 */
function readTotal(response: IDataObject, listKey: string): number | undefined {
	const container = (response[listKey] ?? response) as IDataObject;
	const total = container?.['@total'] ?? container?.total;
	const parsed = Number(total);

	return Number.isFinite(parsed) ? parsed : undefined;
}

const MAX_PER_PAGE = 1000;

export async function billomatApiRequestAllItems(
	this: BillomatFunctions,
	endpoint: string,
	listKey: string,
	itemKey: string,
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const results: IDataObject[] = [];
	const query: IDataObject = { ...qs, per_page: MAX_PER_PAGE, page: 1 };

	for (;;) {
		const response = await billomatApiRequest.call(this, 'GET', endpoint, {}, query);
		const items = unwrapList(response, listKey, itemKey);

		results.push(...items);

		const total = readTotal(response, listKey);
		const done =
			items.length === 0 ||
			items.length < MAX_PER_PAGE ||
			(total !== undefined && results.length >= total);

		if (done) {
			return results;
		}

		query.page = (query.page as number) + 1;
	}
}

/**
 * Runs a "Get Many" operation honouring the Return All / Limit pair.
 */
export async function billomatApiRequestList(
	this: IExecuteFunctions,
	itemIndex: number,
	endpoint: string,
	listKey: string,
	itemKey: string,
	qs: IDataObject = {},
): Promise<IDataObject[]> {
	const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;

	if (returnAll) {
		return await billomatApiRequestAllItems.call(this, endpoint, listKey, itemKey, qs);
	}

	const limit = this.getNodeParameter('limit', itemIndex) as number;
	const response = await billomatApiRequest.call(this, 'GET', endpoint, {}, {
		...qs,
		per_page: Math.min(limit, MAX_PER_PAGE),
		page: 1,
	});

	return unwrapList(response, listKey, itemKey).slice(0, limit);
}
