import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import {
	additionalFields,
	filterFields,
	idField,
	orderByField,
	paginationFields,
} from './SharedFields';

const resource = 'invoiceComment';

/**
 * Billomat sets an action key on every comment it creates itself. `COMMENT` marks the
 * ones entered by a user.
 */
const ACTION_KEY_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Cancel', value: 'CANCEL' },
	{ name: 'Comment', value: 'COMMENT', description: 'Entered by a user' },
	{ name: 'Copy', value: 'COPY' },
	{ name: 'Create', value: 'CREATE' },
	{ name: 'Create Credit Note', value: 'CREATE_CREDIT_NOTE' },
	{ name: 'Create From Estimate', value: 'CREATE_FROM_OFFER' },
	{ name: 'Create From Invoice', value: 'CREATE_FROM_INVOICE' },
	{ name: 'Create From Recurring', value: 'CREATE_FROM_RECURRING' },
	{ name: 'Delete Payment', value: 'DELETE_PAYMENT' },
	{ name: 'Email Error', value: 'ERROR_MAIL' },
	{ name: 'Fax', value: 'FAX' },
	{ name: 'Letter', value: 'LETTER' },
	{ name: 'Mail', value: 'MAIL' },
	{ name: 'Payment', value: 'PAYMENT' },
	{ name: 'Payment Error', value: 'PAYMENT_ERROR' },
	{ name: 'Reminder Cancel', value: 'REMINDER_CANCEL' },
	{ name: 'Reminder Create', value: 'REMINDER_CREATE' },
	{ name: 'Reminder Delete', value: 'REMINDER_DELETE' },
	{ name: 'Reminder Email Error', value: 'REMINDER_ERROR_MAIL' },
	{ name: 'Reminder Fax', value: 'REMINDER_FAX' },
	{ name: 'Reminder Letter', value: 'REMINDER_LETTER' },
	{ name: 'Reminder Mail', value: 'REMINDER_MAIL' },
	{ name: 'Reminder Sign', value: 'REMINDER_SIGN' },
	{ name: 'Reminder Sign Mail', value: 'REMINDER_SIGN_MAIL' },
	{ name: 'Reminder Status', value: 'REMINDER_STATUS' },
	{ name: 'Sign', value: 'SIGN' },
	{ name: 'Sign Mail', value: 'SIGN_MAIL' },
	{ name: 'Status', value: 'STATUS' },
];

export const invoiceCommentOperations: INodeProperties[] = [
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
				description: 'Add a comment to an invoice',
				action: 'Create an invoice comment',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an invoice comment',
				action: 'Delete an invoice comment',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an invoice comment',
				action: 'Get an invoice comment',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many comments of an invoice',
				action: 'Get many invoice comments',
			},
		],
		default: 'create',
	},
];

export const invoiceCommentFields: INodeProperties[] = [
	idField(resource, ['delete', 'get'], {
		description: 'ID of the comment',
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
				operation: ['create', 'getAll'],
			},
		},
		description:
			'ID of the invoice. Billomat only returns comments for one invoice at a time, so this is required.',
	},
	{
		displayName: 'Comment',
		name: 'comment',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['create'],
			},
		},
		description: 'Comment text',
	},
	additionalFields(resource, ['create'], [
		{
			displayName: 'Public',
			name: 'public',
			type: 'boolean',
			default: false,
			description: 'Whether the comment is shown in the customer portal',
		},
	]),
	filterFields(resource, [
		{
			displayName: 'Action Key',
			name: 'actionkey',
			type: 'multiOptions',
			options: ACTION_KEY_OPTIONS,
			default: [],
			description: 'Only return comments with any of the selected action keys',
		},
		orderByField,
	]),
	...paginationFields(resource),
];
