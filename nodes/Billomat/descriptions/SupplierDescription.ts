import type { INodeProperties } from 'n8n-workflow';

import {
	addressFieldOptions,
	additionalFields,
	bankFieldOptions,
	filterFields,
	idField,
	orderByField,
	paginationFields,
	tagsFilterField,
	taxIdFieldOptions,
} from './SharedFields';

const resource = 'supplier';

export const supplierOperations: INodeProperties[] = [
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
				description: 'Create a supplier',
				action: 'Create a supplier',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a supplier, only possible while it has no documents',
				action: 'Delete a supplier',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a supplier',
				action: 'Get a supplier',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many suppliers',
				action: 'Get many suppliers',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a supplier',
				action: 'Update a supplier',
			},
		],
		default: 'create',
	},
];

const supplierSpecificFieldOptions: INodeProperties[] = [
	{
		displayName: 'Client Number',
		name: 'client_number',
		type: 'string',
		default: '',
		description: 'The customer number you have at this supplier',
	},
	{
		displayName: 'Creditor Identifier',
		name: 'creditor_identifier',
		type: 'string',
		default: '',
		description: 'SEPA creditor identifier',
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
		displayName: 'Note',
		name: 'note',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
	},
];

export const supplierFields: INodeProperties[] = [
	idField(resource, ['delete', 'get', 'update'], {
		description: 'ID of the supplier',
	}),
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['create'],
			},
		},
		description: 'Company name of the supplier',
	},
	additionalFields(resource, ['create'], [
		...addressFieldOptions().filter((field) => field.name !== 'name'),
		...bankFieldOptions(),
		...taxIdFieldOptions(),
		...supplierSpecificFieldOptions,
	]),
	additionalFields(resource, ['update'], [
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
			description: 'Company name',
		},
		...addressFieldOptions().filter((field) => field.name !== 'name'),
		...bankFieldOptions(),
		...taxIdFieldOptions(),
		...supplierSpecificFieldOptions,
	]),
	filterFields(resource, [
		{
			displayName: 'Client Number',
			name: 'client_number',
			type: 'string',
			default: '',
			description: 'The customer number you have at this supplier',
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
			displayName: 'Creditor Identifier',
			name: 'creditor_identifier',
			type: 'string',
			default: '',
			description: 'SEPA creditor identifier',
		},
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			placeholder: 'name@email.com',
			default: '',
		},
		{
			displayName: 'First Name',
			name: 'first_name',
			type: 'string',
			default: '',
			description: 'First name of the contact person',
		},
		{
			displayName: 'Incoming ID',
			name: 'incoming_id',
			type: 'string',
			default: '',
			description: 'Comma-separated list of incoming IDs to find the suppliers of',
		},
		{
			displayName: 'Last Name',
			name: 'last_name',
			type: 'string',
			default: '',
			description: 'Last name of the contact person',
		},
		{
			displayName: 'Name',
			name: 'name',
			type: 'string',
			default: '',
			description: 'Partial match on the company name, case insensitive',
		},
		{
			displayName: 'Note',
			name: 'note',
			type: 'string',
			default: '',
		},
		orderByField,
		tagsFilterField,
	]),
	...paginationFields(resource),
];
