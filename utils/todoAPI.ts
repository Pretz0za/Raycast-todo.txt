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
	getDoneFile,
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
	const todoFile: string = getTodoFile(todoDir);
	const doneFile: string = getDoneFile(todoDir);
	let output: Task[] = [];

	if (!(filters?.completed === true)) {
		// !filters OR filters.completed is false/undefined -> includes uncompleted tasks
		try {
			const data = await fs.readFile(todoFile, 'utf-8');
			output.concat(
				data
					.split('\n')
					.map((line, index) => parseLine(line, index + 1))
					.filter((task) => satisfiesFilter(task, filters)),
			);
		} catch (err) {
			console.error(`getTasks: Failed to read file ${todoFile}`);
			throw err;
		}
	}

	if (!(filters?.completed === false)) {
		// !filters OR filters.completed is true/undefined -> includes completed tasks
		try {
			const data = await fs.readFile(doneFile, 'utf-8');
			output.concat(
				data
					.split('\n')
					.map((line, index) => parseLine(line, index + 1))
					.filter((task) => satisfiesFilter(task, filters)),
			);
		} catch (err) {
			console.error(`getTasks: Failed to read file ${doneFile}`);
			throw err;
		}
	}
	return output;
}

export async function completeTask({
	task,
	todoDir,
}: WriteTaskFunctionArgs): Promise<Task> {
	const todoFile: string = path.join(todoDir, 'todo.txt');
	const doneFile: string = path.join(todoDir, 'done.txt');

	try {
		// Delete from todo.txt
		await deleteLine(todoFile, task.line);
		task.completed = true;
		task.completionDate = new Date();
	} catch (err) {
		console.error(`completeTask: Failed to write to file ${todoFile}`);
		throw err;
	}

	try {
		// Append to done.txt
		await fs.appendFile(doneFile, serializeTask(task), 'utf-8');
	} catch (err) {
		console.error(`completeTask: Failed to write to file ${doneFile}`);
		throw err;
	}

	return task;
}
