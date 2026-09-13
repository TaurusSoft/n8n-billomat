import type { INodeProperties } from 'n8n-workflow';

import { additionalFields, idField, orderByField, paginationFields } from './SharedFields';
import { lineItemValueFields } from './DocumentFields';

/**
 * Invoice items and recurring items have identical fields and only differ in the
 * endpoint and the name of the parent ID, so both are generated from one factory.
 */
function buildItemDescription(options: {
	resource: string;
	/** API field pointing at the parent document, e.g. `invoice_id` */
	parentField: string;
	/** Label of the parent document, e.g. `invoice` */
	parentLabel: string;
	/** Label of the item itself, e.g. `invoice item` */
	label: string;
}): { operations: INodeProperties[]; fields: INodeProperties[] } {
	const { resource, parentField, parentLabel, label } = options;
	const parentDisplayName = `${parentLabel.charAt(0).toUpperCase()}${parentLabel.slice(1)} ID`;

	const itemFieldOptions = lineItemValueFields();

	const operations: INodeProperties[] = [
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
					description: `Add a line item to a ${parentLabel}`,
					action: `Create a ${label}`,
				},
				{
					name: 'Delete',
					value: 'delete',
					description: `Delete a ${label}`,
					action: `Delete a ${label}`,
				},
				{
					name: 'Get',
					value: 'get',
					description: `Get a ${label}`,
					action: `Get a ${label}`,
				},
				{
					name: 'Get Many',
					value: 'getAll',
					description: `Get many items of a ${parentLabel}`,
					action: `Get many ${label}s`,
				},
				{
					name: 'Update',
					value: 'update',
					description: `Update a ${label}`,
					action: `Update a ${label}`,
				},
			],
			default: 'create',
		},
	];

	const fields: INodeProperties[] = [
		idField(resource, ['delete', 'get', 'update'], {
			description: `ID of the ${label}`,
		}),
		{
			displayName: parentDisplayName,
			name: parentField,
			type: 'string',
			required: true,
			default: '',
			displayOptions: {
				show: {
					resource: [resource],
					operation: ['create', 'getAll'],
				},
			},
			description: `ID of the ${parentLabel}. Billomat only returns items for one ${parentLabel} at a time, so this is required.`,
		},
		additionalFields(resource, ['create', 'update'], itemFieldOptions),
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

	return { operations, fields };
}

const invoiceItem = buildItemDescription({
	resource: 'invoiceItem',
	parentField: 'invoice_id',
	parentLabel: 'invoice',
	label: 'invoice item',
});

const recurringItem = buildItemDescription({
	resource: 'recurringItem',
	parentField: 'recurring_id',
	parentLabel: 'recurring',
	label: 'recurring item',
});

export const invoiceItemOperations = invoiceItem.operations;
export const invoiceItemFields = invoiceItem.fields;
export const recurringItemOperations = recurringItem.operations;
export const recurringItemFields = recurringItem.fields;
