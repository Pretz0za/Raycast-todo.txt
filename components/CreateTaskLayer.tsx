import { Action, ActionPanel, Form, getPreferenceValues, useNavigation } from "@raycast/api";
import { CreateTaskArguments } from "../src/create-new-task"
import { FormValidation, useForm } from "@raycast/utils";
import { writeTask } from "../utils/todoAPI";

export type CreateTaskLayerProps = {
	onSubmit: (values: CreateTaskArguments) => Promise<void>
}

const CreateTaskLayer = ({ onSubmit }: CreateTaskLayerProps) => {

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
			await onSubmit(values);
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

export default CreateTaskLayer
