'use strict';
// FaxToFax's API is its MCP endpoint (JSON-RPC over HTTPS), authenticated with an API key.
async function callTool(ctx, name, args = {}) {
  const res = await ctx.helpers.httpRequestWithAuthentication.call(ctx, 'faxToFaxApi', {
    method: 'POST', url: 'https://faxtofax.com/api/mcp', json: true,
    body: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } },
  });
  if (res.error) throw new Error(res.error.message);
  const r = res.result || {};
  const text = (r.content || []).find((c) => c.type === 'text')?.text;
  if (r.isError) throw new Error(text || 'FaxToFax returned an error');
  if (r.structuredContent) return r.structuredContent;
  const blob = (r.content || []).find((c) => c.type === 'resource')?.resource;
  return blob || (text ? JSON.parse(text) : {});
}
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ''));
module.exports = { callTool, clean };
