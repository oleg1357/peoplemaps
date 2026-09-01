import { defineLive } from "next-sanity/live";
import { client, sanityConfigured } from "./client";

export const { sanityFetch, SanityLive } = sanityConfigured
  ? defineLive({
      client: client!,
      serverToken: process.env.SANITY_API_READ_TOKEN,
      browserToken: process.env.SANITY_API_READ_TOKEN,
    })
  : {
      sanityFetch: async () => ({ data: null }),
      SanityLive: () => null,
    };
