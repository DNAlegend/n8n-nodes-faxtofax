'use strict';
const { callTool, clean } = require('./shared');

class FaxToFax {
  constructor() {
    this.description = {
      displayName: 'FaxToFax', name: 'faxToFax', icon: 'file:faxtofax.png', group: ['output'], version: 1,
      subtitle: '={{$parameter["operation"]}}',
      description: 'Send faxes and check fax status with FaxToFax',
      defaults: { name: 'FaxToFax' }, inputs: ['main'], outputs: ['main'], usableAsTool: true,
      credentials: [{ name: 'faxToFaxApi', required: true }],
      properties: [
        { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true, default: 'send',
          options: [
            { name: 'Send Fax', value: 'send', action: 'Send a fax' },
            { name: 'Get Fax Status', value: 'get', action: 'Get a fax status' },
            { name: 'List Faxes', value: 'list', action: 'List faxes' },
            { name: 'Download Fax PDF', value: 'download', action: 'Download a fax PDF' },
          ] },
        { displayName: 'To', name: 'to', type: 'string', default: '', required: true, placeholder: '+14165551234',
          description: 'Recipient fax number. 10-digit numbers are read as US/Canada.', displayOptions: { show: { operation: ['send'] } } },
        { displayName: 'Document', name: 'source', type: 'options', default: 'binary', displayOptions: { show: { operation: ['send'] } },
          options: [{ name: 'File From Previous Node', value: 'binary' }, { name: 'File URL', value: 'url' }, { name: 'Text Only', value: 'none' }] },
        { displayName: 'Input Binary Field', name: 'binaryProperty', type: 'string', default: 'data',
          displayOptions: { show: { operation: ['send'], source: ['binary'] } } },
        { displayName: 'File URL', name: 'fileUrl', type: 'string', default: '', placeholder: 'https://…/referral.pdf',
          displayOptions: { show: { operation: ['send'], source: ['url'] } } },
        { displayName: 'Additional Fields', name: 'extra', type: 'collection', default: {}, placeholder: 'Add Field',
          displayOptions: { show: { operation: ['send'] } },
          options: [
            { displayName: 'From Number', name: 'from_number', type: 'string', default: '', description: 'Which of your FaxToFax numbers to send from' },
            { displayName: 'Recipient Name', name: 'recipient_name', type: 'string', default: '' },
            { displayName: 'Subject', name: 'subject', type: 'string', default: '' },
            { displayName: 'Text', name: 'document_text', type: 'string', typeOptions: { rows: 4 }, default: '', description: 'Plain text to fax, laid out on pages for you' },
            { displayName: 'Cover Note', name: 'cover_note', type: 'string', typeOptions: { rows: 3 }, default: '', description: 'Adds a cover page with this message' },
          ] },
        { displayName: 'Fax ID', name: 'faxId', type: 'string', default: '', required: true,
          displayOptions: { show: { operation: ['get', 'download'] } } },
        { displayName: 'Direction', name: 'direction', type: 'options', default: '', displayOptions: { show: { operation: ['list'] } },
          options: [{ name: 'Both', value: '' }, { name: 'Received', value: 'inbound' }, { name: 'Sent', value: 'outbound' }] },
        { displayName: 'Search', name: 'query', type: 'string', default: '', description: 'Name, number or subject', displayOptions: { show: { operation: ['list'] } } },
        { displayName: 'Limit', name: 'limit', type: 'number', typeOptions: { minValue: 1, maxValue: 100 }, default: 20, description: 'Max number of results to return', displayOptions: { show: { operation: ['list'] } } },
      ],
    };
  }

  async execute() {
    const items = this.getInputData(), out = [];
    for (let i = 0; i < items.length; i++) {
      try {
        const op = this.getNodeParameter('operation', i);
        if (op === 'send') {
          const args = clean({ to: this.getNodeParameter('to', i), ...this.getNodeParameter('extra', i, {}) });
          const source = this.getNodeParameter('source', i);
          if (source === 'binary') {
            const prop = this.getNodeParameter('binaryProperty', i);
            const meta = this.helpers.assertBinaryData(i, prop);
            const buf = await this.helpers.getBinaryDataBuffer(i, prop);
            args.document_base64 = buf.toString('base64');
            args.document_filename = meta.fileName || 'document.pdf';
          } else if (source === 'url') {
            const url = this.getNodeParameter('fileUrl', i);
            args.document_file = { download_url: url, file_id: 'n8n', file_name: decodeURIComponent(new URL(url).pathname.split('/').pop() || 'document.pdf') };
          }
          if (!args.document_base64 && !args.document_file && !args.document_text && !args.cover_note) throw new Error('Add a file, Text, or a Cover Note.');
          out.push({ json: await callTool(this, 'send_fax', args), pairedItem: i });
        } else if (op === 'get') {
          out.push({ json: await callTool(this, 'get_fax_status', { fax_id: this.getNodeParameter('faxId', i) }), pairedItem: i });
        } else if (op === 'list') {
          const { faxes } = await callTool(this, 'list_faxes', clean({ direction: this.getNodeParameter('direction', i), query: this.getNodeParameter('query', i), limit: this.getNodeParameter('limit', i) }));
          for (const f of faxes) out.push({ json: f, pairedItem: i });
        } else if (op === 'download') {
          const id = this.getNodeParameter('faxId', i);
          const r = await callTool(this, 'get_fax_document', { fax_id: id });
          const data = await this.helpers.prepareBinaryData(Buffer.from(r.blob, 'base64'), `fax-${id}.pdf`, 'application/pdf');
          out.push({ json: { fax_id: id }, binary: { data }, pairedItem: i });
        }
      } catch (e) {
        if (this.continueOnFail()) { out.push({ json: { error: e.message }, pairedItem: i }); continue; }
        throw e;
      }
    }
    return [out];
  }
}
module.exports = { FaxToFax };
