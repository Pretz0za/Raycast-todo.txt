import { Action, ActionPanel, Form, getPreferenceValues, Icon, LaunchProps, List, useNavigation } from "@raycast/api"
import { FilterType, Task, TaskBuckets, TaskSearchFilter, } from '../utils/types'
import { getTasks, writeTask, } from "../utils/todoAPI"
import { useEffect, useMemo, useState } from "react"
import { FormValidation, MutatePromise, useForm, usePromise } from "@raycast/utils"
import { filterTasks, groupTasks, parseLine, parseSearchQuery, reduceSet, satisfiesFilter } from "../utils/helpers"
import { CreateTaskArguments } from "./create-new-task"
import Fuse from "fuse.js"


// NOTE: Shows all uncompleted tasks upon running command. Search bar at top to enter filters in CSV format. Projects prepended by + and contexts by @. Can mark a task as complete. Can add new task. Can delete task. Can order by priority or creation date.

export function TaskComponents(buckets: TaskBuckets) {

	return buckets.bucketOrder.map(bucket => (
		<List.Section key={bucket} title={bucket}>
			{buckets.buckets[bucket].map(task => (


				<List.Item key={`${bucket}-${Number(task.completed)}-${task.line}`} title={task.body} icon={Icon.Dot}
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


			))}
		</List.Section>
	))
}

export default function main() {

	const todoDir = getPreferenceValues<Preferences>().todoDir
	const [filter, setFilter] = useState<TaskSearchFilter | undefined>({ completed: false })
	const [filterType, setFilterType] = useState<FilterType>('AND')
	const [query, setQuery] = useState<string>('');

	const { data: tasks, isLoading, revalidate, mutate } = usePromise(
		async () => await getTasks({ todoDir, filter, filterType }))

	const visibleTasks = useMemo(
		() => filterTasks(tasks, query, filterType), [tasks, query, filterType])

	const taskBuckets = useMemo(
		() => {
			console.log('rebuckted tasks')
			return groupTasks(visibleTasks, 'PRIORITY', 'ASCENDING')
		}, [visibleTasks])


	// List of items from strict equality filtering

	return <List
		onSearchTextChange={setQuery}
		//		filtering={}
		searchBarPlaceholder="Search using +PROJECT, @CONTEXT, KEY:VALUE, or a phrase"
		actions={
			<ActionPanel>
				<Action.Push
					title="Add Task"
					target={<CreateTaskForm revalidate={revalidate} />}
				/>
			</ActionPanel>
		} isLoading={isLoading}>

		{TaskComponents(taskBuckets)}

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
