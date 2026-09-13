import type { INodeProperties } from 'n8n-workflow';

import {
	addressFieldOptions,
	additionalFields,
	idField,
	orderByField,
	paginationFields,
} from './SharedFields';

const resource = 'contact';

export const contactOperations: INodeProperties[] = [
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
				description: 'Create a contact for a client',
				action: 'Create a contact',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a contact',
				action: 'Delete a contact',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a contact',
				action: 'Get a contact',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many contacts of a client',
				action: 'Get many contacts',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a contact',
				action: 'Update a contact',
			},
		],
		default: 'create',
	},
];

const contactFieldOptions: INodeProperties[] = [
	{
		displayName: 'Label',
		name: 'label',
		type: 'string',
		default: '',
		description: 'Label of the contact',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'Company name',
	},
	...addressFieldOptions().filter((field) => field.name !== 'name'),
];

export const contactFields: INodeProperties[] = [
	idField(resource, ['delete', 'get', 'update'], {
		description: 'ID of the contact',
	}),
	{
		displayName: 'Client ID',
		name: 'client_id',
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
			'ID of the client. Billomat only returns contacts for one client at a time, so this is required.',
	},
	additionalFields(resource, ['create', 'update'], contactFieldOptions),
	{
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
		options: [orderByField],
	},
	...paginationFields(resource),
];
