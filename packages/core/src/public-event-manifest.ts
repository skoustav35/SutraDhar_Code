export * as PublicEventManifest from "./public-event-manifest"

import { Event } from "@sutradhar/schema/event"
import { EventManifest } from "@sutradhar/schema/event-manifest"

export const Definitions = EventManifest.ServerDefinitions
export const Latest = Event.latest(Definitions)
