# n8n-nodes-faxtofax

Send and receive faxes in [n8n](https://n8n.io) with [FaxToFax](https://faxtofax.com).

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Example workflows](#example-workflows) · [Compatibility](#compatibility) · [Resources](#resources)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/): in n8n go to **Settings → Community Nodes → Install** and enter `n8n-nodes-faxtofax`.

## Credentials

1. Sign in to [FaxToFax](https://faxtofax.com). API keys come with the monthly plans.
2. Go to **Settings → API keys** and create a key. It starts with `ftf_live_`. Copy it, because it's shown only once.
3. In n8n, create a **FaxToFax API** credential and paste the key. n8n checks the key when you save it.

The key acts as the person who created it, with that person's fax numbers and permissions. Revoke it any time in FaxToFax.

## Operations

### FaxToFax node
- **Send Fax**: send to one fax number. The document can be a file from a previous node, a file URL, plain text, or just a cover note. Optional: from number, recipient name, subject, cover note.
- **Get Fax Status**: queued, sending, delivered or failed (with the reason).
- **List Faxes**: recent sent and received faxes, newest first, with search by name, number or subject.
- **Download Fax PDF**: the PDF of a sent or received fax, as binary data.

The node can also be used as a tool by n8n AI agents.

### FaxToFax Trigger
- **New Fax Received**: starts the workflow when a fax arrives on one of your numbers.
- **Fax Delivered or Failed**: starts the workflow when a fax you sent finishes.

The trigger checks for new faxes on the schedule you choose (polling). On its first run it remembers the faxes already there, so only new ones start the workflow.

## Example workflows

**Save every received fax to Google Drive**
1. FaxToFax Trigger: *New Fax Received*
2. FaxToFax: *Download Fax PDF*, Fax ID `{{ $json.fax_id }}`
3. Google Drive: *Upload File*

**Fax a PDF that arrives by email**
1. Gmail Trigger (with attachments downloaded)
2. FaxToFax: *Send Fax*, Document *File From Previous Node*, Input Binary Field `attachment_0`

**Get a Slack message when a fax fails**
1. FaxToFax Trigger: *Fax Delivered or Failed*
2. If: `{{ $json.status }}` equals `failed`
3. Slack: *Send Message* with `{{ $json.error }}`

## Compatibility

Built with the official n8n node CLI. Needs a FaxToFax monthly plan for API keys.

## Resources

- [FaxToFax](https://faxtofax.com)
- [FaxToFax API and AI agents](https://faxtofax.com/integrations/mcp)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](LICENSE)
