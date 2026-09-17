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
    // ---- Freshness / data quality ----
    defineField({
      name: "staleAfterDays",
      title: "Stale spot threshold (days)",
      description:
        "Spots not verified within this many days are shown as 'needs verification'. 0 disables staleness tracking.",
      type: "number",
      initialValue: 0,
      validation: (rule) => rule.min(0).max(365),
    }),
    defineField({
      name: "requireSpotFields",
      title: "Required fields for new spots",
      description: "Fields visitors must fill in when adding a spot.",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: [
          { title: "Street", value: "street" },
          { title: "City", value: "city" },
          { title: "Price level", value: "priceLevel" },
          { title: "Opening hours", value: "hoursNote" },
          { title: "Tags", value: "tags" },
          { title: "Insider tip", value: "tip" },
        ],
        layout: "tags",
      },
    }),
    defineField({
      name: "suggestedTags",
      title: "Suggested tags",
      description: "Comma-separated tag suggestions shown in the add-spot form.",
      type: "string",
    }),
    defineField({
      name: "allowDuplicateSpots",
      title: "Allow duplicate spots",
      description:
        "When off, contributors are warned when a spot with the same name already exists.",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "defaultSpotStatus",
      title: "Default status for new spots",
      description: "Status applied to spots added to this map.",
      type: "string",
      options: {
        list: [
          { title: "Open", value: "open" },
          { title: "Closed", value: "closed" },
          { title: "Unknown", value: "unknown" },
        ],
        layout: "radio",
      },
      initialValue: "unknown",
    }),
    // ---- Governance ----
    defineField({
      name: "freezeSubmissions",
      title: "Freeze submissions",
      description: "When on, no one (except owners/moderators) can add or change content.",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "requireLoginToReview",
      title: "Require login to review or vote",
      description: "When on, anonymous visitors cannot rate, review, comment or vote.",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "maxReviewsPerSpotPerUser",
      title: "Max reviews per user per spot (0 = unlimited)",
      type: "number",
      initialValue: 1,
      validation: (rule) => rule.min(0).max(50),
    }),
    defineField({
      name: "collaborationDraw",
      title: "Who can draw zones and routes",
      description:
        "Separate from 'who can add spots'. Controls zone/route drawing only.",
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
      name: "trustedContributorIds",
      title: "Trusted contributors",
      description:
        "Supabase user ids whose spot submissions skip the approval queue. Comma separated.",
      type: "string",
    }),
    defineField({
      name: "submissionCooldown",
      title: "Submission cooldown (seconds)",
      description: "Minimum time between submissions from the same visitor. 0 = off.",
      type: "number",
      initialValue: 0,
      validation: (rule) => rule.min(0).max(3600),
    }),
    // ---- Map experience ----
    defineField({
      name: "tiles",
      title: "Default basemap",
      type: "string",
      options: {
        list: [
          { title: "Streets", value: "osm" },
          { title: "Satellite", value: "satellite" },
          { title: "Dark", value: "dark" },
        ],
        layout: "radio",
      },
      initialValue: "osm",
    }),
    defineField({
      name: "minZoom",
      title: "Minimum zoom",
      type: "number",
      initialValue: 3,
      validation: (rule) => rule.min(1).max(18),
    }),
    defineField({
      name: "maxZoom",
      title: "Maximum zoom",
      type: "number",
      initialValue: 18,
      validation: (rule) => rule.min(3).max(19),
    }),
    defineField({
      name: "restrictPan",
      title: "Restrict panning to the map area",
      description: "Keeps visitors from panning far away from the map's center.",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "defaultSpotSort",
      title: "Default spot sort",
      type: "string",
      options: {
        list: [
          { title: "Newest first", value: "newest" },
          { title: "Highest rated", value: "rating" },
          { title: "Name (A–Z)", value: "name" },
        ],
      },
      initialValue: "newest",
    }),
    defineField({
      name: "defaultLayerSpots",
      title: "Show spots by default",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "defaultLayerZones",
      title: "Show zones by default",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "defaultLayerRoutes",
      title: "Show routes by default",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "defaultLayerHeat",
      title: "Show heatmap by default",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "defaultLayerChoropleth",
      title: "Show choropleth by default",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "zoomToUser",
      title: "Zoom to visitor's location on open",
      description: "Asks for location permission and centers the map on the visitor.",
      type: "boolean",
      initialValue: false,
    }),
    // ---- Identity / discovery ----
    defineField({
      name: "status",
      title: "Map status",
      description: "Draft maps are hidden from the homepage until published.",
      type: "string",
      options: {
        list: [
          { title: "Draft", value: "draft" },
          { title: "Published", value: "published" },
        ],
        layout: "radio",
      },
      initialValue: "published",
    }),
    defineField({
      name: "showOnHomepage",
      title: "Show on homepage",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "mapEmoji",
      title: "Map icon (emoji)",
      description: "Small icon shown next to the map title.",
      type: "string",
    }),
    defineField({
      name: "region",
      title: "Region / language",
      description: "Free-form region label (e.g. 'Copenhagen', 'Berlin').",
      type: "string",
    }),
    defineField({
      name: "announcement",
      title: "Announcement banner",
      description: "Short on-map banner. Leave empty to hide.",
      type: "text",
      rows: 2,
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "description",
    },
  },
});
