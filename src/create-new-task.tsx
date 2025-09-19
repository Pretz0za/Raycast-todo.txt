import { getPreferenceValues, LaunchProps, PopToRootType, showHUD, } from "@raycast/api";
import { completeTask, createNewTask, getTasks } from '../utils/todoAPI'

interface CreateTaskArguments {
	task: string;
	projects: string;
	contexts: string;
	priority: 'A' | 'B' | 'C' | 'D' | ''
}

export default async function main(props: LaunchProps<{ arguments: CreateTaskArguments }>) {
	const task = props.arguments
	const todoDir = getPreferenceValues<Preferences>().todoDir
	// await createNewTask({
	// 	title: task.task,
	// 	projects: task.projects ? new Set(task.projects.split(', ')) : new Set(),
	// 	contexts: task.contexts ? new Set(task.contexts.split(', ')) : new Set(),
	// 	priority: task.priority === '' ? undefined : task.priority,
	// 	todoDir
	// })
	await completeTask({ todoDir, lineNumber: 3 })
	showHUD("Successfully added task", { clearRootSearch: true, popToRootType: PopToRootType.Default })
}
