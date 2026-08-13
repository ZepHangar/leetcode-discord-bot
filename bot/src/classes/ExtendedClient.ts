import { Client, type ClientOptions } from 'discord.js';
import type { Command } from '../types/command.js';

export class ExtendedClient extends Client {
  /** Outer key: category name, Inner key: subcommand name */
  public commands: Map<string, Map<string, Command>>;
  public commandsRegistered: boolean;
  /** Category names whose commands may only run inside a guild */
  public guildOnlyCategories: Set<string>;
  /** Bot permissions required per category, checked before command execution */
  public categoryBotPermissions: Map<string, bigint[]>;
  /** Stop handle for the status rotation ticker; null when not running */
  public statusRotationStop: (() => void) | null;

  constructor(options: ClientOptions) {
    super(options);
    this.commands = new Map();
    this.commandsRegistered = false;
    this.guildOnlyCategories = new Set();
    this.categoryBotPermissions = new Map();
    this.statusRotationStop = null;
  }

  /** Get a specific command by category and subcommand name */
  getCommand(category: string, subcommand: string): Command | undefined {
    return this.commands.get(category)?.get(subcommand);
  }
}
