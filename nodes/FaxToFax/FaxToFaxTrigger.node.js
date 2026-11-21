'use strict';
const { callTool } = require('./shared');

class FaxToFaxTrigger {
  constructor() {
    this.description = {
      displayName: 'FaxToFax Trigger', name: 'faxToFaxTrigger', icon: 'file:faxtofax.png', group: ['trigger'], version: 1,
      description: 'Starts a workflow when a fax arrives, or when a sent fax is delivered or fails',
      defaults: { name: 'FaxToFax Trigger' }, inputs: [], outputs: ['main'], polling: true,
      credentials: [{ name: 'faxToFaxApi', required: true }],
      properties: [
        { displayName: 'Event', name: 'event', type: 'options', default: 'received',
          options: [
            { name: 'New Fax Received', value: 'received' },
            { name: 'Fax Delivered or Failed', value: 'finished' },
          ] },
      ],
    };
  }

  async poll() {
    const event = this.getNodeParameter('event');
    const state = this.getWorkflowStaticData('node');
    const manual = this.getMode() === 'manual';
    const { faxes } = await callTool(this, 'list_faxes', { direction: event === 'received' ? 'inbound' : 'outbound', limit: manual ? 1 : 100 });
    const ready = faxes.filter((f) => event === 'received' || ['delivered', 'failed'].includes(f.status));
    if (manual) return ready.length ? [ready.slice(0, 1).map((json) => ({ json }))] : null;
    const seen = state.seen || {};
    const first = !state.seen; // first run: remember what's there, emit nothing
    const fresh = ready.filter((f) => !seen[f.fax_id]).reverse();
    for (const f of fresh) seen[f.fax_id] = Date.now();
    state.seen = Object.fromEntries(Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, 500));
    if (first || !fresh.length) return null;
    return [fresh.map((json) => ({ json }))];
  }
}
module.exports = { FaxToFaxTrigger };
