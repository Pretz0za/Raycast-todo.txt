import { Action, ActionPanel, Form, getPreferenceValues, Icon, LaunchProps, List, useNavigation } from "@raycast/api"
import { getTasks, Task, Priority, createNewTask, GetTasksFilters } from "../utils/todoAPI"
import { useEffect, useState } from "react"
import { FormValidation, MutatePromise, useForm, usePromise } from "@raycast/utils"
import { parseCSVString, parsePriorityString, reduceSet } from "../utils/helpers"
import { CreateTaskArguments } from "./create-new-task"

export type TaskSearchFilter = {
	projects: string,
	contexts: string
}

export default function main(props: LaunchProps<{ arguments: TaskSearchFilter }>) {
	const todoDir = getPreferenceValues<Preferences>().todoDir
	const [filters, setFilters] = useState<GetTasksFilters>({ projects: parseCSVString(props.arguments.projects), contexts: parseCSVString(props.arguments.contexts) })
	const { data: tasks, isLoading, revalidate, mutate } = usePromise(() => getTasks({ todoDir, filters }))

	if (!tasks) return <List isLoading={true} />

	const tasksByPriority = new Map<Priority | 'none', Task[]>
	for (const priority of ['A', 'B', 'C', 'D', undefined] as Priority[]) {
		tasksByPriority.set(priority ?? 'none', tasks.filter(task => task.priority === priority))
	}

	return <List actions={
		<ActionPanel>
			<Action.Push
				title="Add Task"
				target={<AddTaskForm revalidate={revalidate} />}
			/>
			<Action.Push
				title="Change Filters"
				target={<ChangeFiltersForm setFilters={setFilters} projects={filters.projects} contexts={filters.contexts} />}
			/>
		</ActionPanel>
	} isLoading={isLoading}>

		{Object.keys(Object.fromEntries(tasksByPriority)).map(priority => (
			<List.Section key={priority} title={priority === 'none' ? 'Low Priority' : `Priority ${priority}`}>
				{tasksByPriority.get(priority as Priority | 'none')?.map(task => (
					<List.Item key={task.line} title={task.title} icon={Icon.Dot}
						accessories={
							[
								task.projects.size > 0 ?
									{ text: Array.from(task.projects).join(", "), icon: Icon.Folder } : {},
								task.contexts.size > 0 ?
									{ text: Array.from(task.contexts).join(', '), icon: Icon.Clipboard } : {}
							]
						} />
				))}
			</List.Section>
		))
		}

		<List.EmptyView
			title="No tasks"
			actions={
				<ActionPanel>
					<Action.Push
						title="Add Task"
						target={<AddTaskForm revalidate={revalidate} />}
					/>
				</ActionPanel>
			}
		/>
	</List>
}

function AddTaskForm({ revalidate }: { revalidate: () => Promise<Task[]> }) {
	const { pop } = useNavigation();
	const todoDir = getPreferenceValues<Preferences>().todoDir

	const { handleSubmit } = useForm<CreateTaskArguments>({
		onSubmit: async function handleSubmit(values: CreateTaskArguments) {
			await createNewTask({
				projects: parseCSVString(values.projects),
				contexts: parseCSVString(values.contexts),
				priority: parsePriorityString(values.priority),
				title: values.title,
				todoDir
			});
			await revalidate();
			pop();
		},

		validation: {
			title: FormValidation.Required,
			priority: FormValidation.Required
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
			<Form.TextField id="title" title="Task" placeholder="Enter new task" />
			<Form.TextField id="projects" title="Project(s)" placeholder="Work, Exam, Apartment, etc..." />
			<Form.TextField id="contexts" title="Context(s)" placeholder="Frontend, Logistics, Bugs, etc..." />
			<Form.Dropdown defaultValue="none" id="priority" title="Priority">
				<Form.Dropdown.Item title="A (Highest)" value="A" />
				<Form.Dropdown.Item title="B" value="B" />
				<Form.Dropdown.Item title="C" value="C" />
				<Form.Dropdown.Item title="D" value="D" />
				<Form.Dropdown.Item title="None (Lowest)" value="none" />
			</Form.Dropdown>
		</Form>
	);
}

function ChangeFiltersForm({ setFilters, projects, contexts }: { setFilters: React.Dispatch<React.SetStateAction<GetTasksFilters>>, projects: Set<string> | undefined, contexts: Set<string> | undefined }) {
	const { pop } = useNavigation()

	const handleSubmit = (data: { projcets: string | undefined, contexts: string | undefined }) => {
		setFilters({
			projects: parseCSVString(data.projcets),
			contexts: parseCSVString(data.contexts)
		})
	}
	return <Form actions={
		<ActionPanel>
			<Action.SubmitForm title="Update Filters" onSubmit={handleSubmit} />
		</ActionPanel>
	}>

		<Form.TextField id="projects" title="Project(s)" defaultValue={projects ? reduceSet<string, string>((acc, curr) => {
			if (acc === '') return curr
			return acc + `, ${curr}`
		}, '', projects) : ''} />
		<Form.TextField id="contexts" title="Context(s)" defaultValue={contexts ? reduceSet<string, string>((acc, curr) => {
			if (acc === '') return curr
			return acc + `, ${curr}`
		}, '', contexts) : ''} />

	</Form>
}
