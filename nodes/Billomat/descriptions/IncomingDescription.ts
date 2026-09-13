import type { INodeProperties } from 'n8n-workflow';

import {
	additionalFields,
	filterFields,
	idField,
	orderByField,
	paginationFields,
	tagsFilterField,
} from './SharedFields';

const resource = 'incoming';

export const incomingOperations: INodeProperties[] = [
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
				name: 'Create',
				value: 'create',
				description: 'Create an incoming invoice',
				action: 'Create an incoming invoice',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an incoming invoice including its documents and comments',
				action: 'Delete an incoming invoice',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an incoming invoice',
				action: 'Get an incoming invoice',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many incoming invoices',
				action: 'Get many incoming invoices',
			},
			{
				name: 'Get PDF',
				value: 'getPdf',
				description: 'Download the document of an incoming invoice',
				action: 'Get the PDF of an incoming invoice',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an incoming invoice',
				action: 'Update an incoming invoice',
			},
		],
		default: 'create',
	},
];

const incomingFieldOptions: INodeProperties[] = [
	{
		displayName: 'Category',
		name: 'category',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Client Number',
		name: 'client_number',
		type: 'string',
		default: '',
		description: 'The customer number you have at this supplier',
	},
	{
		displayName: 'Currency Code',
		name: 'currency_code',
		type: 'string',
		default: '',
		placeholder: 'EUR',
		description: 'ISO currency code. Defaults to the currency of the supplier.',
	},
	{
		displayName: 'Due Date',
		name: 'due_date',
		type: 'dateTime',
		default: '',
	},
	{
		displayName: 'Expense Account Number',
		name: 'expense_account_number',
		type: 'number',
		default: 0,
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		description:
			'Name of the input binary field holding a PDF or image to attach to the incoming invoice',
	},
	{
		displayName: 'Label',
		name: 'label',
		type: 'string',
		default: '',
		description: 'Label text describing the incoming invoice',
	},
	{
		displayName: 'Note',
		name: 'note',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
	},
	{
		displayName: 'Quote',
		name: 'quote',
		type: 'number',
		default: 1,
		description: 'Currency quote used to convert into the account currency',
	},
	{
		displayName: 'Total Gross',
		name: 'total_gross',
		type: 'number',
		default: 0,
	},
	{
		displayName: 'Total Net',
		name: 'total_net',
		type: 'number',
		default: 0,
	},
];

export const incomingFields: INodeProperties[] = [
	idField(resource, ['delete', 'get', 'getPdf', 'update'], {
		description: 'ID of the incoming invoice',
	}),
	{
		displayName: 'Supplier ID',
		name: 'supplier_id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['create'],
			},
		},
		description: 'ID of the supplier the invoice came from',
	},
	{
		displayName: 'Number',
		name: 'number',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['create'],
			},
		},
		description: 'Invoice number as issued by the supplier',
	},
	{
		displayName: 'Date',
		name: 'date',
		type: 'dateTime',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['create'],
			},
		},
		description: 'Invoice date',
	},
	additionalFields(resource, ['create'], incomingFieldOptions),
	additionalFields(resource, ['update'], [
		{
			displayName: 'Date',
			name: 'date',
			type: 'dateTime',
			default: '',
			description: 'Invoice date',
		},
		{
			displayName: 'Number',
			name: 'number',
			type: 'string',
			default: '',
			description: 'Invoice number as issued by the supplier',
		},
		{
			displayName: 'Supplier ID',
			name: 'supplier_id',
			type: 'string',
			default: '',
		},
		...incomingFieldOptions,
	]),
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
	filterFields(resource, [
		{
			displayName: 'From',
			name: 'from',
			type: 'dateTime',
			default: '',
			description: 'Only return incoming invoices dated on or after this date',
		},
		{
			displayName: 'Incoming Number',
			name: 'incoming_number',
			type: 'string',
			default: '',
			description: 'Partial match on the incoming number, case insensitive',
		},
		{
			displayName: 'Note',
			name: 'note',
			type: 'string',
			default: '',
			description: 'Free text search in the notes',
		},
		{
			displayName: 'Status',
			name: 'status',
			type: 'multiOptions',
			options: [
				{ name: 'Open', value: 'OPEN' },
				{ name: 'Overdue', value: 'OVERDUE' },
				{ name: 'Paid', value: 'PAID' },
			],
			default: [],
			description: 'Only return incoming invoices in any of the selected statuses',
		},
		{
			displayName: 'Supplier ID',
			name: 'supplier_id',
			type: 'string',
			default: '',
		},
		{
			displayName: 'To',
			name: 'to',
			type: 'dateTime',
			default: '',
			description: 'Only return incoming invoices dated on or before this date',
		},
		orderByField,
		tagsFilterField,
	]),
	...paginationFields(resource),
];
