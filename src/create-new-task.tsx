import { getPreferenceValues, LaunchProps, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";
import { completeTask, createNewTask, getTasks } from '../utils/todoAPI'
import { parseCSVString, parsePriorityString } from "../utils/helpers";

export interface CreateTaskArguments {
	title: string;
	projects: string;
	contexts: string;
	priority: 'A' | 'B' | 'C' | 'D' | 'none'
}

export default async function main(props: LaunchProps<{ arguments: CreateTaskArguments }>) {
	const task = props.arguments
	const todoDir = getPreferenceValues<Preferences>().todoDir
	try {
		await createNewTask({
			title: task.title,
			projects: parseCSVString(task.projects),
			contexts: parseCSVString(task.contexts),
			priority: parsePriorityString(task.priority),
			todoDir
		})

		showHUD("Successfully added task", { clearRootSearch: true, popToRootType: PopToRootType.Default })
	} catch (error) {
		showToast({ title: 'Error creating task', message: `${(error as Error).message}`, style: Toast.Style.Failure })
	}
}
