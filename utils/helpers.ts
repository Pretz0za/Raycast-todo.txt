import fs from 'fs/promises';
import {
	TaskSearchFilter,
	Task,
	FilterType,
	TaskTitlePreferences,
	GroupingKey,
	OrderingKey,
	TaskBuckets,
} from './types';
import { Icon } from '@raycast/api';
import path from 'path';
import Fuse from 'fuse.js';

export function getTodoFile(todoDir: string) {
	return path.join(todoDir, 'todo.txt');
}

export function getDoneFile(todoDir: string) {
	return path.join(todoDir, 'done.txt');
}

export async function appendToFile(
	path: string,
	text: string,
): Promise<number> {
	const data = await fs.readFile(path, 'utf-8');
	const lines = data.split('\n');
	const newLineNumber = lines.length + 1;

	await fs.appendFile(path, text + '\n');

	return newLineNumber;
}

export function reduceSet<T, U>(
	callbackfn: (
		previousValue: U,
		currentValue: T,
		currentIndex: number,
		set: Set<T>,
	) => U,
	initialValue: U,
	set: Set<T>,
): U {
	let acc: U = initialValue;
	let index = 0;
	set.forEach((val) => {
		acc = callbackfn(acc, val, index, set);
		index++;
	});
	return acc;
}

export function parseLine(
	line: string,
	lineNumber: number,
	preferences: TaskTitlePreferences,
): Task {
	let priority: string | undefined = undefined;
	let body: string[] = [];
	let completed: boolean = false;
	let completionDate: Date | undefined = undefined;
	let creationDate: Date | undefined = undefined;
	let projects: string[] = [];
	let contexts: string[] = [];
	let meta: Record<string, string> = {};

	const tokens = line.trim().split(/\s+/);

	let idx = 0;

	if (idx < tokens.length && tokens[0] == 'x' && Date.parse(tokens[1])) {
		// Completed task check
		completed = true;
		if (preferences.completed) body.push(tokens[0]);
		completionDate = new Date(tokens[1]);
		if (preferences.completionDate) body.push(tokens[1]);
		idx = 2;
	}

	if (idx < tokens.length && /^\([A-Z]\)$/.test(tokens[idx])) {
		// Priority check
		priority = tokens[idx];
		if (preferences.priority) body.push(tokens[idx]);
		idx++;
	}

	if (idx < tokens.length && Date.parse(tokens[idx])) {
		// Creation date check
		creationDate = new Date(tokens[idx]);
		if (preferences.creationDate) body.push(tokens[idx]);
		idx++;
	}

	for (; idx < tokens.length; idx++) {
		// Body, projects, contexts, and key value metadata
		let token = tokens[idx];
		if (token.length <= 1) continue;
		let firstChar = token[0];
		switch (firstChar) {
			case '@':
				contexts.push(token);
				if (preferences.contexts) body.push(token);
				break;

			case '+':
				projects.push(token);
				if (preferences.projects) body.push(token);
				break;

			default:
				let parts: string[];
				if (
					(parts = token.split(':')).length == 2 &&
					parts[0].length > 0 &&
					parts[1].length > 0
				) {
					meta[parts[0]] = parts[1];
					if (preferences.meta) body.push(token);
				} else {
					body.push(token);
				}
				break;
		}
	}

	return {
		line: lineNumber,
		body: body.join(' '),
		priority,
		creationDate,
		completed,
		completionDate,
		projects,
		contexts,
		meta,
	};
}

export function serializeTask(
	task: Task | Omit<Task, 'line' | 'projects' | 'contexts' | 'meta'>,
): string {
	return (
		`${task.completed ? `x ${dateToString(task.completionDate ?? new Date())} ` : ''}` +
		`${task.creationDate ? `${dateToString(task.creationDate)} ` : ''}` +
		task.body
	);
}

export function satisfiesFilter(
	task: Task,
	filter?: TaskSearchFilter,
	filterType?: FilterType,
) {
	if (!task.body) return false;

	if (filter) {
		if (filter.completed !== undefined) {
			if (task.completed !== filter.completed) return false;
		}

		if (filter.priority) {
			// TODO: Research how I can make a min priority filter in addition to exact priority
			if (task.priority != filter.priority) return false;
		}

		if (filter.projects && filter.projects.length > 0) {
			for (let project of filter.projects) {
				if (task.projects.indexOf(project) === -1) {
					if (filterType === 'AND') return false;
				} else if (filterType === 'OR') return true;
			}
		}

		if (filter.contexts && filter.contexts.length > 0) {
			for (let context of filter.contexts) {
				if (task.contexts.indexOf(context) === -1) {
					if (filterType === 'AND') return false;
				} else if (filterType === 'OR') return true;
			}
		}

		if (filter.meta && Object.keys(filter.meta).length > 0) {
			for (let key of Object.keys(filter.meta)) {
				if (filter.meta[key] !== task.meta[key]) {
					if (filterType === 'AND') return false;
				} else if (filterType === 'OR') return true;
			}
		}

		return !filterType || filterType === 'AND'; // defaults to AND
	}
	return true;
}

