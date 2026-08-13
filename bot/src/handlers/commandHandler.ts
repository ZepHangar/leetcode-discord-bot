import path from 'path';
import { existsSync } from 'fs';
import { SlashCommandBuilder } from 'discord.js';
import { getAllFiles } from '../utils/getAllFiles.js';
import { logger } from '../lib/logger.js';
import type { ExtendedClient } from '../classes/ExtendedClient.js';
import type { Command, CategoryConfig } from '../types/command.js';

const VALID_NAME_REGEX = /^[a-z0-9-]{1,32}$/;

async function importCommand(filePath: string): Promise<Command> {
  const module = await import(filePath);
  const command: unknown = module.default ?? module;

  if (
    !command ||
    typeof command !== 'object' ||
    !('data' in command) ||
    !('execute' in command)
  ) {
    throw new Error(
      `Command file ${filePath} missing required 'data' or 'execute' export`
    );
  }

  const typedCommand = command as Command;

  if (typeof typedCommand.execute !== 'function') {
    throw new Error(
      `Command file ${filePath} 'execute' is not a function`
    );
  }

  return typedCommand;
}

export async function loadCommands(
  client: ExtendedClient
): Promise<SlashCommandBuilder[]> {
  const commandsDir = path.join(import.meta.dir, '..', 'commands');
  const categoryFolders = await getAllFiles(commandsDir, { foldersOnly: true });
  const builders: SlashCommandBuilder[] = [];

  for (const categoryFolder of categoryFolders) {
    const categoryName = path.basename(categoryFolder);

    if (!VALID_NAME_REGEX.test(categoryName)) {
      logger.warn({ category: categoryName }, 'Skipping invalid category folder name');
      continue;
    }

    const builder = new SlashCommandBuilder()
      .setName(categoryName)
      .setDescription(`${categoryName} commands`);

    let categoryConfig: CategoryConfig | undefined;
    const configPathJs = path.join(categoryFolder, '_category.js');
    const configPathTs = path.join(categoryFolder, '_category.ts');
    let configPath: string | undefined;

    if (existsSync(configPathJs)) {
      configPath = configPathJs;
    } else if (existsSync(configPathTs)) {
      configPath = configPathTs;
    }

    if (configPath) {
      const configModule = await import(configPath);
      categoryConfig = (configModule.default ?? configModule) as CategoryConfig;
    }

    if (categoryConfig?.guildOnly) {
      builder.setDMPermission(false);
    }

    if (categoryConfig?.defaultMemberPermissions !== undefined) {
      builder.setDefaultMemberPermissions(categoryConfig.defaultMemberPermissions);
    }

    const isFlat = categoryConfig?.flat === true;

    const categoryMap = new Map<string, Command>();

    const directFiles = await getAllFiles(categoryFolder, { filesOnly: true });
    if (isFlat && directFiles.length !== 1) {
      throw new Error(
        `Flat category "${categoryName}" must contain exactly one command file, found ${directFiles.length}`
      );
    }
    for (const filePath of directFiles) {
      const command = await importCommand(filePath);
      if (!isFlat) {
        builder.addSubcommand(command.data);
      }
      categoryMap.set(command.data.name, command);
    }

    const subfolders = await getAllFiles(categoryFolder, { foldersOnly: true });
    if (isFlat && subfolders.length > 0) {
      throw new Error(`Flat category "${categoryName}" cannot contain subcommand-group folders`);
    }
    for (const subfolder of subfolders) {
      const groupName = path.basename(subfolder);

      if (!VALID_NAME_REGEX.test(groupName)) {
        logger.warn({ category: categoryName, group: groupName }, 'Skipping invalid group folder name');
        continue;
      }

      const groupFiles = await getAllFiles(subfolder, { filesOnly: true });
      const groupCommands: Command[] = [];
      for (const filePath of groupFiles) {
        groupCommands.push(await importCommand(filePath));
      }

      builder.addSubcommandGroup((group) => {
        group.setName(groupName).setDescription(`${groupName} commands`);
        for (const command of groupCommands) {
          group.addSubcommand(command.data);
        }
        return group;
      });

      for (const command of groupCommands) {
        const compoundKey = `${groupName}.${command.data.name}`;
        categoryMap.set(compoundKey, command);
      }
    }

    if (categoryMap.size === 0) {
      logger.warn({ category: categoryName }, 'Skipping empty category folder');
      continue;
    }

    if (isFlat) {
      builder.setDescription(categoryMap.values().next().value!.data.description);
    }

    client.commands.set(categoryName, categoryMap);

    if (categoryConfig?.guildOnly) {
      client.guildOnlyCategories.add(categoryName);
    }
    if (categoryConfig?.botPermissions?.length) {
      client.categoryBotPermissions.set(categoryName, categoryConfig.botPermissions);
    }

    builders.push(builder);

    logger.info(
      { category: categoryName, commands: categoryMap.size },
      'Loaded command category'
    );
  }

  return builders;
}
