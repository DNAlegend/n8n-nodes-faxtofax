import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

type Ctx = IExecuteFunctions | IPollFunctions;

export const BASE_URL = 'https://faxtofax.com/api/v1';

// FaxToFax REST API v1 (see README), authenticated with an API key.
// FaxToFax answers errors as { "error": "<a plain-English sentence>" }: show that sentence, not a generic HTTP message.
function apiError(ctx: Ctx, error: unknown): NodeApiError {
	const e = error as { response?: { body?: unknown; data?: unknown } };
	let body = e.response?.body ?? e.response?.data;
	if (typeof body === 'string') {
		try {
			body = JSON.parse(body);
		} catch {
			body = undefined;
		}
	}
	const message = (body as IDataObject | undefined)?.error as string | undefined;
	return new NodeApiError(ctx.getNode(), error as JsonObject, message ? { message } : undefined);
}

export async function apiRequest(
	ctx: Ctx,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<IDataObject> {
	const options: IHttpRequestOptions = { method, url: `${BASE_URL}${path}`, json: true };
	if (body) options.body = body;
	if (qs) options.qs = qs;
	try {
		return (await ctx.helpers.httpRequestWithAuthentication.call(
			ctx,
			'faxToFaxApi',
			options,
		)) as IDataObject;
	} catch (error) {
		throw apiError(ctx, error);
	}
}

export async function downloadPdf(ctx: IExecuteFunctions, id: string): Promise<Buffer> {
	try {
		const res = (await ctx.helpers.httpRequestWithAuthentication.call(ctx, 'faxToFaxApi', {
			method: 'GET',
			url: `${BASE_URL}/faxes/${encodeURIComponent(id)}/document`,
			encoding: 'arraybuffer',
			json: false,
		})) as ArrayBuffer;
		return Buffer.from(res);
	} catch (error) {
		throw apiError(ctx, error);
	}
}

export function clean(o: IDataObject): IDataObject {
	return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ''));
}
