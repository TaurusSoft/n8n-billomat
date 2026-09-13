import type { INodeProperties } from 'n8n-workflow';

import {
	PAYMENT_TYPE_FILTER_OPTIONS,
	PAYMENT_TYPE_OPTIONS,
	SUPPLY_DATE_TYPE_OPTIONS,
	paginationFields,
} from './SharedFields';
import {
	completeFields,
	documentCommonFields,
	documentIdField,
	documentLineItemsField,
	emailFields,
	pdfFields,
} from './DocumentFields';

const resource = 'invoice';

export const invoiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [resource],
			},
		},
		options: [
			{
				name: 'Cancel',
				value: 'cancel',
				description: 'Cancel an invoice',
				action: 'Cancel an invoice',
			},
			{
				name: 'Complete',
				value: 'complete',
				description: 'Complete a draft invoice and generate its PDF',
				action: 'Complete an invoice',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a draft invoice',
				action: 'Create an invoice',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an invoice including its PDFs, items and comments',
				action: 'Delete an invoice',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an invoice',
				action: 'Get an invoice',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many invoices',
				action: 'Get many invoices',
			},
			{
				name: 'Get PDF',
				value: 'getPdf',
				description: 'Download the PDF of an invoice',
				action: 'Get the PDF of an invoice',
			},
			{
				name: 'Send Email',
				value: 'sendEmail',
				description: 'Send an invoice by email',
				action: 'Send an invoice by email',
			},
			{
				name: 'Uncancel',
				value: 'uncancel',
				description: 'Undo the cancellation of an invoice',
				action: 'Uncancel an invoice',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a draft invoice',
				action: 'Update an invoice',
			},
		],
		default: 'create',
	},
];

const invoiceCreateOptions: INodeProperties[] = [
	{
		displayName: 'Confirmation ID',
		name: 'confirmation_id',
		type: 'string',
		default: '',
		description: 'ID of the confirmation the invoice was created from',
	},
	{
		displayName: 'Discount Date',
		name: 'discount_date',
		type: 'dateTime',
		default: '',
		description: 'Date up to which the cash discount applies',
	},
	{
		displayName: 'Discount Rate',
		name: 'discount_rate',
		type: 'number',
		default: 0,
		description: 'Cash discount in percent',
	},
	{
		displayName: 'Due Date',
		name: 'due_date',
		type: 'dateTime',
		default: '',
		description: 'Due date. Defaults to the invoice date plus the due days from the settings.',
	},
	{
		displayName: 'Invoice ID',
		name: 'invoice_id',
		type: 'string',
		default: '',
		description: 'ID of the corrected invoice, if this is an invoice correction',
	},
	{
		displayName: 'Offer ID',
		name: 'offer_id',
		type: 'string',
		default: '',
		description: 'ID of the estimate the invoice was created from',
	},
	{
		displayName: 'Payment Types',
		name: 'payment_types',
		type: 'multiOptions',
		options: PAYMENT_TYPE_OPTIONS,
		default: [],
		description: 'Payment types accepted for this invoice',
	},
	{
		displayName: 'Recurring ID',
		name: 'recurring_id',
		type: 'string',
		default: '',
		description: 'ID of the recurring the invoice was created from',
	},
	{
		displayName: 'Supply Date',
		name: 'supply_date',
		type: 'string',
		default: '',
		description: 'Supply or delivery date, either a date or free text depending on the type',
	},
	{
		displayName: 'Supply Date Type',
		name: 'supply_date_type',
		type: 'options',
		options: SUPPLY_DATE_TYPE_OPTIONS,
		default: 'SUPPLY_DATE',
	},
];

const invoiceFilterOptions: INodeProperties[] = [
	{
		displayName: 'Payment Type',
		name: 'payment_type',
		type: 'multiOptions',
		options: PAYMENT_TYPE_FILTER_OPTIONS,
		default: [],
		description: 'Only return invoices accepting any of the selected payment types',
	},
];

export const invoiceFields: INodeProperties[] = [
	documentIdField(
		resource,
		['cancel', 'complete', 'delete', 'get', 'getPdf', 'sendEmail', 'uncancel', 'update'],
		'invoice',
	),
	...documentCommonFields(
		resource,
		{ name: 'invoice_number', displayName: 'Invoice Number' },
		[
			{ name: 'Canceled', value: 'CANCELED' },
			{ name: 'Draft', value: 'DRAFT' },
			{ name: 'Open', value: 'OPEN' },
			{ name: 'Overdue', value: 'OVERDUE' },
			{ name: 'Paid', value: 'PAID' },
		],
		{ createOptions: invoiceCreateOptions, filterOptions: invoiceFilterOptions },
	),
	documentLineItemsField(resource, 'invoice'),
	...paginationFields(resource),
	...completeFields(resource),
	...pdfFields(resource),
	...emailFields(resource),
];
