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

const resource = 'estimate';

/**
 * Estimates live under the `offers` endpoint in Billomat, which is why the API fields
 * are named `offer_number` and so on.
 */
export const estimateOperations: INodeProperties[] = [
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
				description: 'Cancel an estimate',
				action: 'Cancel an estimate',
			},
			{
				name: 'Clear',
				value: 'clear',
				description: 'Mark an estimate as cleared',
				action: 'Clear an estimate',
			},
			{
				name: 'Complete',
				value: 'complete',
				description: 'Complete a draft estimate and generate its PDF',
				action: 'Complete an estimate',
			},
			{
				name: 'Create',
				value: 'create',
				description: 'Create a draft estimate',
				action: 'Create an estimate',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an estimate',
				action: 'Delete an estimate',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an estimate',
				action: 'Get an estimate',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many estimates',
				action: 'Get many estimates',
			},
			{
				name: 'Get PDF',
				value: 'getPdf',
				description: 'Download the PDF of an estimate',
				action: 'Get the PDF of an estimate',
			},
			{
				name: 'Lose',
				value: 'lose',
				description: 'Mark an estimate as lost',
				action: 'Mark an estimate as lost',
			},
			{
				name: 'Send Email',
				value: 'sendEmail',
				description: 'Send an estimate by email',
				action: 'Send an estimate by email',
			},
			{
				name: 'Uncancel',
				value: 'uncancel',
				description: 'Undo the cancellation of an estimate',
				action: 'Uncancel an estimate',
			},
			{
				name: 'Unclear',
				value: 'unclear',
				description: 'Undo marking an estimate as cleared',
				action: 'Unclear an estimate',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a draft estimate',
				action: 'Update an estimate',
			},
			{
				name: 'Win',
				value: 'win',
				description: 'Mark an estimate as won',
				action: 'Mark an estimate as won',
			},
		],
		default: 'create',
	},
];

const estimateCreateOptions: INodeProperties[] = [
	{
		displayName: 'Validity Date',
		name: 'validity_date',
		type: 'dateTime',
		default: '',
		description: 'Date up to which the estimate is valid',
	},
];

export const estimateFields: INodeProperties[] = [
	documentIdField(
		resource,
		[
			'cancel',
			'clear',
			'complete',
			'delete',
			'get',
			'getPdf',
			'lose',
			'sendEmail',
			'uncancel',
			'unclear',
			'update',
			'win',
		],
		'estimate',
	),
	...documentCommonFields(
		resource,
		{ name: 'offer_number', displayName: 'Estimate Number' },
		[
			{ name: 'Canceled', value: 'CANCELED' },
			{ name: 'Cleared', value: 'CLEARED' },
			{ name: 'Draft', value: 'DRAFT' },
			{ name: 'Lost', value: 'LOST' },
			{ name: 'Open', value: 'OPEN' },
			{ name: 'Won', value: 'WON' },
		],
		{ createOptions: estimateCreateOptions },
	),
	documentLineItemsField(resource, 'estimate'),
	...paginationFields(resource),
	...completeFields(resource),
	...pdfFields(resource),
	...emailFields(resource),
];
