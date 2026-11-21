'use strict';
class FaxToFaxApi {
  constructor() {
    this.name = 'faxToFaxApi';
    this.displayName = 'FaxToFax API';
    this.documentationUrl = 'https://faxtofax.com/integrations/mcp';
    this.properties = [{
      displayName: 'API Key', name: 'apiKey', type: 'string', typeOptions: { password: true }, default: '',
      description: 'Create one in FaxToFax under Settings → API keys (starts with ftf_live_)',
    }];
    this.authenticate = { type: 'generic', properties: { headers: { Authorization: '=Bearer {{$credentials.apiKey}}' } } };
    this.test = { request: { baseURL: 'https://faxtofax.com', url: '/api/mcp', method: 'POST',
      body: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'list_numbers', arguments: {} } } } };
  }
}
module.exports = { FaxToFaxApi };
