import type { ExtendedClient } from '../classes/ExtendedClient.js';

function pluralize(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? '' : 's'}`;
}

export function formatBotUptime(totalSeconds: number): string {
  const normalizedSeconds = Number.isFinite(totalSeconds) && totalSeconds > 0
    ? Math.floor(totalSeconds)
    : 0;

  const days = Math.floor(normalizedSeconds / 86_400);
  const hours = Math.floor((normalizedSeconds % 86_400) / 3_600);
  const minutes = Math.floor((normalizedSeconds % 3_600) / 60);
  const seconds = normalizedSeconds % 60;

  const noLargerUnits = days === 0 && hours === 0 && minutes === 0;

  const parts = [
    days > 0 ? pluralize(days, 'day') : null,
    hours > 0 ? pluralize(hours, 'hour') : null,
    minutes > 0 ? pluralize(minutes, 'minute') : null,
    noLargerUnits ? pluralize(seconds, 'second') : null,
  ].filter((part): part is string => part !== null);

  return parts.slice(0, 2).join(' ');
}

export function getGuildCount(client: ExtendedClient): number {
  return client.guilds?.cache?.size ?? 0;
}

export function getGuildCountText(client: ExtendedClient): string {
  const count = getGuildCount(client);
  return `${count} guild${count === 1 ? '' : 's'}`;
}

export function getProcessUptimeText(): string {
  return formatBotUptime(process.uptime());
}
