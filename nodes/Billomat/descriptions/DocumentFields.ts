import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import {
	NET_GROSS_OPTIONS,
	additionalFields,
	filterFields,
	idField,
	orderByField,
	tagsFilterField,
} from './SharedFields';

/**
 * Invoices, estimates and credit notes are the same document type in Billomat with a
 * different endpoint and a different status model. Everything they share lives here so
 * the per-resource files only carry what actually differs.
 */

/** Fields accepted when creating or updating any of the three document types. */
export function documentCommonFieldOptions(): INodeProperties[] {
	return [
		{
			displayName: 'Contact ID',
			name: 'contact_id',
			type: 'string',
			default: '',
			description: 'ID of the contact of the client to address the document to',
		},
		{
			displayName: 'Currency Code',
			name: 'currency_code',
			type: 'string',
			default: '',
			placeholder: 'EUR',
			description: 'ISO currency code. Defaults to the account currency.',
		},
		{
			displayName: 'Date',
			name: 'date',
			type: 'dateTime',
			default: '',
			description: 'Document date. Defaults to today.',
		},
		{
			displayName: 'Free Text ID',
			name: 'free_text_id',
			type: 'string',
			default: '',
			description: 'ID of the free text used to preset title, label, intro and note',
		},
		{
			displayName: 'Intro',
			name: 'intro',
			type: 'string',
			typeOptions: { rows: 3 },
			default: '',
			description: 'Introductory text shown above the line items',
		},
		{
			displayName: 'Label',
			name: 'label',
			type: 'string',
			default: '',
			description: 'Label text describing the project',
		},
		{
			displayName: 'Net or Gross',
			name: 'net_gross',
			type: 'options',
			options: NET_GROSS_OPTIONS,
			default: 'NET',
			description: 'Whether the line item prices are net or gross',
		},
		{
			displayName: 'Note',
			name: 'note',
			type: 'string',
			typeOptions: { rows: 3 },
			default: '',
			description: 'Explanatory notes shown below the line items',
		},
		{
			displayName: 'Number',
			name: 'number',
			type: 'number',
			default: 0,
			description: 'Serial number. Defaults to the next free number.',
		},
		{
			displayName: 'Number Length',
			name: 'number_length',
			type: 'number',
			default: 0,
			description: 'Minimum length of the document number, padded with leading zeros',
		},
		{
			displayName: 'Number Prefix',
			name: 'number_pre',
			type: 'string',
			default: '',
			placeholder: 'RE',
		},
		{
			displayName: 'Quote',
			name: 'quote',
			type: 'number',
			default: 1,
			description: 'Currency quote used to convert into the account currency',
		},
		{
			displayName: 'Reduction',
			name: 'reduction',
			type: 'string',
			default: '',
			placeholder: '10%',
			description: 'Reduction as an absolute amount or a percentage, for example 10 or 10%',
		},
		{
			displayName: 'Template ID',
			name: 'template_id',
			type: 'string',
			default: '',
			description: 'ID of the template used to render the PDF',
		},
		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			default: '',
			description: 'Title of the document',
		},
	];
}

/** Filters every document list endpoint accepts. */
export function documentCommonFilterOptions(
	numberField: { name: string; displayName: string },
	statusOptions: INodePropertyOptions[],
): INodeProperties[] {
	return [
		{
			displayName: 'Article ID',
			name: 'article_id',
			type: 'string',
			default: '',
			description: 'Only return documents containing this article',
		},
		{
			displayName: 'Client ID',
			name: 'client_id',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Contact ID',
			name: 'contact_id',
			type: 'string',
			default: '',
		},
		{
			displayName: 'From',
			name: 'from',
			type: 'dateTime',
			default: '',
			description: 'Only return documents dated on or after this date',
		},
		{
			displayName: 'Intro',
			name: 'intro',
			type: 'string',
			default: '',
			description: 'Free text search in the introductory text',
		},
		{
			displayName: 'Label',
			name: 'label',
			type: 'string',
			default: '',
			description: 'Free text search in the label text',
		},
		{
			displayName: 'Note',
			name: 'note',
			type: 'string',
			default: '',
			description: 'Free text search in the explanatory notes',
		},
		{
			displayName: numberField.displayName,
			name: numberField.name,
			type: 'string',
			default: '',
			description: 'Partial match on the document number, case insensitive',
		},
		{
			displayName: 'Status',
			name: 'status',
			type: 'multiOptions',
			options: statusOptions,
			default: [],
			description: 'Only return documents in any of the selected statuses',
		},
		{
			displayName: 'To',
			name: 'to',
			type: 'dateTime',
			default: '',
			description: 'Only return documents dated on or before this date',
		},
		orderByField,
		tagsFilterField,
	];
}

/**
 * The Client ID input plus the shared create/update/filter collections.
 */
export function documentCommonFields(
	resource: string,
	numberField: { name: string; displayName: string },
	statusOptions: INodePropertyOptions[],
	extra: {
		createOptions?: INodeProperties[];
		filterOptions?: INodeProperties[];
	} = {},
): INodeProperties[] {
	return [
		{
			displayName: 'Client ID',
			name: 'client_id',
			type: 'string',
			required: true,
			default: '',
			displayOptions: {
				show: {
					resource: [resource],
					operation: ['create'],
				},
			},
			description: 'ID of the client the document is issued to',
		},
		additionalFields(resource, ['create', 'update'], [
			...documentCommonFieldOptions(),
			...(extra.createOptions ?? []),
		]),
		filterFields(resource, [
			...documentCommonFilterOptions(numberField, statusOptions),
			...(extra.filterOptions ?? []),
		]),
	];
}

