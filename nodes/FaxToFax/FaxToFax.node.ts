import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { callTool, clean } from './transport';

export class FaxToFax implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FaxToFax',
		name: 'faxToFax',
		icon: { light: 'file:../../icons/faxtofax.svg', dark: 'file:../../icons/faxtofax.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Send faxes and check fax status with FaxToFax',
		defaults: { name: 'FaxToFax' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'faxToFaxApi', required: true }],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'send',
				options: [
					{
						name: 'Download Fax PDF',
						value: 'download',
						action: 'Download a fax PDF',
						description: 'Get the PDF of a sent or received fax',
					},
					{
						name: 'Get Fax Status',
						value: 'get',
						action: 'Get a fax status',
						description: 'Check whether a fax was delivered',
					},
					{
						name: 'List Faxes',
						value: 'list',
						action: 'List faxes',
						description: 'List recent sent and received faxes',
					},
					{
						name: 'Send Fax',
						value: 'send',
						action: 'Send a fax',
						description: 'Send a fax to one fax number',
					},
				],
			},
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				default: '',
				required: true,
				placeholder: '+14165551234',
				description: 'The recipient fax number. 10-digit numbers are read as US/Canada.',
				displayOptions: { show: { operation: ['send'] } },
			},
			{
				displayName: 'Document',
				name: 'source',
				type: 'options',
				default: 'binary',
				displayOptions: { show: { operation: ['send'] } },
				options: [
					{ name: 'File From Previous Node', value: 'binary' },
					{ name: 'File URL', value: 'url' },
					{ name: 'Text Only', value: 'none' },
				],
			},
			{
				displayName: 'Input Binary Field',
				name: 'binaryProperty',
				type: 'string',
				default: 'data',
				description: 'The name of the input field that holds the file',
				displayOptions: { show: { operation: ['send'], source: ['binary'] } },
			},
			{
				displayName: 'File URL',
				name: 'fileUrl',
				type: 'string',
				default: '',
				placeholder: 'https://example.com/referral.pdf',
				displayOptions: { show: { operation: ['send'], source: ['url'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'extra',
				type: 'collection',
				default: {},
				placeholder: 'Add Field',
				displayOptions: { show: { operation: ['send'] } },
				options: [
					{
						displayName: 'Cover Note',
						name: 'cover_note',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description: 'Adds a cover page with this message',
					},
					{
						displayName: 'From Number',
						name: 'from_number',
						type: 'string',
						default: '',
						description: 'Which of your FaxToFax numbers to send from',
					},
					{
						displayName: 'Recipient Name',
						name: 'recipient_name',
						type: 'string',
						default: '',
						description: 'Shown on the cover page',
					},
					{ displayName: 'Subject', name: 'subject', type: 'string', default: '' },
					{
						displayName: 'Text',
						name: 'document_text',
						type: 'string',
						typeOptions: { rows: 4 },
						default: '',
						description: 'Plain text to fax, laid out on pages for you',
					},
				],
			},
			{
				displayName: 'Fax ID',
				name: 'faxId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['get', 'download'] } },
			},
			{
				displayName: 'Direction',
				name: 'direction',
				type: 'options',
				default: '',
				displayOptions: { show: { operation: ['list'] } },
				options: [
					{ name: 'Both', value: '' },
					{ name: 'Received', value: 'inbound' },
					{ name: 'Sent', value: 'outbound' },
				],
			},
			{
				displayName: 'Search',
				name: 'query',
				type: 'string',
				default: '',
				description: 'Search by name, number or subject',
				displayOptions: { show: { operation: ['list'] } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 50,
				description: 'Max number of results to return',
				displayOptions: { show: { operation: ['list'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			try {
				const op = this.getNodeParameter('operation', i) as string;
				if (op === 'send') {
					const args = clean({
						to: this.getNodeParameter('to', i) as string,
						...(this.getNodeParameter('extra', i, {}) as IDataObject),
					});
					const source = this.getNodeParameter('source', i) as string;
					if (source === 'binary') {
						const prop = this.getNodeParameter('binaryProperty', i) as string;
						const meta = this.helpers.assertBinaryData(i, prop);
						const buf = await this.helpers.getBinaryDataBuffer(i, prop);
						args.document_base64 = buf.toString('base64');
						args.document_filename = meta.fileName ?? 'document.pdf';
					} else if (source === 'url') {
						const url = this.getNodeParameter('fileUrl', i) as string;
						const name = decodeURIComponent(
							new URL(url).pathname.split('/').pop() || 'document.pdf',
						);
						args.document_file = { download_url: url, file_id: 'n8n', file_name: name };
					}
					if (
						!args.document_base64 &&
						!args.document_file &&
						!args.document_text &&
						!args.cover_note
					) {
						throw new NodeOperationError(this.getNode(), 'Add a file, Text, or a Cover Note', {
							itemIndex: i,
						});
					}
					out.push({ json: await callTool(this, 'send_fax', args), pairedItem: { item: i } });
				} else if (op === 'get') {
					const json = await callTool(this, 'get_fax_status', {
						fax_id: this.getNodeParameter('faxId', i) as string,
					});
					out.push({ json, pairedItem: { item: i } });
				} else if (op === 'list') {
					const res = await callTool(
						this,
						'list_faxes',
						clean({
							direction: this.getNodeParameter('direction', i) as string,
							query: this.getNodeParameter('query', i) as string,
							limit: this.getNodeParameter('limit', i) as number,
						}),
					);
					for (const f of (res.faxes ?? []) as IDataObject[])
						out.push({ json: f, pairedItem: { item: i } });
				} else if (op === 'download') {
					const id = this.getNodeParameter('faxId', i) as string;
					const r = await callTool(this, 'get_fax_document', { fax_id: id });
					const data = await this.helpers.prepareBinaryData(
						Buffer.from(r.blob as string, 'base64'),
						`fax-${id}.pdf`,
						'application/pdf',
					);
					out.push({ json: { fax_id: id }, binary: { data }, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}
		return [out];
	}
}
