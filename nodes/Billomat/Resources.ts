/**
 * Maps each node resource onto its Billomat endpoint and the JSON keys the API wraps
 * payloads in. Billomat derives those keys from its XML schema, so they are hyphenated
 * (`credit-note`) while the node uses camelCase resource names.
 */
export interface BillomatResource {
	/** Path segment below `/api`, e.g. `credit-notes` */
	endpoint: string;
	/** Key wrapping a single record, e.g. `credit-note` */
	itemKey: string;
	/** Key wrapping a list envelope, e.g. `credit-notes` */
	listKey: string;
	/**
	 * Keys used to pass line items inline when creating the document. Only the four
	 * document types support this.
	 */
	inlineItems?: { listKey: string; itemKey: string };
}

export const RESOURCES: Record<string, BillomatResource> = {
	article: { endpoint: 'articles', itemKey: 'article', listKey: 'articles' },
	client: { endpoint: 'clients', itemKey: 'client', listKey: 'clients' },
	contact: { endpoint: 'contacts', itemKey: 'contact', listKey: 'contacts' },
	creditNote: {
		endpoint: 'credit-notes',
		itemKey: 'credit-note',
		listKey: 'credit-notes',
		inlineItems: { listKey: 'credit-note-items', itemKey: 'credit-note-item' },
	},
	estimate: {
		endpoint: 'offers',
		itemKey: 'offer',
		listKey: 'offers',
		inlineItems: { listKey: 'offer-items', itemKey: 'offer-item' },
	},
	incoming: { endpoint: 'incomings', itemKey: 'incoming', listKey: 'incomings' },
	invoice: {
		endpoint: 'invoices',
		itemKey: 'invoice',
		listKey: 'invoices',
		inlineItems: { listKey: 'invoice-items', itemKey: 'invoice-item' },
	},
	invoiceComment: {
		endpoint: 'invoice-comments',
		itemKey: 'invoice-comment',
		listKey: 'invoice-comments',
	},
	invoiceItem: { endpoint: 'invoice-items', itemKey: 'invoice-item', listKey: 'invoice-items' },
	invoicePayment: {
		endpoint: 'invoice-payments',
		itemKey: 'invoice-payment',
		listKey: 'invoice-payments',
	},
	recurring: {
		endpoint: 'recurrings',
		itemKey: 'recurring',
		listKey: 'recurrings',
		inlineItems: { listKey: 'recurring-items', itemKey: 'recurring-item' },
	},
	recurringItem: {
		endpoint: 'recurring-items',
		itemKey: 'recurring-item',
		listKey: 'recurring-items',
	},
	supplier: { endpoint: 'suppliers', itemKey: 'supplier', listKey: 'suppliers' },
};