/** Line items that can be passed inline when creating a document. */
export function documentLineItemsField(resource: string, itemLabel: string): INodeProperties {
	return {
		displayName: 'Line Items',
		name: 'lineItems',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
			sortable: true,
		},
		placeholder: 'Add Line Item',
		default: {},
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['create'],
			},
		},
		description: `Line items to create together with the ${itemLabel}`,
		options: [
			{
				displayName: 'Item',
				name: 'item',
				values: lineItemValueFields(),
			},
		],
	};
}

/** The value fields of a single line item, shared by inline items and the item resources. */
export function lineItemValueFields(): INodeProperties[] {
	return [
		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Description',
			name: 'description',
			type: 'string',
			typeOptions: { rows: 2 },
			default: '',
		},
		{
			displayName: 'Quantity',
			name: 'quantity',
			type: 'number',
			default: 1,
		},
		{
			displayName: 'Unit',
			name: 'unit',
			type: 'string',
			default: '',
			placeholder: 'hour',
		},
		{
			displayName: 'Unit Price',
			name: 'unit_price',
			type: 'number',
			default: 0,
		},
		{
			displayName: 'Article ID',
			name: 'article_id',
			type: 'string',
			default: '',
			description: 'Presets the remaining values from the article on creation',
		},
		{
			displayName: 'Tax Name',
			name: 'tax_name',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Tax Rate',
			name: 'tax_rate',
			type: 'number',
			default: 0,
			description: 'Rate of taxation in percent',
		},
		{
			displayName: 'Reduction',
			name: 'reduction',
			type: 'string',
			default: '',
			placeholder: '10%',
			description: 'Reduction as an absolute amount or a percentage, for example 10 or 10%',
		},
	];
}

/** The `complete` operation takes an optional template override. */
export function completeFields(resource: string): INodeProperties[] {
	return [
		{
			displayName: 'Template ID',
			name: 'template_id',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					resource: [resource],
					operation: ['complete'],
				},
			},
			description:
				'ID of the template used to render the PDF. Defaults to the template set on the document.',
		},
	];
}

/** Properties for the "Get PDF" operation. */
export function pdfFields(resource: string): INodeProperties[] {
	return [
		{
			displayName: 'Put Output File in Field',
			name: 'binaryPropertyName',
			type: 'string',
			required: true,
			default: 'data',
			hint: 'The name of the output binary field to put the PDF in',
			displayOptions: {
				show: {
					resource: [resource],
					operation: ['getPdf'],
				},
			},
		},
	];
}

/** Properties for the "Send Email" operation. */
export function emailFields(resource: string): INodeProperties[] {
	return [
		{
			displayName: 'To',
			name: 'to',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'name@email.com',
			displayOptions: {
				show: {
					resource: [resource],
					operation: ['sendEmail'],
				},
			},
			description: 'Comma-separated list of recipient email addresses',
		},
		{
			displayName: 'Options',
			name: 'emailOptions',
			type: 'collection',
			placeholder: 'Add Option',
			default: {},
			displayOptions: {
				show: {
					resource: [resource],
					operation: ['sendEmail'],
				},
			},
			options: [
				{
					displayName: 'Attachments',
					name: 'attachmentsBinaryProperties',
					type: 'string',
					default: '',
					placeholder: 'data, data2',
					description: 'Comma-separated list of input binary fields to attach in addition to the document PDF',
				},
				{
					displayName: 'BCC',
					name: 'bcc',
					type: 'string',
					default: '',
					placeholder: 'name@email.com',
					description: 'Comma-separated list of BCC recipients',
				},
				{
					displayName: 'Body',
					name: 'body',
					type: 'string',
					typeOptions: { rows: 4 },
					default: '',
					description: 'Email body. May contain Billomat placeholders.',
				},
				{
					displayName: 'CC',
					name: 'cc',
					type: 'string',
					default: '',
					placeholder: 'name@email.com',
					description: 'Comma-separated list of CC recipients',
				},
				{
					displayName: 'Email Template ID',
					name: 'email_template_id',
					type: 'string',
					default: '',
				},
				{
					displayName: 'File Name',
					name: 'filename',
					type: 'string',
					default: '',
					description: 'Name of the attached PDF without the .pdf extension',
				},
				{
					displayName: 'From',
					name: 'from',
					type: 'string',
					default: '',
					placeholder: 'name@email.com',
					description: 'Sender address. Defaults to the address from the settings.',
				},
				{
					displayName: 'Subject',
					name: 'subject',
					type: 'string',
					default: '',
					description: 'Email subject. May contain Billomat placeholders.',
				},
			],
		},
	];
}

/** The ID input shared by every single-document operation. */
export function documentIdField(
	resource: string,
	operations: string[],
	label: string,
): INodeProperties {
	return idField(resource, operations, {
		description: `ID of the ${label}`,
	});
}
