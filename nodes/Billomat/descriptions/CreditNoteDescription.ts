import type { INodeProperties } from 'n8n-workflow';

import { paginationFields } from './SharedFields';
import {
	completeFields,
	documentCommonFields,
	documentIdField,
	documentLineItemsField,
	emailFields,
	pdfFields,
} from './DocumentFields';

const resource = 'creditNote';

export const creditNoteOperations: INodeProperties[] = [
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
				description: 'Cancel a credit note',
				action: 'Cancel a credit note',
			},
			{
				name: 'Complete',
				value: 'complete',
				description: 'Complete a draft credit note and generate its PDF',
				action: 'Complete a credit note',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a draft credit note',
				action: 'Create a credit note',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a credit note',
				action: 'Delete a credit note',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a credit note',
				action: 'Get a credit note',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many credit notes',
				action: 'Get many credit notes',
			},
			{
				name: 'Get PDF',
				value: 'getPdf',
				description: 'Download the PDF of a credit note',
				action: 'Get the PDF of a credit note',
			},
			{
				name: 'Send Email',
				value: 'sendEmail',
				description: 'Send a credit note by email',
				action: 'Send a credit note by email',
			},
			{
				name: 'Uncancel',
				value: 'uncancel',
				description: 'Undo the cancellation of a credit note',
				action: 'Uncancel a credit note',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a draft credit note',
				action: 'Update a credit note',
			},
		],
		default: 'create',
	},
];

const creditNoteCreateOptions: INodeProperties[] = [
	{
		displayName: 'Invoice ID',
		name: 'invoice_id',
		type: 'string',
		default: '',
		description: 'ID of the invoice the credit note was created from',
	},
];

export const creditNoteFields: INodeProperties[] = [
	documentIdField(
		resource,
		['cancel', 'complete', 'delete', 'get', 'getPdf', 'sendEmail', 'uncancel', 'update'],
		'credit note',
	),
	...documentCommonFields(
		resource,
		{ name: 'credit_note_number', displayName: 'Credit Note Number' },
		[
			{ name: 'Draft', value: 'DRAFT' },
			{ name: 'Open', value: 'OPEN' },
			{ name: 'Paid', value: 'PAID' },
		],
		{ createOptions: creditNoteCreateOptions },
	),
	documentLineItemsField(resource, 'credit note'),
	...paginationFields(resource),
	...completeFields(resource),
	...pdfFields(resource),
	...emailFields(resource),
];
