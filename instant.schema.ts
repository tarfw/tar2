// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react-native";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    profile: i.entity({
      createdAt: i.string().optional(),
      email: i.string().optional(),
      instantapp: i.string().optional(),
      lastLoginAt: i.string().optional(),
      name: i.string().optional(),
      username: i.string().unique().indexed().optional(),
    }),
  },
  links: {
    profile$users: {
      forward: {
        on: "profile",
        has: "one",
        label: "$users",
        required: true,
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "one",
        label: "profile",
        onDelete: "cascade",
      },
    },
  },
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
