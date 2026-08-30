import { defineType, defineField } from "sanity";

// A user-created map. The map document holds only the map's settings/metadata.
// The actual points (spots) live in MongoDB, linked via `mapId` == this document's _id.
export const map = defineType({
  name: "map",
  title: "Map",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Map title",
      type: "string",
      validation: (rule) => rule.required().min(2).max(60),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "ownerId",
      title: "Owner (Supabase user id)",
      type: "string",
      description:
        "The auth user who created this map. Leave blank for shared/public maps.",
    }),
    defineField({
      name: "ownerName",
      title: "Owner display name",
      type: "string",
    }),
    defineField({
      name: "isPublic",
      title: "Public",
      type: "string",
      options: {
        list: [
          { title: "Public (anyone can view)", value: "public" },
          { title: "Private (owner only)", value: "private" },
        ],
        layout: "radio",
      },
      initialValue: "public",
    }),
    defineField({
      name: "baseCenter",
      title: "Default map center",
      type: "object",
      fields: [
        defineField({ name: "lat", type: "number" }),
        defineField({ name: "lng", type: "number" }),
      ],
    }),
    defineField({
      name: "baseZoom",
      title: "Default zoom",
      type: "number",
      validation: (rule) => rule.min(3).max(18),
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "description",
    },
  },
});
