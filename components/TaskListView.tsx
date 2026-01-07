import { Action, ActionPanel, Icon, List } from "@raycast/api"
import { GROUPING_KEYS, GroupingKey, TaskBuckets } from "../utils/types"
import { JSX } from "react";
declare const DropdownStateChange: any;




export type TaskListViewProps = {
	buckets: TaskBuckets
	globalActions: JSX.Element[]
}


const TaskListView = ({ buckets, globalActions }: TaskListViewProps) => {
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

							{...globalActions}

						</ActionPanel>
					}
				/>
			))}
		</List.Section>
	))
}


export default TaskListView


