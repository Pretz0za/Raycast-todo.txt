import { Action, ActionPanel, Form, getPreferenceValues, Icon, LaunchProps, List, useNavigation } from "@raycast/api"
import { FilterType, GROUPING_KEYS, GroupingKey, ORDERING_KEYS, OrderingKey, Task, TaskBuckets, TaskSearchFilter, } from '../utils/types'
import { getTasks, writeTask, } from "../utils/todoAPI"
import { useEffect, useMemo, useState } from "react"
import { FormValidation, MutatePromise, useForm, usePromise } from "@raycast/utils"
import { filterTasks, groupTasks, parseLine, parseSearchQuery, reduceSet, satisfiesFilter } from "../utils/helpers"
import { CreateTaskArguments } from "./create-new-task"
import Fuse from "fuse.js"
import TaskListView from "../components/TaskListView"
import DropdownStateChangeLayer from "../components/DropdownStateChangeLayer"
import CreateTaskLayer from "../components/CreateTaskLayer"


// NOTE: Shows all uncompleted tasks upon running command. Search bar at top to enter filters in CSV format. Projects prepended by + and contexts by @. Can mark a task as complete. Can add new task. Can delete task. Can order by priority or creation date.
export default function main() {

	const todoDir = getPreferenceValues<Preferences>().todoDir
	const [query, setQuery] = useState<string>('');
	const [filterType, setFilterType] = useState<FilterType>('AND')
	const [groupingKey, setGroupingKey] = useState<GroupingKey>('PRIORITY')
	const [orderingKey, setOrderingKey] = useState<OrderingKey | null>(null)
	const [sortingOrder, setSortingOrder] = useState<'ASCENDING' | 'DESCENDING'>('ASCENDING')


	const getTasksFilter: TaskSearchFilter = { completed: false }

	const { data: tasks, isLoading, revalidate, mutate } = usePromise(
		async () => await getTasks({ todoDir, filter: getTasksFilter, filterType }))

	const taskBuckets = useMemo(
		() => groupTasks(tasks, groupingKey, orderingKey, sortingOrder),
		[tasks, groupingKey, orderingKey, sortingOrder])

	const filteredBuckets = useMemo(
		() => {
			let output: TaskBuckets = { bucketOrder: taskBuckets.bucketOrder, buckets: {} }
			for (let bucket of taskBuckets.bucketOrder) {
				output.buckets[bucket] =
					filterTasks(taskBuckets.buckets[bucket], query, filterType)
			}
			return output
		}
		, [taskBuckets, query, filterType]
	)

	const globalActions = [
		<Action.Push title="Add Task"
			target={<CreateTaskLayer onSubmit={async () => { await revalidate() }} />} />,

		<Action.Push
			title="Change Grouping Key"
			target={<DropdownStateChangeLayer
				options={GROUPING_KEYS as GroupingKey[]}
				optionStrings={GROUPING_KEYS} setState={setGroupingKey}
				initialValue={groupingKey} valueTitle="Grouping Key" />}
		/>,

		<Action.Push
			title="Change Ordering Key"
			target={<DropdownStateChangeLayer
				options={ORDERING_KEYS as (OrderingKey | null)[]}
				optionStrings={ORDERING_KEYS} setState={setOrderingKey}
				initialValue={groupingKey} valueTitle="Ordering Key" />}
		/>,

		<Action
			title="Toggle Sorting Order"
			onAction={() => setSortingOrder(sortingOrder === 'ASCENDING' ? 'DESCENDING' : 'ASCENDING')}
		/>,

		<Action
			title="Toggle Filter Type (AND / OR)"
			onAction={() => setFilterType(filterType === 'AND' ? 'OR' : 'AND')}
		/>

	]

	return <List
		onSearchTextChange={setQuery}
		searchBarPlaceholder="Search using +PROJECT, @CONTEXT, KEY:VALUE, or a phrase"
		actions={
			<ActionPanel>
				{...globalActions}
			</ActionPanel>
		}
		isLoading={isLoading}>

		<TaskListView buckets={taskBuckets} globalActions={globalActions} />

		<List.EmptyView
			title="No tasks"
			actions={
				<ActionPanel>
					{...globalActions}
				</ActionPanel>
			}
		/>
	</List>
}
