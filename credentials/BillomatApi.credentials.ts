import type {
	Icon,
	ICredentialDataDecryptedObject,
	ICredentialTestRequest,
	ICredentialType,
	IHttpRequestOptions,
	INodeProperties,
} from 'n8n-workflow';

export class BillomatApi implements ICredentialType {
	name = 'billomatApi';

	displayName = 'Billomat API';

	icon: Icon = {
		light: 'file:../nodes/Billomat/billomat.svg',
		dark: 'file:../nodes/Billomat/billomat.dark.svg',
	};

	documentationUrl = 'https://github.com/TaurusSoft/n8n-billomat?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'Billomat ID',
			name: 'billomatId',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'mycompany',
			description:
				'The subdomain of your Billomat account. For https://mycompany.billomat.net enter "mycompany".',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Personal API key of a Billomat user. Enable API access under Settings > Employees to generate one.',
		},
		{
			displayName: 'App ID',
			name: 'appId',
			type: 'string',
			default: '',
			description:
				'Optional ID of a registered app (Settings > Administration > Apps). Registering an app raises the rate limit above the default of 300 requests per 15 minutes.',
		},
		{
			displayName: 'App Secret',
			name: 'appSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Optional secret belonging to the App ID',
		},
	];

	// A custom function is used instead of `IAuthenticateGeneric` so the optional app
	// headers are only sent when they actually have a value. Billomat rejects empty ones.
	authenticate = async (
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> => {
		// Everything is trimmed: keys are usually pasted, and a stray space would either
		// break authentication outright or, for the app headers, count as "set" and send
		// a value Billomat cannot attribute.
		const headers: Record<string, string> = {
			'X-BillomatApiKey': String(credentials.apiKey ?? '').trim(),
		};

		const appId = String(credentials.appId ?? '').trim();
		const appSecret = String(credentials.appSecret ?? '').trim();

		if (appId !== '') {
			headers['X-AppId'] = appId;
		}

		if (appSecret !== '') {
			headers['X-AppSecret'] = appSecret;
		}

		return {
			...requestOptions,
			headers: {
				...requestOptions.headers,
				...headers,
			},
		};
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials.billomatId}}.billomat.net/api',
			url: '/users/myself',
			headers: {
				Accept: 'application/json',
			},
		},
	};
}
