import type { INodeProperties } from 'n8n-workflow';

import {
	NET_GROSS_OPTIONS,
	additionalFields,
	filterFields,
	idField,
	orderByField,
	paginationFields,
	tagsFilterField,
} from './SharedFields';

const resource = 'article';

export const articleOperations: INodeProperties[] = [
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
				description: 'Create an article',
				action: 'Create an article',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete an article',
				action: 'Delete an article',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get an article',
				action: 'Get an article',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Get many articles',
				action: 'Get many articles',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update an article',
				action: 'Update an article',
			},
		],
		default: 'create',
	},
];

const articleFieldOptions: INodeProperties[] = [
	{
		displayName: 'Article Number',
		name: 'number',
		type: 'number',
		default: 0,
		description: 'Sequential article number. Defaults to the next free number.',
	},
	{
		displayName: 'Article Number Length',
		name: 'number_length',
		type: 'number',
		default: 0,
		description: 'Minimum length of the article number, padded with leading zeros',
	},
	{
		displayName: 'Article Number Prefix',
		name: 'number_pre',
		type: 'string',
		default: '',
		placeholder: 'ART',
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
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
	},
	{
		displayName: 'Purchase Price',
		name: 'purchase_price',
		type: 'number',
		default: 0,
	},
	{
		displayName: 'Purchase Price Net or Gross',
		name: 'purchase_price_net_gross',
		type: 'options',
		options: NET_GROSS_OPTIONS,
		default: 'NET',
		description: 'Price basis of the purchase price',
	},
	{
		displayName: 'Sales Price',
		name: 'sales_price',
		type: 'number',
		default: 0,
		description: 'Price for clients in price group 1',
	},
	{
		displayName: 'Sales Price 2',
		name: 'sales_price2',
		type: 'number',
		default: 0,
		description: 'Price for clients in price group 2. The normal price applies when unset.',
	},
	{
		displayName: 'Sales Price 3',
		name: 'sales_price3',
		type: 'number',
		default: 0,
		description: 'Price for clients in price group 3. The normal price applies when unset.',
	},
	{
		displayName: 'Sales Price 4',
		name: 'sales_price4',
		type: 'number',
		default: 0,
		description: 'Price for clients in price group 4. The normal price applies when unset.',
	},
	{
		displayName: 'Sales Price 5',
		name: 'sales_price5',
		type: 'number',
		default: 0,
		description: 'Price for clients in price group 5. The normal price applies when unset.',
	},
	{
		displayName: 'Supplier ID',
		name: 'supplier_id',
		type: 'string',
		default: '',
	},
	{
		displayName: 'Tax ID',
		name: 'tax_id',
		type: 'string',
		default: '',
		description: 'ID of the tax rate to apply',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		options: [
			{ name: 'Product', value: 'PRODUCT' },
			{ name: 'Service', value: 'SERVICE' },
		],
		default: 'PRODUCT',
	},
	{
		displayName: 'Unit ID',
		name: 'unit_id',
		type: 'string',
		default: '',
		description: 'ID of the unit the article is sold in',
	},
];

export const articleFields: INodeProperties[] = [
	idField(resource, ['delete', 'get', 'update'], {
		description: 'ID of the article',
	}),
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [resource],
				operation: ['create'],
			},
		},
		description: 'Title of the article',
	},
	additionalFields(resource, ['create'], articleFieldOptions),
	additionalFields(resource, ['update'], [
		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			default: '',
		},
		...articleFieldOptions,
	]),
	filterFields(resource, [
		{
			displayName: 'Article Number',
			name: 'article_number',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Currency Code',
			name: 'currency_code',
			type: 'string',
			default: '',
			placeholder: 'EUR',
		},
		{
			displayName: 'Description',
			name: 'description',
			type: 'string',
			default: '',
			description: 'Partial match on the description, case insensitive',
		},
		{
			displayName: 'Supplier ID',
			name: 'supplier_id',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			default: '',
			description: 'Partial match on the title, case insensitive',
		},
		{
			displayName: 'Unit ID',
			name: 'unit_id',
			type: 'string',
			default: '',
		},
		orderByField,
		tagsFilterField,
	]),
	...paginationFields(resource),
];
