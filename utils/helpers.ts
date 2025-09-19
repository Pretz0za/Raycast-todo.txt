import fs from 'fs/promises';
import { GetTasksFilters, Priority, Task } from './todoAPI';

export async function appendWithLineNumber(path: string, text: string) {
	const data = await fs.readFile(path, 'utf-8').catch(() => '');
	const lines = data.split('\n').filter(Boolean); // existing lines
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

export function parseLine(line: string, lineNumber: number): Task | null {
	if (!line) return null;
	let projects = new Set<string>();
	let contexts = new Set<string>();
	let priority: Priority = undefined;
	let text: string[] = [];
	let completed: boolean = false;
	let completedAt: string | undefined = undefined;

	const tokens = line.trim().split(/\s+/);
	for (const token of tokens) {
		if (!completed && token === 'x') {
			completed = true;
		} else if (!priority && /^\([A-Z]\)$/.test(token)) {
			priority = token[1] as Priority;
		} else if (/^\d{4}-\d{2}-\d{2}$/.test(token)) {
			if (completed) completedAt = token;
		} else if (token[0] === '+' && token.length > 1) {
			projects.add(token.substring(1));
		} else if (token[0] === '@' && token.length > 1) {
			contexts.add(token.substring(1));
		} else text.push(token);
	}

	if (text.length === 0) return null;

	return {
		title: text.join(' '),
		projects: projects,
		contexts: contexts,
		completed: completed,
		completedAt: completedAt,
		line: lineNumber,
		priority: priority,
	};
}

export function serializeTask(task: Task | Omit<Task, 'line'>): string {
	const projectsString =
		task.projects.size === 0
			? ''
			: reduceSet<string, string>(
					(acc, curr) => {
						return acc + `@${curr} `;
					},
					' ',
					task.projects,
				);

	const contextsString =
		task.contexts.size === 0
			? ''
			: reduceSet(
					(acc, curr) => {
						return acc + `+${curr} `;
					},
					projectsString ? '' : ' ',
					task.contexts,
				).slice(0, -1);

	return `${task.completed ? `x ${task.completedAt} ` : task.priority ? `(${task.priority}) ` : ''}${task.title}${projectsString}${contextsString}`;
}

export function filterTask(task: Task, filters?: GetTasksFilters) {
	if (filters) {
		if (filters.projects) {
			const projectIntersect = [...task.projects].map((project) =>
				filters.projects!.has(project),
			);
			if (projectIntersect.length === 0) return false;
		}
		if (filters.contexts) {
			const contextIntersect = [...task.contexts].map((context) =>
				filters.contexts!.has(context),
			);
			if (contextIntersect.length === 0) return false;
		}
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

export function formatTodoDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}
