/**
 * Parsing helpers for modal submit payloads built from Label-wrapped Components
 * V2 inputs (Radio Group, File Upload, Text Input).
 *
 * discord.js flattens Label wrappers into `fields` keyed by the inner
 * component's customId, so no router change is needed for the nested shape;
 * Radio Groups arrive as `{ type: 21, customId, value }` (single `value`, not
 * `values`).
 *
 * @module features/daily/modalFields
 */
import { ComponentType, type ModalSubmitFields } from 'discord.js';

/** Runtime shape of a Radio Group field inside a modal submit payload. */
interface RadioGroupField {
  type: ComponentType.RadioGroup;
  customId: string;
  value: string | null;
}

/**
 * Read the selected option value of a Radio Group.
 *
 * @returns The selected option value, or `null` when nothing was selected.
 * @throws {DiscordjsTypeError} If no field with `customId` exists.
 */
export function getRadioGroupValue(fields: ModalSubmitFields, customId: string): string | null {
  const field = fields.getField(customId) as unknown as RadioGroupField;
  return field.value ?? null;
}

/**
 * Read the first uploaded file of a File Upload field.
 *
 * @returns `{ url, name }` of the first attachment, or `null` when none.
 * @throws {DiscordjsTypeError} If no field with `customId` exists.
 */
export function getUploadedFile(
  fields: ModalSubmitFields,
  customId: string
): { url: string; name: string } | null {
  const file = fields.getUploadedFiles(customId, false)?.first();
  return file ? { url: file.url, name: file.name } : null;
}
