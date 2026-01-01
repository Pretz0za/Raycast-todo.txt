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

export interface TaskSearchFilter {
	// TODO: Research whether matching should be exact or partial for context and project sets
	// Currently implemented as exact match.
	completed?: boolean;
	priority?: string;
	projects?: Set<string>;
	contexts?: Set<string>;
}

export interface NewTaskFunctionArguments extends Omit<Task, 'line'> {
	todoDir: string;
}

export interface GetTasksArguments {
	filters?: TaskSearchFilter;
	todoDir: string;
}
