import { getPreferenceValues, LaunchProps, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";
import { completeTask, writeTask, getTasks } from '../utils/todoAPI'
import { parseCSVString } from "../utils/helpers";

export interface CreateTaskArguments {
	body: string;
	priority: string;
}

export default async function main(props: LaunchProps<{ arguments: CreateTaskArguments }>) {
	const task = props.arguments
	const todoDir = getPreferenceValues<Preferences>().todoDir
	try {

		await writeTask({
			todoDir, task: {
				line: -1,
				completed: false,
				creationDate: new Date(),
				...task
			}
		})

	} catch (error) {
		showToast({ title: 'Error creating task', message: `${(error as Error).message}`, style: Toast.Style.Failure })
	}
}
