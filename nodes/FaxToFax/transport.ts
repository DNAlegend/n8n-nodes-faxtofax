import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

type Ctx = IExecuteFunctions | IPollFunctions;

// FaxToFax's API is JSON-RPC over HTTPS (its MCP endpoint), authenticated with an API key.
export async function callTool(
	ctx: Ctx,
	name: string,
	args: IDataObject = {},
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method: 'POST',
		url: 'https://faxtofax.com/api/mcp',
		json: true,
		body: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } },
	};
	const res = (await ctx.helpers.httpRequestWithAuthentication.call(
		ctx,
		'faxToFaxApi',
		options,
	)) as IDataObject;
	if (res.error) {
		throw new NodeApiError(ctx.getNode(), res.error as JsonObject);
	}
	const result = (res.result ?? {}) as IDataObject;
	const content = (result.content ?? []) as IDataObject[];
	const text = content.find((c) => c.type === 'text')?.text as string | undefined;
	if (result.isError) {
		throw new NodeApiError(
			ctx.getNode(),
			{ message: text ?? 'FaxToFax returned an error' } as JsonObject,
			{
				message: text ?? 'FaxToFax returned an error',
			},
		);
	}
	if (result.structuredContent) return result.structuredContent as IDataObject;
	const resource = content.find((c) => c.type === 'resource')?.resource as IDataObject | undefined;
	if (resource) return resource;
	return text ? (JSON.parse(text) as IDataObject) : {};
}

export function clean(o: IDataObject): IDataObject {
	return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ''));
}
