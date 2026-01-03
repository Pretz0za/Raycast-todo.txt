import { Action, ActionPanel, Form, getPreferenceValues, Icon, LaunchProps, List, useNavigation } from "@raycast/api"
import { FilterType, Task, TaskSearchFilter, } from '../utils/types'
import { getTasks, writeTask, } from "../utils/todoAPI"
import { useEffect, useState } from "react"
import { FormValidation, MutatePromise, useForm, usePromise } from "@raycast/utils"
import { parseCSVString, parseLine, parseSearchQuery, reduceSet, satisfiesFilter } from "../utils/helpers"
import { CreateTaskArguments } from "./create-new-task"
import Fuse from "fuse.js"


// NOTE: Shows all uncompleted tasks upon running command. Search bar at top to enter filters in CSV format. Projects prepended by + and contexts by @. Can mark a task as complete. Can add new task. Can delete task. Can order by priority or creation date.


export default function main() {

	const todoDir = getPreferenceValues<Preferences>().todoDir
	const [filter, setFilter] = useState<TaskSearchFilter | undefined>(undefined)
	const [filterType, setFilterType] = useState<FilterType>('AND')
	const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
	const { data: tasks, isLoading, revalidate, mutate } = usePromise(async () => {
		let res = await getTasks({ todoDir, filter: {} })
		setFilteredTasks(res)
		return res
	}
	)

	// const onTextSearchChange = (text: string) => {
	// 	// TODO: Add support for non context/project filter phrases
	//
	// 	setFilter({ ...parseBodyMetadata(text) })
	//
	// }
	//
	if (isLoading) return <List isLoading={true} />

	// TODO: Add sorting

	function onSearchTextChange(query: string) {
		// TODO: add exact match preference that turns off fzf

		// Fuzzy find -> check projects and contexts of each of the results
		// If returns 0 results. check projects and contexts of ALL tasks

		if (!tasks) return []
		let newFilter = parseSearchQuery(query)
		setFilter(newFilter)
		const fuse = new Fuse(tasks, { threshold: 0.5, minMatchCharLength: Math.min(3, query.length), keys: ["body", "projects", "contexts", "meta"] })
		let results = fuse.search(query).map(result => {
			return result.item
		})
		if (results.length === 0) results = tasks.filter(task => satisfiesFilter(task, newFilter, filterType))
		setFilteredTasks(results)
	}


	const fzfTasks = filteredTasks.map(task => (
		<List.Item key={`${Number(task.completed)}-${task.line}`} title={task.body} icon={Icon.Dot}
			accessories={
				Object.keys(task.meta).map(key => (
					{ text: `${key}:${task.meta[key]}` }
				))
			}
			actions={
				<ActionPanel title="Action Panel Title">
					<Action title="Log info" onAction={() => {
						console.log(task)
					}} />
				</ActionPanel>
			}
		/>
	))

	// List of items from strict equality filtering

	return <List
		onSearchTextChange={onSearchTextChange}
		//		filtering={true}
		searchBarPlaceholder="Search using +PROJECT, @CONTEXT, KEY:VALUE, or a phrase"
		actions={
			<ActionPanel>
				<Action.Push
					title="Add Task"
					target={<CreateTaskForm revalidate={revalidate} />}
				/>
			</ActionPanel>
		} isLoading={isLoading}>

		{fzfTasks}

		<List.EmptyView
			//			title="No tasks"
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
