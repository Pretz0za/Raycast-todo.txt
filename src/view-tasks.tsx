import { Action, ActionPanel, Form, getPreferenceValues, Icon, LaunchProps, List, useNavigation } from "@raycast/api"
import { FilterType, Task, TaskSearchFilter, } from '../utils/types'
import { getTasks, writeTask, } from "../utils/todoAPI"
import { useEffect, useState } from "react"
import { FormValidation, MutatePromise, useForm, usePromise } from "@raycast/utils"
import { parseBody, parseCSVString, reduceSet, satisfiesFilter } from "../utils/helpers"
import { CreateTaskArguments } from "./create-new-task"

// NOTE: Shows all uncompleted tasks upon running command. Search bar at top to enter filters in CSV format. Projects prepended by + and contexts by @. Can mark a task as complete. Can add new task. Can delete task. Can order by priority or creation date.


export default function main() {

	const todoDir = getPreferenceValues<Preferences>().todoDir
	const [filter, setFilter] = useState<TaskSearchFilter | undefined>(undefined)
	const [filterType, setFilterType] = useState<FilterType>('AND')
	const { data: tasks, isLoading, revalidate, mutate } = usePromise(() => getTasks({ todoDir, }))

	const onTextSearchChange = (text: string) => {
		// TODO: Add support for non context/project filter phrases

		setFilter({ ...parseBody(text) })

	}

	if (isLoading) return <List isLoading={true} />

	// TODO: Add sorting

	return <List
		onSearchTextChange={onTextSearchChange}
		actions={
			<ActionPanel>
				<Action.Push
					title="Add Task"
					target={<CreateTaskForm revalidate={revalidate} />}
				/>
			</ActionPanel>
		} isLoading={isLoading}>

		{
			tasks?.filter(task => satisfiesFilter(task, filter, filterType)).map(task => (

				<List.Item key={task.line} title={task.body} icon={Icon.Dot}

					accessories={
						Object.keys(task.meta).map(key => (
							{ text: `${key}:${task.meta[key]}` }
						))
					}

				/>

			))
		}

		{/* {Object.keys(Object.fromEntries(tasksByPriority)).map(priority => ( */}
		{/* 	<List.Section key={priority} title={priority === 'none' ? 'Low Priority' : `Priority ${priority}`}> */}
		{/* 		{tasksByPriority.get(priority as Priority | 'none')?.map(task => ( */}
		{/* 			<List.Item key={task.line} title={task.title} icon={Icon.Dot} */}
		{/* 				accessories={ */}
		{/* 					[ */}
		{/* 						task.projects.size > 0 ? */}
		{/* 							{ text: Array.from(task.projects).join(", "), icon: Icon.Folder } : {}, */}
		{/* 						task.contexts.size > 0 ? */}
		{/* 							{ text: Array.from(task.contexts).join(', '), icon: Icon.Clipboard } : {} */}
		{/* 					] */}
		{/* 				} /> */}
		{/* 		))} */}
		{/* 	</List.Section> */}
		{/* )) */}
		{/* } */}

		<List.EmptyView
			title="No tasks"
			actions={
				<ActionPanel>
					<Action.Push
						title="Add Task"
						target={<CreateTaskForm revalidate={revalidate} />}
					/>
				</ActionPanel>
			}
		/>
	</List>
}

function CreateTaskForm({ revalidate }: { revalidate: () => Promise<Task[]> }) {
	const { pop } = useNavigation();
	const todoDir = getPreferenceValues<Preferences>().todoDir

	const { handleSubmit } = useForm<CreateTaskArguments>({
		onSubmit: async function handleSubmit(values: CreateTaskArguments) {
			await writeTask({
				todoDir,
				task: {
					line: -1,
					creationDate: new Date(),
					priority: values.priority,
					body: values.body,
				},
			});
			await revalidate();
			pop();
		},

		validation: {
			body: FormValidation.Required,
			priority: (value) => {
				if (value) {
					if (value.length != 1)
						return "Priority must be a single uppercase character eg [A...Z]"

					if (!(value <= "Z" && value >= "A"))
						return "Priority must be a single uppercase character eg [A...Z]"
				}
			}
		}

	})

	return (
		<Form
			actions={
				<ActionPanel>
					<Action.SubmitForm title="Add" onSubmit={handleSubmit} />
				</ActionPanel>
			}
		>
			<Form.TextField id="body" title="Task" placeholder="Add foo() function to @raycast extension @coding +myExtension" />
			<Form.TextField id="priority" title="Priority" placeholder="A ... Z" />
		</Form>
	);
}
