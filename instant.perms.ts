// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react-native";

const rules = {
  $files: {
    allow: {
      view: "auth.id != null && auth.id == data.ownerId",
      create: "auth.id != null && auth.id == data.ownerId",
      delete: "auth.id != null && auth.id == data.ownerId",
      update: "auth.id != null && auth.id == data.ownerId",
    },
  },
  profile: {
    allow: {
      view: "auth.id != null && (auth.email == data.email || auth.id == data.userId)",
      create: "auth.id != null && auth.email == data.email",
      delete: "auth.id != null && (auth.id == data.userId || auth.email == data.email)",
      update: "auth.id != null && (auth.id == data.userId || auth.email == data.email)",
    },
  },
} satisfies InstantRules;

export default rules;
