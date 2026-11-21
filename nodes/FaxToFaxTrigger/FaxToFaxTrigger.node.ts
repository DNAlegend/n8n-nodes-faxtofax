import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { callTool } from '../FaxToFax/transport';

export class FaxToFaxTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FaxToFax Trigger',
		name: 'faxToFaxTrigger',
		icon: { light: 'file:../../icons/faxtofax.svg', dark: 'file:../../icons/faxtofax.dark.svg' },
		group: ['trigger'],
		subtitle: '={{$parameter["event"]}}',
		version: 1,
		description: 'Starts the workflow when a fax arrives, or when a sent fax is delivered or fails',
		defaults: { name: 'FaxToFax Trigger' },
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'faxToFaxApi', required: true }],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				default: 'received',
				options: [
					{ name: 'New Fax Received', value: 'received' },
					{ name: 'Fax Delivered or Failed', value: 'finished' },
				],
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const event = this.getNodeParameter('event') as string;
		const state = this.getWorkflowStaticData('node');
		const manual = this.getMode() === 'manual';
		const res = await callTool(this, 'list_faxes', {
			direction: event === 'received' ? 'inbound' : 'outbound',
			limit: manual ? 1 : 100,
		});
		const ready = ((res.faxes ?? []) as IDataObject[]).filter(
			(f) => event === 'received' || f.status === 'delivered' || f.status === 'failed',
		);
		if (manual) return ready.length ? [[{ json: ready[0] }]] : null;
		const first = !state.seen; // first run: remember what's there, emit nothing
		const seen = (state.seen ?? {}) as Record<string, number>;
		const fresh = ready.filter((f) => !seen[f.fax_id as string]).reverse();
		for (const f of fresh) seen[f.fax_id as string] = Date.now();
		state.seen = Object.fromEntries(
			Object.entries(seen)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 500),
		);
		if (first || !fresh.length) return null;
		return [fresh.map((json) => ({ json }))];
	}
}
