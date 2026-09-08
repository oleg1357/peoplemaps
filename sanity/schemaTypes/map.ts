import { defineType, defineField } from "sanity";
import {
  DEFAULT_ACCENT,
  DEFAULT_MARKER,
  MARKER_PRESETS,
} from "@/lib/markers-data";

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
    defineField({
      name: "accentColor",
      title: "Accent color",
      description: "Used for buttons and home-page card accents.",
      type: "string",
      initialValue: DEFAULT_ACCENT,
      validation: (rule) =>
        rule.regex(/^#[0-9a-fA-F]{3,8}$/, { name: "hex color" }),
    }),
    defineField({
      name: "defaultMarker",
      title: "Default marker",
      description: "Shown for spots that don't set their own marker.",
      type: "string",
      initialValue: DEFAULT_MARKER.emoji,
      options: {
        list: MARKER_PRESETS.map((m) => ({ title: `${m.emoji} ${m.label}`, value: m.emoji })),
      },
    }),
    defineField({
      name: "defaultMarkerColor",
      title: "Default marker color",
      type: "string",
      initialValue: DEFAULT_MARKER.color,
      validation: (rule) =>
        rule.regex(/^#[0-9a-fA-F]{3,8}$/, { name: "hex color" }),
    }),
    defineField({
      name: "welcomeMessage",
      title: "Welcome message",
      description: "Short banner shown on the map for visitors.",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "submissionNote",
      title: "Add-spot instructions",
      description: "Tip shown when someone adds a spot (e.g. required info).",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "maxPhotosPerSpot",
      title: "Max photos per spot",
      type: "number",
      initialValue: 6,
      validation: (rule) => rule.min(0).max(12),
    }),
    defineField({
      name: "requireApproval",
      title: "Require approval for new spots",
      description:
        "When off, submitted spots appear on the map immediately.",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "coverImage",
      title: "Cover image",
      description:
        "Shown as the card thumbnail on the homepage and profile page.",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "contactEmail",
      title: "Contact email",
      description: "Public contact email for this map.",
      type: "string",
      validation: (rule) =>
        rule.custom((v: string | undefined) => {
          if (!v) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? true : "Invalid email";
        }),
    }),
    defineField({
      name: "website",
      title: "Website",
      description: "External link (personal site, social, etc.).",
      type: "url",
    }),
    defineField({
      name: "allowReviews",
      title: "Allow reviews",
      description: "When off, visitors cannot add reviews to spots.",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "allowComments",
      title: "Allow comments",
      description: "When off, visitors cannot comment on reviews.",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "allowPhotos",
      title: "Allow photos",
      description: "When off, visitors cannot upload photos to spots.",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "collaborationMode",
      title: "Who can add spots",
      type: "string",
      options: {
        list: [
          { title: "Anyone (no login required)", value: "anyone" },
          { title: "Logged-in users", value: "loggedIn" },
          { title: "Owner & moderators only", value: "invitedOnly" },
        ],
        layout: "radio",
      },
      initialValue: "loggedIn",
    }),
    defineField({
      name: "enableClustering",
      title: "Cluster markers on the map",
      description: "When on, nearby markers are grouped into colored clusters.",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "choroplethRamp",
      title: "Choropleth color ramp",
      description:
        "Color scale used to fill valued zones. 'Sequential' goes cool (low) to warm (high); 'Diverging' goes red (low) to green (high).",
      type: "string",
      options: {
        list: [
          { title: "Sequential (blue → amber → red)", value: "sequential" },
          { title: "Diverging (red → amber → green)", value: "diverging" },
        ],
        layout: "radio",
      },
      initialValue: "sequential",
    }),
    defineField({
      name: "choroplethMetric",
      title: "Choropleth value source",
      description:
        "When zones have no manually-set value, this field determines what is auto-computed from the spots inside each zone.",
      type: "string",
      options: {
        list: [
          { title: "Average spot price level", value: "priceLevel" },
          { title: "Average spot rating (reviews)", value: "rating" },
        ],
        layout: "radio",
      },
      initialValue: "priceLevel",
    }),
    defineField({
      name: "category",
      title: "Category",
      description: "Primary category used for home-page filtering and discovery.",
      type: "string",
      options: {
        list: [
          { title: "Food & drink", value: "food" },
          { title: "Sightseeing", value: "sights" },
          { title: "Shopping", value: "shopping" },
          { title: "Outdoors", value: "outdoors" },
          { title: "Nightlife", value: "nightlife" },
          { title: "Arts & culture", value: "arts" },
          { title: "Sports", value: "sports" },
          { title: "Other", value: "other" },
        ],
      },
    }),
    defineField({
      name: "tags",
      title: "Tags",
      description: "Free-form keywords for discovery (comma separated).",
      type: "string",
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "description",
    },
  },
});
