import { Action, ActionPanel, Form, useNavigation } from "@raycast/api"
import { GROUPING_KEYS } from "../utils/types"
import { FormValidation, useForm } from "@raycast/utils"

export type DropdownStateChangeLayerProps<T> = {
	setState: React.Dispatch<React.SetStateAction<T>>;
	options: T[];
	optionStrings: string[];
	initialValue?: string;
	valueTitle: string;
};

function DropdownStateChangeLayer<T>({ setState, options, optionStrings,
	initialValue, valueTitle }: DropdownStateChangeLayerProps<T>) {

	const { pop } = useNavigation()
	const defaultValue = initialValue ? GROUPING_KEYS.indexOf(initialValue).toString() : undefined

	const { handleSubmit } = useForm<{ value: string }>({
		onSubmit: (values) => {
			setState(options[parseInt(values.value)])
			pop()
		},
		validation: { value: FormValidation.Required },
		initialValues: { value: defaultValue }
	})

	return <Form
		actions={
			<ActionPanel>
				<Action.SubmitForm title={`Set ${valueTitle}`} onSubmit={handleSubmit} />
			</ActionPanel>
		}
	>
		<Form.Dropdown id="value" title={valueTitle} defaultValue={defaultValue}>
			{optionStrings.map((option, index) =>
				<Form.Dropdown.Item key={`${index}-${option}`}
					title={option} value={index.toString()} />)}
		</Form.Dropdown>
	</Form>

}

export default DropdownStateChangeLayer
