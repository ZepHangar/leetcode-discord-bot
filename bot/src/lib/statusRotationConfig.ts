/**
 * Status rotation config template — edit this array to configure what the bot
 * shows as its Discord presence. Each entry renders for `duration` seconds,
 * then the next entry applies. `render` runs per-tick, so live values
 * (guild count, uptime) stay fresh.
 */
import type { StatusRotationEntry } from "../types/statusRotation.js";
import {
  getGuildCountText,
  getProcessUptimeText,
} from "./statusRotationMetrics.js";

export const STATUS_ROTATION_ENTRIES: StatusRotationEntry[] = [
  {
    type: "playing",
    status: "online",
    duration: 20,
    render: (client) => `in ${getGuildCountText(client)}`,
  },
  {
    type: "playing",
    status: "idle",
    duration: 10,
    render: () => `online for ${getProcessUptimeText()}`,
  },
];
