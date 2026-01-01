export interface Task {
	line: number;
	completed?: boolean;
	priority?: string;
	completionDate?: Date;
	creationDate?: Date;
	projects: Set<string>;
	contexts: Set<string>;
	body: string; // This includes everything that would come AFTER creationDate.
	meta: Record<string, string>;
}

type FilterType = 'AND' | 'OR';

export interface TaskSearchFilter {
	// TODO: Research whether matching should be exact or partial for context and project sets
	// Currently implemented as exact match.
	completed?: boolean; // defined -> exclusive search, otherwise searches both completed and uncompleted
	priority?: string;
	projects?: Set<string>;
	contexts?: Set<string>;
	type: FilterType;
}

export interface WriteTaskFunctionArgs {
	task: Task;
	todoDir: string;
}

export interface GetTasksArguments {
	filters?: TaskSearchFilter;
	todoDir: string;
}
