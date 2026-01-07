export const GROUPING_KEYS = [
	'PRIORITY',
	'CREATION_DATE',
	'COMPLETION_DATE',
	'DUE_DATE',
	'PROJECT',
	'CONTEXT',
];

export const ORDERING_KEYS = [
	'PRIORITY',
	'CREATION_DATE',
	'COMPLETION_DATE',
	'DUE_DATE',
];

export interface Task {
	line: number;
	completed?: boolean;
	priority?: string;
	completionDate?: Date;
	creationDate?: Date;
	projects: string[];
	contexts: string[];
	body: string; // This includes everything that would come AFTER creationDate.
	meta: Record<string, string>;
}

export type FilterType = 'AND' | 'OR';

export interface TaskSearchFilter {
	// TODO: Research whether matching should be exact or partial for context and project sets
	// Currently implemented as exact match.
	// TODO: Add meta search
	completed?: boolean; // defined -> exclusive search, otherwise searches both completed and uncompleted
	priority?: string;
	projects?: string[];
	contexts?: string[];
	meta?: Record<string, string>;
}

export interface WriteTaskFunctionArgs {
	task: Omit<Task, 'projects' | 'contexts' | 'meta'>;
	todoDir: string;
}

export interface GetTasksArguments {
	filter?: TaskSearchFilter;
	filterType?: FilterType;
	todoDir: string;
}

export interface TaskTitlePreferences {
	line?: boolean;
	completed?: boolean;
	completionDate?: boolean;
	priority?: boolean;
	creationDate?: boolean;
	projects?: boolean;
	contexts?: boolean;
	meta?: boolean;
}

export type TaskBuckets = {
	buckets: Record<string, Task[]>;
	bucketOrder: string[];
};

export type GroupingKey =
	| 'PRIORITY'
	| 'CREATION_DATE'
	| 'COMPLETION_DATE'
	| 'DUE_DATE'
	| 'PROJECT'
	| 'CONTEXT';

export type OrderingKey =
	| 'PRIORITY'
	| 'CREATION_DATE'
	| 'COMPLETION_DATE'
	| 'DUE_DATE';
