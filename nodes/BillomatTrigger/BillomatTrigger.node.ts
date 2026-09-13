import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	IHookFunctions,
	INodeCredentialTestResult,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { normalizeEmptyValues } from '../Billomat/GenericFunctions';
import { BILLOMAT_EVENT_OPTIONS } from './events';

export class BillomatTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Billomat Trigger',
		name: 'billomatTrigger',
		icon: { light: 'file:billomat.svg', dark: 'file:billomat.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when Billomat sends a webhook',
		defaults: {
			name: 'Billomat Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'billomatWebhookAuthApi',
				required: true,
				testedBy: 'billomatWebhookAuthTest',
				displayOptions: {
					show: {
						authentication: ['basicAuth'],
					},
				},
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'Billomat has no API to register webhooks. Copy the Production URL above into your Billomat account under Settings &gt; Webhooks, and set the format there to JSON.',
				name: 'setupNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{ name: 'Basic Auth', value: 'basicAuth' },
					{ name: 'None', value: 'none' },
				],
				default: 'none',
				description:
					'Billomat can send the webhook with HTTP basic auth. Pick Basic Auth to reject calls that do not carry the configured credentials.',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: BILLOMAT_EVENT_OPTIONS,
				default: [],
				description:
					'Events to trigger on. Leave empty to trigger on every event Billomat sends.',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Include Headers',
						name: 'includeHeaders',
						type: 'boolean',
						default: false,
						description: 'Whether to add the request headers to the output',
					},
					{
						displayName: 'Raw Body',
						name: 'rawBody',
						type: 'boolean',
						default: false,
						description:
							'Whether to output the unmodified request body instead of unwrapping the entity',
					},
				],
			},
		],
	};

	/**
	 * Billomat has no API for managing webhooks: they are entered by hand under
	 * Settings > Webhooks in the Billomat UI and there is no endpoint to list, create or
	 * remove them. The lifecycle therefore reports the webhook as already present so n8n
	 * does not try to register one, and activating or deactivating the workflow never
	 * changes anything on the Billomat side.
	 *
	 * The practical consequence for users: deactivating the workflow does not stop
	 * Billomat from sending. Remove the webhook in Billomat itself to do that.
	 */
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
	};

	methods = {
		credentialTest: {
			/**
			 * These credentials are compared against incoming requests rather than sent
			 * anywhere, so there is nothing to call. Check that both halves are filled in
			 * and tell the user what the test can and cannot establish.
			 */
			async billomatWebhookAuthTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const data = credential.data ?? {};
				// Compared verbatim at runtime, so they are never trimmed here either:
				// spaces are legal in a basic auth password.
				const user = String(data.user ?? '');
				const password = String(data.password ?? '');

				if (user.trim() === '' || password.trim() === '') {
					return {
						status: 'Error',
						message:
							'Enter the user and password exactly as you set them for the webhook in Billomat under Settings > Webhooks.',
					};
				}

				// Surrounding whitespace is invisible in the UI and survives a paste, but
				// the comparison is byte for byte, so it would only surface as a failing
				// webhook later. Legal in a password, so flag it rather than reject it.
				const padded = [
					user !== user.trim() ? 'user' : undefined,
					password !== password.trim() ? 'password' : undefined,
				].filter(Boolean);

				if (padded.length > 0) {
					return {
						status: 'OK',
						message: `Saved, but the ${padded.join(' and ')} starts or ends with a space. That is allowed, and it is compared exactly as entered, so Billomat must have the same spaces or the webhook will be rejected.`,
					};
				}

				return {
					status: 'OK',
					message:
						'Saved. These values are checked against incoming webhook requests. Billomat offers no endpoint to verify them, so make sure they match what you entered there.',
				};
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const headers = this.getHeaderData() as IDataObject;
		const options = this.getNodeParameter('options', {}) as IDataObject;

		if ((this.getNodeParameter('authentication') as string) === 'basicAuth') {
			await assertBasicAuth.call(this, headers);
		}

		const event = headers['x-billomat-webhook-event'] as string | undefined;
		const events = this.getNodeParameter('events') as string[];

		// An empty selection means "every event". Anything else is filtered, and a
		// non-matching call still has to be answered with 2xx or Billomat retries it
		// and eventually disables the webhook.
		if (events.length > 0 && (event === undefined || !events.includes(event))) {
			// Returning without workflowData answers 200 without starting the workflow.
			return { webhookResponse: 'OK' };
		}

		const body = this.getBodyData();

		if (typeof body !== 'object' || body === null || Object.keys(body).length === 0) {
			throw new NodeOperationError(
				this.getNode(),
				'Received an empty or unparsable webhook body. Set the webhook format in Billomat under Settings > Webhooks to JSON.',
			);
		}

		const json: IDataObject = options.rawBody
			? normalizeEmptyValues(body as IDataObject)
			: unwrapWebhookBody(body as IDataObject, event);

		if (options.includeHeaders) {
			json.headers = redactSecretHeaders(headers);
		}

		return {
			workflowData: [[{ json }]],
		};
	}
}

/**
 * Headers that carry credentials and must never reach workflow data, where they would
 * also end up in execution logs. When basic auth is configured, `authorization` holds
 * exactly the user and password of the webhook, only base64 encoded.
 *
 * Node lowercases incoming header names, but the comparison is case-insensitive anyway
 * so this keeps working if that ever changes or a proxy rewrites them.
 */
const SECRET_HEADERS = ['authorization', 'proxy-authorization', 'cookie'];

function redactSecretHeaders(headers: IDataObject): IDataObject {
	return Object.fromEntries(
		Object.entries(headers).map(([name, value]) =>
			SECRET_HEADERS.includes(name.toLowerCase()) ? [name, '[redacted]'] : [name, value],
		),
	);
}

/**
 * Billomat wraps the affected object the same way the REST API does, e.g.
 * `{"invoice": {...}}`. Flatten that into `{event, resource, data}`.
 */
function unwrapWebhookBody(body: IDataObject, event: string | undefined): IDataObject {
	const keys = Object.keys(body);
	const resource = keys.length === 1 ? keys[0] : undefined;
	const data = resource === undefined ? body : (body[resource] as IDataObject);

	return {
		event: event ?? null,
		resource: resource ?? null,
		data: normalizeEmptyValues(data),
	};
}

async function assertBasicAuth(
	this: IWebhookFunctions,
	headers: IDataObject,
): Promise<void> {
	const credentials = await this.getCredentials('billomatWebhookAuthApi');
	const authHeader = headers.authorization as string | undefined;

	const expected =
		'Basic ' +
		Buffer.from(`${credentials.user as string}:${credentials.password as string}`).toString(
			'base64',
		);

	if (authHeader !== expected) {
		throw new NodeOperationError(
			this.getNode(),
			'Authorization failed. The request did not carry the configured basic auth credentials.',
		);
	}
}
