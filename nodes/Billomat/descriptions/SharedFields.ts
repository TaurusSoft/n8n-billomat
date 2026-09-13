import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

/**
 * Sorts collection entries by label. Several field lists are assembled from shared
 * building blocks plus resource specific ones, so sorting once here keeps the rendered
 * dropdowns alphabetical without having to hand-order every composition.
 */
export function sortFields(fields: INodeProperties[]): INodeProperties[] {
	return [...fields].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function sortOptions(options: INodePropertyOptions[]): INodePropertyOptions[] {
	return [...options].sort((a, b) => a.name.localeCompare(b.name));
}

export const NET_GROSS_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Gross', value: 'GROSS' },
	{ name: 'Net', value: 'NET' },
];

export const SUPPLY_DATE_TYPE_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Delivery Date', value: 'DELIVERY_DATE', description: 'Delivery date as a date' },
	{ name: 'Delivery Text', value: 'DELIVERY_TEXT', description: 'Delivery date as free text' },
	{ name: 'Supply Date', value: 'SUPPLY_DATE', description: 'Supply date as a date' },
	{ name: 'Supply Text', value: 'SUPPLY_TEXT', description: 'Supply date as free text' },
];

/** Payment types that can be written. INVOICE_CORRECTION is set by Billomat itself. */
export const PAYMENT_TYPE_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Bank Card', value: 'BANK_CARD' },
	{ name: 'Bank Transfer', value: 'BANK_TRANSFER' },
	{ name: 'Cash', value: 'CASH' },
	{ name: 'Check', value: 'CHECK' },
	{ name: 'Coupon', value: 'COUPON' },
	{ name: 'Credit Card', value: 'CREDIT_CARD' },
	{ name: 'Credit Note', value: 'CREDIT_NOTE' },
	{ name: 'Debit', value: 'DEBIT' },
	{ name: 'Misc', value: 'MISC' },
	{ name: 'PayPal', value: 'PAYPAL' },
];

export const PAYMENT_TYPE_FILTER_OPTIONS: INodePropertyOptions[] = sortOptions([
	...PAYMENT_TYPE_OPTIONS,
	{ name: 'Invoice Correction', value: 'INVOICE_CORRECTION' },
]);

/**
 * The ID input every single-record operation needs.
 */
export function idField(
	resource: string,
	operations: string[],
	options: { name?: string; displayName?: string; description: string },
): INodeProperties {
	return {
		displayName: options.displayName ?? 'ID',
		name: options.name ?? 'itemId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [resource],
				operation: operations,
			},
		},
		description: options.description,
	};
}

/**
 * The Return All / Limit pair every "Get Many" operation needs.
 */
export function paginationFields(resource: string): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			displayOptions: {
				show: {
					resource: [resource],
					operation: ['getAll'],
				},
			},
			description: 'Whether to return all results or only up to a given limit',
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: {
				minValue: 1,
			},
			displayOptions: {
				show: {
					resource: [resource],
					operation: ['getAll'],
					returnAll: [false],
				},
			},
			description: 'Max number of results to return',
		},
	];
}

/**
 * Wraps a list of fields in an "Additional Fields" collection for create/update.
 */
export function additionalFields(
	resource: string,
	operations: string[],
	fields: INodeProperties[],
): INodeProperties {
	return {
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [resource],
				operation: operations,
			},
		},
		options: sortFields(fields),
	};
}

/**
 * Wraps a list of fields in a "Filters" collection for getAll.
 */
export function filterFields(resource: string, fields: INodeProperties[]): INodeProperties {
	return {
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['getAll'],
			},
		},
		options: sortFields(fields),
	};
}

/**
 * The order_by filter Billomat supports on every list endpoint.
 */
export const orderByField: INodeProperties = {
	displayName: 'Order By',
	name: 'order_by',
	type: 'string',
	default: '',
	placeholder: 'date DESC, invoice_number ASC',
	description: 'Sort order as a comma-separated list of field and direction pairs. Ascending is used when no direction is given.',
};

/** The tags filter Billomat supports on most document endpoints. */
export const tagsFilterField: INodeProperties = {
	displayName: 'Tags',
	name: 'tags',
	type: 'string',
	default: '',
	description: 'Comma-separated list of tags',
};

/** Postal address and contact details shared by clients, suppliers and contacts. */
export function addressFieldOptions(): INodeProperties[] {
	return [
		{
			displayName: 'City',
			name: 'city',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Country Code',
			name: 'country_code',
			type: 'string',
			default: '',
			placeholder: 'DE',
			description: 'Country as an ISO 3166 Alpha-2 code',
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			placeholder: 'name@email.com',
			default: '',
		},
		{
			displayName: 'Fax',
			name: 'fax',
			type: 'string',
			default: '',
		},
		{
			displayName: 'First Name',
			name: 'first_name',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Last Name',
			name: 'last_name',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Mobile',
			name: 'mobile',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Phone',
			name: 'phone',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Salutation',
			name: 'salutation',
			type: 'string',
			default: '',
		},
		{
			displayName: 'State',
			name: 'state',
			type: 'string',
			default: '',
			description: 'State, county, district or region',
		},
		{
			displayName: 'Street',
			name: 'street',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Website',
			name: 'www',
			type: 'string',
			default: '',
			placeholder: 'www.example.com',
			description: 'Website without the protocol',
		},
		{
			displayName: 'ZIP Code',
			name: 'zip',
			type: 'string',
			default: '',
		},
	];
}

/** Bank details shared by clients and suppliers. */
export function bankFieldOptions(): INodeProperties[] {
	return [
		{
			displayName: 'Bank Account Number',
			name: 'bank_account_number',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Bank Account Owner',
			name: 'bank_account_owner',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Bank IBAN',
			name: 'bank_iban',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Bank Name',
			name: 'bank_name',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Bank Number',
			name: 'bank_number',
			type: 'string',
			default: '',
			description: 'Bank identifier code',
		},
		{
			displayName: 'Bank SWIFT/BIC',
			name: 'bank_swift',
			type: 'string',
			default: '',
		},
	];
}

/** Tax identifiers shared by clients and suppliers. */
export function taxIdFieldOptions(): INodeProperties[] {
	return [
		{
			displayName: 'Tax Number',
			name: 'tax_number',
			type: 'string',
			default: '',
		},
		{
			displayName: 'VAT Number',
			name: 'vat_number',
			type: 'string',
			default: '',
		},
	];
}
