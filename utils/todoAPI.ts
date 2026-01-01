import fs from 'fs/promises';
import path from 'path';
import { GetTasksArguments, Task, WriteTaskFunctionArgs } from './types';
import {
	serializeTask,
	parseLine,
	satisfiesFilter,
	deleteLine,
	dateToString,
	getTodoFile,
} from './helpers';

// NOTE: Wanted API Functionality:
//
//	Given a Task object :
//		- Write to todo.txt (new if lineNumber = -1, edit otherwise)
//		- Delete from todo.txt
//		- Complete tasks

export async function writeTask({
	task,
	todoDir,
}: WriteTaskFunctionArgs): Promise<void> {
	const todoFile = getTodoFile(todoDir);
	try {
		if (task.line === -1) {
			await fs.appendFile(todoFile, serializeTask(task), 'utf-8');
			return;
		} else {
			const data = await fs.readFile(todoFile, 'utf-8');
			let lines = data.split('\n');
			lines[task.line - 1] = serializeTask(task);
			await fs.writeFile(todoFile, lines.join('\n'), 'utf-8');
		}
	} catch (err) {
		console.error(`writeTask: failed to write to file ${todoFile}`);
		throw err;
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
