import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

/**
 * Billomat can call a webhook URL that is protected with HTTP basic auth. The Billomat
 * Trigger node compares incoming requests against these values.
 *
 * This is deliberately a package-local credential rather than n8n's built-in
 * `httpBasicAuth`: community nodes may only reference credentials declared in their own
 * package.
 *
 * There is nothing to test these against: they are checked on incoming requests rather
 * than sent anywhere, so the credential has no `test` request.
 */
// eslint-disable-next-line @n8n/community-nodes/credential-test-required
export class BillomatWebhookAuthApi implements ICredentialType {
	name = 'billomatWebhookAuthApi';

	displayName = 'Billomat Webhook Auth API';

	documentationUrl =
		'https://github.com/martinhey/n8n-nodes-billomat?tab=readme-ov-file#billomat-trigger';

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