export async function deleteLine(path: string, line: number) {
	const data = await fs.readFile(path, 'utf-8');
	const lines = data.split('\n');

	if (line <= 0 || line > lines.length)
		throw new Error('deleteLine: Line number not in bounds');

	const [deleted] = lines.splice(line - 1, 1);
	await fs.writeFile(path, lines.join('\n'), 'utf-8');
	return deleted;
}

export function getContextIcon(context: string): Icon {
	switch (context.toLowerCase()) {
		case 'home':
			return Icon.House;
		case 'work':
			return Icon.Hammer;
		case 'shopping':
		case 'shop':
		case 'groceries':
			return Icon.Cart;
		default:
			return Icon.Tag;
	}
}

export function dateToString(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

export function parseSearchQuery(query: string) {
	let projects: string[] = [];
	let contexts: string[] = [];
	let meta: Record<string, string> = {};
	let tokens = query.split(/\s+/);
	for (let token of tokens) {
		if (token.length <= 1) continue;
		let firstChar = token[0];
		switch (firstChar) {
			case '@':
				contexts.push(token);
				break;

			case '+':
				projects.push(token);
				break;

			default:
				let parts: string[];
				if (
					(parts = token.split(':')).length == 2 &&
					parts[0].length > 0 &&
					parts[1].length > 0
				) {
					meta[parts[0]] = parts[1];
				}
				break;
		}
	}

	return { projects, contexts, meta };
}

export function filterTasks(
	tasks: Task[] | undefined,
	query: string,
	filterType: FilterType,
): Task[] {
	if (!tasks) return [];
	if (!query) return tasks;
	let newFilter = parseSearchQuery(query);
	let results: Task[] = [];
	if (
		newFilter.contexts.length ||
		Object.keys(newFilter.meta).length ||
		newFilter.projects.length
	) {
		results = tasks.filter((task) =>
			satisfiesFilter(task, newFilter, filterType),
		);
	}
	if (results.length === 0) {
		const fuse = new Fuse(tasks, {
			threshold: 0.4,
			keys: ['contexts', 'projects', 'meta', 'body'],
		});
		results = fuse.search(query).map((result) => {
			return result.item;
		});
	}

	return results;
}

export function groupTasks(
	tasks: Task[],
	key: GroupingKey,
	orderingType: 'ASCENDING' | 'DECENDING',
): TaskBuckets {
	let bucketOrder: string[] = [];
	let buckets: Record<string, Task[]> = {};
	let nullBucketExists = false;
	let nullBucketString = '';

	switch (key) {
		case 'PRIORITY': {
			nullBucketString = 'NO PRIORITY';
			for (let task of tasks) {
				let priority = task.priority
					? `PRIORITY ${task.priority}`
					: nullBucketString;
				if (buckets[priority] === undefined) {
					buckets[priority] = [];
					if (priority !== nullBucketString) bucketOrder.push(priority);
					else if (!nullBucketExists) nullBucketExists = true;
				}
				buckets[priority].push(task);
			}

			bucketOrder.sort();

			if (nullBucketExists) bucketOrder.push(nullBucketString);

			for (let bucket of bucketOrder) {
				orderTasks(buckets[bucket], 'CREATION_DATE', orderingType);
			}

			break;
		}

		case 'CREATION_DATE': {
			let tempOrder: Date[] = [];
			nullBucketString = 'NO CREATION DATE';
			for (let task of tasks) {
				let date: Date | '' = task.creationDate ?? '';
				let dateString =
					date === '' ? nullBucketString : getDateBucketLabel(date);
				if (buckets[dateString] === undefined) {
					buckets[dateString] = [];
					if (dateString !== nullBucketString) tempOrder.push(date as Date);
					else if (!nullBucketExists) nullBucketExists = true;
				}
				buckets[dateString].push(task);
			}

			// TODO: Add reverse sorting
			tempOrder.sort();
			bucketOrder = tempOrder.map((date) => getDateBucketLabel(date));
			if (nullBucketExists) bucketOrder.push(nullBucketString);
			bucketOrder.sort();

			for (let bucket of bucketOrder) {
				orderTasks(buckets[bucket], 'PRIORITY', orderingType);
			}

			break;
		}

		case 'COMPLETION_DATE': {
			let tempOrder: Date[] = [];
			nullBucketString = 'UNCOMPLETED';
			for (let task of tasks) {
				let date: Date | '' = task.completionDate ?? '';
				let dateString =
					date === '' ? nullBucketString : getDateBucketLabel(date);
				if (buckets[dateString] === undefined) {
					buckets[dateString] = [];
					if (dateString !== nullBucketString) tempOrder.push(date as Date);
					else if (!nullBucketExists) nullBucketExists = true;
				}
				buckets[dateString].push(task);
			}

			// TODO: Add reverse sorting
			tempOrder.sort();
			bucketOrder = tempOrder.map((date) => getDateBucketLabel(date));
			if (nullBucketExists) bucketOrder.push(nullBucketString);
			bucketOrder.sort();

			for (let bucket of bucketOrder) {
				orderTasks(buckets[bucket], 'PRIORITY', orderingType);
			}

			break;
		}

		case 'DUE_DATE': {
			let tempOrder: Date[] = [];
			nullBucketString = 'NO DUE DATE';
			for (let task of tasks) {
				let date: Date | '' = Date.parse(task.meta['due'])
					? new Date(task.meta['due'])
					: '';
				let dateString =
					date === '' ? nullBucketString : getDateBucketLabel(date);
				if (buckets[dateString] === undefined) {
					buckets[dateString] = [];
					if (dateString !== nullBucketString) tempOrder.push(date as Date);
					else if (!nullBucketExists) nullBucketExists = true;
				}
				buckets[dateString].push(task);
			}

			// TODO: Add reverse sorting
			tempOrder.sort();
			bucketOrder = tempOrder.map((date) => getDateBucketLabel(date));
			if (nullBucketExists) bucketOrder.push(nullBucketString);
			bucketOrder.sort();

			for (let bucket of bucketOrder) {
				orderTasks(buckets[bucket], 'PRIORITY', orderingType);
			}

			break;
		}
		case 'PROJECT': {
			for (let task of tasks) {
				for (let project of task.projects) {
					if (buckets[project] === undefined) {
						bucketOrder.push(project);
						buckets[project] = [];
					}
					buckets[project].push(task);
				}
			}

			// Sorts by the number of tasks in each bucket
			bucketOrder.sort();
			for (let bucket of bucketOrder) {
				orderTasks(buckets[bucket], 'PRIORITY', orderingType);
			}
		}

		case 'CONTEXT': {
			for (let task of tasks) {
				for (let context of task.contexts) {
					if (buckets[context] === undefined) {
						bucketOrder.push(context);
						buckets[context] = [];
					}
					buckets[context].push(task);
				}
			}

			// Sorts by the number of tasks in each bucket
			bucketOrder.sort();
			for (let bucket of bucketOrder) {
				orderTasks(buckets[bucket], 'PRIORITY', orderingType);
			}
			break;
		}

		default:
			bucketOrder = [''];
			buckets = { '': tasks };
			for (let bucket of bucketOrder) {
				orderTasks(buckets[bucket], 'PRIORITY', orderingType);
			}
			break;
	}

	return { bucketOrder, buckets };
}

export function getDateBucketLabel(date: Date) {
	return date.toLocaleString('default', {
		year: 'numeric',
		month: 'long',
	});
}

export function orderTasks(
	tasks: Task[],
	orderingKey: OrderingKey,
	orderingType: 'ASCENDING' | 'DECENDING',
) {
	let orderingModifer = orderingType === 'ASCENDING' ? 1 : -1;
	switch (orderingKey) {
		case 'PRIORITY':
			tasks.sort((a, b) => {
				if (!a.priority && !b.priority) return 0;
				if (!a.priority) return 1 * orderingModifer;
				if (!b.priority) return -1 * orderingModifer;

				return a.priority.localeCompare(b.priority) * orderingModifer;
			});
			break;

		case 'CREATION_DATE':
			tasks.sort((a, b) => {
				if (!a.creationDate && !b.creationDate) return 0;
				if (!a.creationDate) return 1 * orderingModifer;
				if (!b.creationDate) return -1 * orderingModifer;

				return (
					(a.creationDate!.getTime() - b.creationDate!.getTime()) *
					orderingModifer
				);
			});
			break;

		case 'DUE_DATE':
			tasks.sort((a, b) => {
				let aDate = Date.parse(a.meta['due']);
				let bDate = Date.parse(b.meta['due']);
				if (!aDate && !bDate) return 0;
				if (!aDate) return 1 * orderingModifer;
				if (!bDate) return -1 * orderingModifer;

				return (aDate - bDate) * orderingModifer;
			});

			break;

		default:
			break;
	}
}
