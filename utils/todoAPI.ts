import fs from 'fs/promises';
import path from 'path';
import { Task, NewTaskFunctionArguments } from './types';
import {
	serializeTask,
	parseLine,
	satisfiesFilter,
	deleteLine,
	formatTodoDate,
	dateToString,
} from './helpers';

export async function createNewTask({
	priority,
	projects,
	contexts,
	body,
	meta,
	todoDir,
}: NewTaskFunctionArguments): Promise<Task> {
	const todoFile: string = path.join(todoDir, 'todo.txt');
	try {
		const data = await fs.readFile(todoFile, 'utf-8').catch(() => '');
		const lines = data.split('\n');
		const line = lines.length + 1;

		const task: Task = {
			body: body,
			creationDate: new Date(),
			projects: projects,
			contexts: contexts,
			priority: priority,
			line: line,
			completed: false,
			meta: meta,
		};

		await fs.appendFile(todoFile, serializeTask(task) + '\n');
		return task;
	} catch (error) {
		console.error('createNewTask:', error);
		throw error;
	}
}

export async function getTasks({
	todoDir,
	filters,
}: GetTasksArguments): Promise<Task[]> {
	let output: Task[] = [];
	const todoFile: string = path.join(todoDir, 'todo.txt');
	const doneFile: string = path.join(todoDir, 'done.txt');

	try {
		if (filters?.uncompletedTasks !== false) {
			const data = await fs.readFile(todoFile, 'utf-8');
			const lines = data.split('\n');
			for (const [index, line] of lines.entries()) {
				if (line) {
					const task = parseLine(line, index + 1);
					if (task && satisfiesFilter(task, filters)) output.push(task);
				}
			}
		}
		if (filters?.completedTasks) {
			const data = await fs.readFile(doneFile, 'utf-8');
			const lines = data.split('\n');
			for (const [index, line] of lines.entries()) {
				if (line) {
					const task = parseLine(line, index + 1);
					if (task && satisfiesFilter(task, filters)) output.push(task);
				}
			}
		}
		return output;
	} catch (error) {
		console.error('getTasks:', error);
		throw error;
	}
}

export async function completeTask({
	lineNumber,
	todoDir,
}: {
	lineNumber: number;
	todoDir: string;
}) {
	const todoFile: string = path.join(todoDir, 'todo.txt');
	const doneFile: string = path.join(todoDir, 'done.txt');
	try {
		const line = await deleteLine(todoFile, lineNumber);
		const task = parseLine(line, lineNumber);
		if (task) {
			task.completed = true;
			task.completedAt = formatTodoDate(new Date());
			await fs.appendFile(doneFile, serializeTask(task) + '\n');
		}
	} catch (error) {
		console.error('completeTask:', error);
		throw error;
	}
}
