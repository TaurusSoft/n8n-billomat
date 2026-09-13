import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import {
	billomatApiRequest,
	billomatApiRequestList,
	unwrapItem,
} from './GenericFunctions';
import { RESOURCES } from './Resources';
import {
	articleFields,
	articleOperations,
	clientFields,
	clientOperations,
	contactFields,
	contactOperations,
	creditNoteFields,
	creditNoteOperations,
	estimateFields,
	estimateOperations,
	incomingFields,
	incomingOperations,
	invoiceCommentFields,
	invoiceCommentOperations,
	invoiceFields,
	invoiceItemFields,
	invoiceItemOperations,
	invoiceOperations,
	invoicePaymentFields,
	invoicePaymentOperations,
	recurringFields,
	recurringItemFields,
	recurringItemOperations,
	recurringOperations,
	supplierFields,
	supplierOperations,
} from './descriptions';

/** Top-level parameters read for `create`, per resource. */
const CREATE_FIELDS: Record<string, string[]> = {
	article: ['title'],
	client: ['name'],
	contact: ['client_id'],
	creditNote: ['client_id'],
	estimate: ['client_id'],
	incoming: ['supplier_id', 'number', 'date'],
	invoice: ['client_id'],
	invoiceComment: ['invoice_id', 'comment'],
	invoiceItem: ['invoice_id'],
	invoicePayment: ['invoice_id', 'amount'],
	recurring: ['client_id'],
	recurringItem: ['recurring_id'],
	supplier: ['name'],
};

/**
 * Resources whose list endpoint only works scoped to a parent. Billomat rejects the
 * request without it, so the parameter is required in the UI and merged into the query.
 */
const LIST_SCOPE_PARAMS: Record<string, string> = {
	contact: 'client_id',
	invoiceComment: 'invoice_id',
	invoiceItem: 'invoice_id',
	recurringItem: 'recurring_id',
};

/** Status transitions that are plain `PUT /{resource}/{id}/{action}` calls. */
const STATUS_ACTIONS = ['cancel', 'clear', 'lose', 'uncancel', 'unclear', 'win'];

/**
 * Converts a node parameter value into what the Billomat API expects.
 *
 * - multiOptions arrays become the comma separated lists Billomat uses
 * - booleans become the 0/1 its BOOL type uses
 * - n8n dateTime values arrive as ISO timestamps while every date field in the covered
 *   resources is a plain DATE, so the time part is dropped
 */
function toApiValue(value: unknown): IDataObject[string] {
	if (Array.isArray(value)) {
		return value.join(',');
	}

	if (typeof value === 'boolean') {
		return value ? 1 : 0;
	}

	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
		return value.slice(0, 10);
	}

	return value as IDataObject[string];
}

/**
 * Drops values the user left empty and converts the rest. Zero and `false` are kept,
 * since a collection only carries fields the user explicitly added.
 */
function buildPayload(fields: IDataObject): IDataObject {
	const payload: IDataObject = {};

	for (const [key, value] of Object.entries(fields)) {
		if (value === undefined || value === null || value === '') {
			continue;
		}
		if (Array.isArray(value) && value.length === 0) {
			continue;
		}

		payload[key] = toApiValue(value);
	}

	return payload;
}

/**
 * Billomat mirrors its XML schema in JSON: a repeated element is an array, a single one
 * is the bare value. Recipient lists and attachments follow that shape.
 */
function toRepeatable(values: string[]): string | string[] | undefined {
	if (values.length === 0) {
		return undefined;
	}

	return values.length === 1 ? values[0] : values;
}

function splitList(value: string): string[] {
	return value
		.split(',')
		.map((entry) => entry.trim())
		.filter((entry) => entry !== '');
}

