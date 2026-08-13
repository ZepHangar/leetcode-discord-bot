import { PermissionFlagsBits } from 'discord.js';
import type { CategoryConfig } from '../../types/command.js';

export default { flat: true, defaultMemberPermissions: PermissionFlagsBits.ManageGuild } satisfies CategoryConfig;
