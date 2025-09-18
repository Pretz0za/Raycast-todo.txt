/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Todo Folder - The folder where new or existing todo.txt files are. */
  "todoDir": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `create-new-task` command */
  export type CreateNewTask = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `create-new-task` command */
  export type CreateNewTask = {
  /** Write your new task... */
  "task": string,
  /** Project(s) this task is for... */
  "projects": string,
  /** Context(s) for this task... */
  "contexts": string,
  /** Priority of task... */
  "priority": "A" | "B" | "C" | "D" | "none"
}
}