export class Billomat implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Billomat',
		name: 'billomat',
		icon: { light: 'file:billomat.svg', dark: 'file:billomat.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Billomat API',
		defaults: {
			name: 'Billomat',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'billomatApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Article', value: 'article' },
					{ name: 'Client', value: 'client' },
					{ name: 'Contact', value: 'contact' },
					{ name: 'Credit Note', value: 'creditNote' },
					{ name: 'Estimate', value: 'estimate' },
					{ name: 'Incoming Invoice', value: 'incoming' },
					{ name: 'Invoice', value: 'invoice' },
					{ name: 'Invoice Comment', value: 'invoiceComment' },
					{ name: 'Invoice Item', value: 'invoiceItem' },
					{ name: 'Invoice Payment', value: 'invoicePayment' },
					{ name: 'Recurring Invoice', value: 'recurring' },
					{ name: 'Recurring Item', value: 'recurringItem' },
					{ name: 'Supplier', value: 'supplier' },
				],
				default: 'invoice',
			},

			...articleOperations,
			...clientOperations,
			...contactOperations,
			...creditNoteOperations,
			...estimateOperations,
			...incomingOperations,
			...invoiceOperations,
			...invoiceCommentOperations,
			...invoiceItemOperations,
			...invoicePaymentOperations,
			...recurringOperations,
			...recurringItemOperations,
			...supplierOperations,

			...articleFields,
			...clientFields,
			...contactFields,
			...creditNoteFields,
			...estimateFields,
			...incomingFields,
			...invoiceFields,
			...invoiceCommentFields,
			...invoiceItemFields,
			...invoicePaymentFields,
			...recurringFields,
			...recurringItemFields,
			...supplierFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const config = RESOURCES[resource];

		if (config === undefined) {
			throw new NodeOperationError(this.getNode(), `Unknown resource "${resource}"`);
		}

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'getAll') {
					const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
					const qs = buildPayload(filters);

					const scopeParam = LIST_SCOPE_PARAMS[resource];
					if (scopeParam !== undefined) {
						qs[scopeParam] = this.getNodeParameter(scopeParam, i) as string;
					}

					const records = await billomatApiRequestList.call(
						this,
						i,
						`/${config.endpoint}`,
						config.listKey,
						config.itemKey,
						qs,
					);

					returnData.push(
						...records.map((record) => ({ json: record, pairedItem: { item: i } })),
					);
					continue;
				}

				let responseData: IDataObject;

				switch (operation) {
					case 'create': {
						const payload = buildPayload({
							...Object.fromEntries(
								(CREATE_FIELDS[resource] ?? []).map((field) => [
									field,
									this.getNodeParameter(field, i),
								]),
							),
							...(this.getNodeParameter('additionalFields', i, {}) as IDataObject),
						});

						if (resource === 'incoming') {
							await attachBinaryFile.call(this, i, payload);
						}

						if (config.inlineItems !== undefined) {
							const lineItems = (
								this.getNodeParameter('lineItems.item', i, []) as IDataObject[]
							).map((item) => buildPayload(item));

							if (lineItems.length > 0) {
								payload[config.inlineItems.listKey] = {
									[config.inlineItems.itemKey]: lineItems,
								};
							}
						}

						const response = await billomatApiRequest.call(
							this,
							'POST',
							`/${config.endpoint}`,
							{ [config.itemKey]: payload },
						);
						responseData = unwrapItem(response, config.itemKey);
						break;
					}

					case 'update': {
						const id = this.getNodeParameter('itemId', i) as string;
						const payload = buildPayload(
							this.getNodeParameter('additionalFields', i, {}) as IDataObject,
						);

						if (resource === 'incoming') {
							await attachBinaryFile.call(this, i, payload);
						}

						const response = await billomatApiRequest.call(
							this,
							'PUT',
							`/${config.endpoint}/${id}`,
							{ [config.itemKey]: payload },
						);
						responseData = unwrapItem(response, config.itemKey);
						break;
					}

					case 'get': {
						const id = this.getNodeParameter('itemId', i) as string;
						const response = await billomatApiRequest.call(
							this,
							'GET',
							`/${config.endpoint}/${id}`,
						);
						responseData = unwrapItem(response, config.itemKey);
						break;
					}

					case 'getMyself': {
						const response = await billomatApiRequest.call(
							this,
							'GET',
							`/${config.endpoint}/myself`,
						);
						responseData = unwrapItem(response, config.itemKey);
						break;
					}

					case 'delete': {
						const id = this.getNodeParameter('itemId', i) as string;
						await billomatApiRequest.call(this, 'DELETE', `/${config.endpoint}/${id}`);
						responseData = { success: true, id };
						break;
					}

					case 'complete': {
						const id = this.getNodeParameter('itemId', i) as string;
						const templateId = this.getNodeParameter('template_id', i, '') as string;
						const body =
							templateId === '' ? {} : { complete: { template_id: templateId } };

						const response = await billomatApiRequest.call(
							this,
							'PUT',
							`/${config.endpoint}/${id}/complete`,
							body,
						);
						responseData = unwrapItem(response, config.itemKey);
						break;
					}

					case 'getPdf': {
						const id = this.getNodeParameter('itemId', i) as string;
						const binaryPropertyName = this.getNodeParameter(
							'binaryPropertyName',
							i,
						) as string;

						const response = await billomatApiRequest.call(
							this,
							'GET',
							`/${config.endpoint}/${id}/pdf`,
						);
						const { base64file, ...pdfMeta } = unwrapItem(response, 'pdf');

						if (typeof base64file !== 'string') {
							throw new NodeOperationError(
								this.getNode(),
								'Billomat returned no PDF for this document. Documents only have a PDF once they are completed.',
								{ itemIndex: i },
							);
						}

						const binaryData = await this.helpers.prepareBinaryData(
							Buffer.from(base64file, 'base64'),
							(pdfMeta.filename as string) ?? `${config.itemKey}_${id}.pdf`,
							(pdfMeta.mimetype as string) ?? 'application/pdf',
						);

						returnData.push({
							json: pdfMeta,
							binary: { [binaryPropertyName]: binaryData },
							pairedItem: { item: i },
						});
						continue;
					}

					case 'sendEmail': {
						const id = this.getNodeParameter('itemId', i) as string;
						const email = await buildEmailPayload.call(this, i);

						const response = await billomatApiRequest.call(
							this,
							'POST',
							`/${config.endpoint}/${id}/email`,
							{ email },
						);
						responseData = { success: true, id, ...unwrapItem(response, config.itemKey) };
						break;
					}

					default: {
						if (!STATUS_ACTIONS.includes(operation)) {
							throw new NodeOperationError(
								this.getNode(),
								`The operation "${operation}" is not supported for resource "${resource}"`,
								{ itemIndex: i },
							);
						}

						const id = this.getNodeParameter('itemId', i) as string;
						const response = await billomatApiRequest.call(
							this,
							'PUT',
							`/${config.endpoint}/${id}/${operation}`,
						);
						responseData = unwrapItem(response, config.itemKey);
						break;
					}
				}

				returnData.push({ json: responseData, pairedItem: { item: i } });
			} catch (error) {
				// Not everything thrown in JS is an Error, and a non-Error would leave
				// `.message` undefined, hiding the original failure behind a blank message.
				const message = error instanceof Error ? error.message : String(error);

				if (this.continueOnFail()) {
					returnData.push({
						json: { error: message },
						pairedItem: { item: i },
					});
					continue;
				}

				// Rebuild rather than re-throw so every error leaving the node carries the
				// item index. `message` is carried over explicitly: billomatApiRequest has
				// already put Billomat's own wording there, and the parameter checks above
				// produce messages worth keeping too.

				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), message, { itemIndex: i });
				}

				throw new NodeApiError(this.getNode(), error as JsonObject, {
					itemIndex: i,
					message,
				});
			}
		}

		return [returnData];
	}
}

