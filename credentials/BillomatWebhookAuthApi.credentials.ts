import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

/**
 * Billomat can call a webhook URL that is protected with HTTP basic auth. The Billomat
 * Trigger node compares incoming requests against these values.
 *
 * This is deliberately a package-local credential rather than n8n's built-in
 * `httpBasicAuth`: community nodes may only reference credentials declared in their own
 * package.
 *
 * There is no `test` request here: these values are compared against incoming requests
 * rather than sent anywhere, so there is no endpoint to call. The Billomat Trigger node
 * checks them through `testedBy` instead.
 */
export class BillomatWebhookAuthApi implements ICredentialType {
	name = 'billomatWebhookAuthApi';

	displayName = 'Billomat Webhook Auth API';

	documentationUrl =
		'https://github.com/TaurusSoft/n8n-billomat?tab=readme-ov-file#billomat-trigger';

	icon: Icon = {
		light: 'file:../nodes/Billomat/billomat.svg',
		dark: 'file:../nodes/Billomat/billomat.dark.svg',
	};

	properties: INodeProperties[] = [
		{
			displayName: 'User',
			name: 'user',
			type: 'string',
			required: true,
			default: '',
			description: 'The user name entered for the webhook in Billomat',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description: 'The password entered for the webhook in Billomat',
		},
	];
}
