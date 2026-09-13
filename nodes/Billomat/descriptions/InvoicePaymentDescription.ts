import type { INodeProperties } from 'n8n-workflow';

import {
	PAYMENT_TYPE_FILTER_OPTIONS,
	PAYMENT_TYPE_OPTIONS,
	additionalFields,
	filterFields,
	idField,
	orderByField,
	paginationFields,
} from './SharedFields';

const resource = 'invoicePayment';

export const invoicePaymentOperations: INodeProperties[] = [
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
				description: 'Book a payment on an open or overdue invoice',
				action: 'Create an invoice payment',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a payment and reopen the invoice',
				action: 'Delete an invoice payment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an invoice payment',
				action: 'Get an invoice payment',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many invoice payments',
				action: 'Get many invoice payments',
			},
		],
		default: 'create',
	},
];

export const invoicePaymentFields: INodeProperties[] = [
	idField(resource, ['delete', 'get'], {
		description: 'ID of the payment',
	}),
	{
		displayName: 'Invoice ID',
		name: 'invoice_id',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['create'],
			},
		},
		description: 'ID of the invoice the payment belongs to',
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['create'],
			},
		},
		description: 'Paid amount',
	},
	additionalFields(resource, ['create'], [
		{
			displayName: 'Comment',
			name: 'comment',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Date',
			name: 'date',
			type: 'dateTime',
			default: '',
			description: 'Date of payment. Defaults to today.',
		},
		{
			displayName: 'Mark Invoice as Paid',
			name: 'mark_invoice_as_paid',
			type: 'boolean',
			default: false,
			description: 'Whether to set the invoice status to paid',
		},
		{
			displayName: 'Type',
			name: 'type',
			type: 'options',
			options: PAYMENT_TYPE_OPTIONS,
			default: 'BANK_TRANSFER',
			description: 'Payment type',
		},
	]),
	filterFields(resource, [
		{
			displayName: 'From',
			name: 'from',
			type: 'dateTime',
			default: '',
			description: 'Only return payments on or after this date',
		},
		{
			displayName: 'Invoice ID',
			name: 'invoice_id',
			type: 'string',
			default: '',
		},
		{
			displayName: 'To',
			name: 'to',
			type: 'dateTime',
			default: '',
			description: 'Only return payments on or before this date',
		},
		{
			displayName: 'Type',
			name: 'type',
			type: 'multiOptions',
			options: PAYMENT_TYPE_FILTER_OPTIONS,
			default: [],
			description: 'Only return payments of any of the selected types',
		},
		{
			displayName: 'User ID',
			name: 'user_id',
			type: 'string',
			default: '',
			description: 'Only return payments booked by this user',
		},
		orderByField,
	]),
	...paginationFields(resource),
];