/**
 * Incoming invoices carry their scanned document as a base64 blob rather than a
 * multipart upload, so the referenced input binary field is inlined into the payload.
 */
async function attachBinaryFile(
	this: IExecuteFunctions,
	itemIndex: number,
	payload: IDataObject,
): Promise<void> {
	const binaryPropertyName = payload.binaryPropertyName as string | undefined;
	delete payload.binaryPropertyName;

	if (binaryPropertyName === undefined || binaryPropertyName === '') {
		return;
	}

	const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
	payload.base64file = buffer.toString('base64');
}

async function buildEmailPayload(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const to = splitList(this.getNodeParameter('to', itemIndex) as string);
	const options = this.getNodeParameter('emailOptions', itemIndex, {}) as IDataObject;

	if (to.length === 0) {
		throw new NodeOperationError(this.getNode(), 'At least one recipient is required', {
			itemIndex,
		});
	}

	const recipients: IDataObject = { to: toRepeatable(to) };

	for (const field of ['cc', 'bcc'] as const) {
		const value = options[field] as string | undefined;
		if (value) {
			recipients[field] = toRepeatable(splitList(value));
		}
	}

	const email: IDataObject = { recipients };

	for (const field of ['from', 'subject', 'body', 'filename', 'email_template_id'] as const) {
		const value = options[field];
		if (value !== undefined && value !== '') {
			email[field] = value;
		}
	}

	const attachmentProperties = splitList(
		(options.attachmentsBinaryProperties as string | undefined) ?? '',
	);

	if (attachmentProperties.length > 0) {
		const attachments = await Promise.all(
			attachmentProperties.map(async (propertyName) => {
				const binary = this.helpers.assertBinaryData(itemIndex, propertyName);
				const buffer = await this.helpers.getBinaryDataBuffer(itemIndex, propertyName);

				return {
					filename: binary.fileName ?? propertyName,
					mimetype: binary.mimeType,
					base64file: buffer.toString('base64'),
				};
			}),
		);

		email.attachments = { attachment: attachments };
	}

	return email;
}
