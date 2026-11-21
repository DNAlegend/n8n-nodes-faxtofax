import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FaxToFaxApi implements ICredentialType {
	name = 'faxToFaxApi';

	displayName = 'FaxToFax API';

	icon: Icon = { light: 'file:../icons/faxtofax.svg', dark: 'file:../icons/faxtofax.dark.svg' };

	documentationUrl =
		'https://github.com/DNAlegend/n8n-nodes-faxtofax?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Create one in FaxToFax under Settings → API keys. It starts with ftf_live_.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials?.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://faxtofax.com',
			url: '/api/mcp',
			method: 'POST',
			body: {
				jsonrpc: '2.0',
				id: 1,
				method: 'tools/call',
				params: { name: 'list_numbers', arguments: {} },
			},
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'result.isError',
					value: true,
					message: 'This API key cannot read fax numbers',
				},
			},
		],
	};
}
