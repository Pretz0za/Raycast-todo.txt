import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api"
import { GROUPING_KEYS, GroupingKey, Task, TaskBuckets } from "../utils/types"
import { JSX } from "react";
import { MutatePromise } from "@raycast/utils";
import { completeTask, deleteTask } from "../utils/todoAPI";

type TaskItemActions = {
	complete?: boolean;
	uncomplete?: boolean;
	delete?: boolean;
	edit?: boolean;
}

export type TaskListViewProps = {
	buckets: TaskBuckets
	mutateTasks: MutatePromise<Task[], undefined, any>
	globalActions: JSX.Element[]
	taskActions: TaskItemActions
}

const TASK_ACTION_COMPONENTS:
	Record<keyof TaskItemActions, (task: Task, mutateTasks: MutatePromise<Task[], undefined, any>,
		todoDir: string) => JSX.Element> = {

	'complete':
		(task: Task, mutateTasks: MutatePromise<Task[], undefined, any>, todoDir: string) =>
			<Action key={`${task.completed}-${task.line}completeAction`} title="Complete Task"
				onAction={async () => {
					await mutateTasks(completeTask({ task, todoDir }), {
						optimisticUpdate: (data) => {
							if (!data) return []
							data[
								data?.findIndex((other) => {
									return other.completed === task.completed && other.line === task.line
								})].completed = true;
							return data
						},
						shouldRevalidateAfter: true,
					})
				}} />,

	'uncomplete': (task: Task, mutateTasks: MutatePromise<Task[], undefined, any>, todoDir: string) =>
		<Action key={`${task.completed}-${task.line}-uncompleteAction`} title="Uncomplete Task"
			onAction={async () => {
				await mutateTasks(completeTask({ task, todoDir }), {
					optimisticUpdate: (data) => {
						if (!data) return []
						data[
							data?.findIndex((other) => {
								return other.completed === task.completed && other.line === task.line
							})].completed = false;
						return data
					},
					shouldRevalidateAfter: true,
				})
			}} />,



	//TODO:



	'delete': (task: Task, mutateTasks: MutatePromise<Task[], undefined, any>, todoDir: string) =>
		<Action key={`${task.completed}-${task.line}-deleteAction`} title="Delete Task"
			onAction={async () => {
				await mutateTasks(deleteTask({ task, todoDir }), {
					optimisticUpdate: (data) => {
						if (!data) return []
						data.splice(task.line - 1, 1)
						return data
					},
					shouldRevalidateAfter: true,
				})
			}}
		/>,


	// NOTE: Create task layer should accept default value props
	'edit': (task: Task, mutateTasks: MutatePromise<Task[], undefined, any>, todoDir: string) =>
		<Action key={`${task.completed}-${task.line}-editAction`} title="Edit Task" />,
}


const TaskListView = ({ buckets, mutateTasks, globalActions, taskActions }: TaskListViewProps) => {

	const todoDir = getPreferenceValues<Preferences>().todoDir
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


							{(Object.entries(taskActions) as [keyof TaskItemActions, boolean][])
								.filter(([, enabled]) => enabled)
								.map(([key]) => {
									return TASK_ACTION_COMPONENTS[key](task, mutateTasks, todoDir)
								})}

							{...globalActions}

						</ActionPanel>
					}
				/>
			))}
		</List.Section>
	))
}


export default TaskListView


