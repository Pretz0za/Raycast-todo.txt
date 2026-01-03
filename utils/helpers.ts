import fs from 'fs/promises';
import {
	TaskSearchFilter,
	Task,
	FilterType,
	TaskTitlePreferences,
} from './types';
import { Icon } from '@raycast/api';
import path from 'path';

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
	let projects: Set<string> = new Set();
	let contexts: Set<string> = new Set();
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
				contexts.add(token);
				if (preferences.contexts) body.push(token);
				break;

			case '+':
				projects.add(token);
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

		if (filter.projects && filter.projects.size > 0) {
			for (let project of filter.projects) {
				if (!task.projects.has(project)) {
					if (filterType === 'AND') return false;
				} else if (filterType === 'OR') return true;
			}
		}

		if (filter.contexts && filter.contexts.size > 0) {
			for (let context of filter.contexts) {
				if (!task.contexts.has(context)) {
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

export function parseCSVString(str: string | undefined): Set<string> {
	return str ? new Set(str.split(', ')) : new Set();
}

export function dateToString(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

export function parseSearchQuery(query: string) {
	let projects: Set<string> = new Set();
	let contexts: Set<string> = new Set();
	let meta: Record<string, string> = {};
	let tokens = query.split(/\s+/);
	for (let token of tokens) {
		if (token.length <= 1) continue;
		let firstChar = token[0];
		switch (firstChar) {
			case '@':
				contexts.add(token);
				break;

			case '+':
				projects.add(token);
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
