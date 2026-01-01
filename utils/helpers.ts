import fs from 'fs/promises';
import { TaskSearchFilter, Task } from './types';
import { Icon } from '@raycast/api';
import path from 'path';

export function getTodoFile(todoDir: string) {
	return path.join(todoDir, 'todo.txt');
}

export async function appendToFile(
	path: string,
	text: string,
): Promise<number> {
	try {
		const data = await fs.readFile(path, 'utf-8');
		const lines = data.split('\n');
		const newLineNumber = lines.length + 1;

		await fs.appendFile(path, text + '\n');

		return newLineNumber;
	} catch (err) {
		throw err;
	}
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

export function parseLine(line: string, lineNumber: number): Task | null {
	if (!line) return null;
	let priority: string | undefined = undefined;
	let body: string = '';
	let completed: boolean = false;
	let completionDate: Date | undefined = undefined;
	let creationDate: Date | undefined = undefined;

	const tokens = line.trim().split(/\s+/);

	let idx = 0;

	if (tokens[0] == 'x') {
		// Completed task check
		if (Date.parse(tokens[1])) {
			completed = true;
			completionDate = new Date(tokens[1]);
			idx = 2;
		} else {
			// begins with invalid completion x -> no prepended metadata
			body = line;
			return { ...parseBody(body), body: body, line: lineNumber };
		}
	}

	if (/^\([A-Z]\)$/.test(tokens[idx])) {
		// Priority check
		priority = tokens[idx];
		idx++;
	}

	if (Date.parse(tokens[idx])) {
		// Creation date check
		creationDate = new Date(tokens[idx]);
		idx++;
	}

	// Remove any parsed prepended metadata from body
	body = idx === 0 ? line : tokens.splice(0, idx).join(' ');
	return {
		line: lineNumber,
		body,
		priority,
		creationDate,
		completed,
		completionDate,
		...parseBody(body),
	};
}

export function serializeTask(task: Task | Omit<Task, 'line'>): string {
	return (
		`${task.completed ? `x ${dateToString(task.completionDate ?? new Date())} ` : ''}` +
		`${task.creationDate ? `${dateToString(task.creationDate)} ` : ''}` +
		task.body
	);
}

export function satisfiesFilter(task: Task, filter?: TaskSearchFilter) {
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
					if (filter.type === 'AND') return false;
				} else if (filter.type === 'OR') return true;
			}
		}

		if (filter.contexts && filter.contexts.size > 0) {
			for (let context of filter.contexts) {
				if (!task.contexts.has(context)) {
					if (filter.type === 'AND') return false;
				} else if (filter.type === 'OR') return true;
			}
		}

		return filter.type === 'AND';
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

export function parseBody(body: string): {
	projects: Set<string>;
	contexts: Set<string>;
	meta: Record<string, string>;
} {
	let projects = new Set<string>();
	let contexts = new Set<string>();
	let meta: Record<string, string> = {};
	const tokens = body.trim().split(/\s+/);
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
				if (token.length >= 3 && (parts = token.split(':')).length == 2) {
					meta[parts[0]] = parts[1];
				}
				break;
		}
	}

	return { projects, contexts, meta };
}
