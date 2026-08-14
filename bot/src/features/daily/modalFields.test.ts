import { Client, ModalSubmitInteraction, type APIUser } from 'discord.js';
import { describe, expect, test } from 'bun:test';
import { getRadioGroupValue, getUploadedFile } from './modalFields.js';

/**
 * discord.js's `ModalSubmitInteraction` constructor is typed `private` (the
 * library constructs these internally from gateway payloads), but the
 * constructor is runtime-public. The cast is a test-only seam so we can verify
 * parsing of the nested Label-wrapped payload the daily modals submit.
 */
const ModalSubmitInteractionCtor = ModalSubmitInteraction as unknown as new (
  client: Client,
  data: unknown
) => ModalSubmitInteraction;

const USER: APIUser = {
  id: '123',
  username: 'tester',
  discriminator: '0',
  global_name: 'Tester',
  avatar: null,
  bot: false,
};

interface TestModalSubmitPayload {
  id: string;
  application_id: string;
  type: 5;
  token: string;
  channel_id: string;
  user: APIUser;
  entitlements: unknown[];
  authorizing_integration_owners: Record<string, unknown>;
  data: {
    custom_id: string;
    components: Array<{ type: 18; id: number; component: Record<string, unknown> }>;
    resolved?: {
      attachments: Record<string, Record<string, unknown>>;
    };
  };
}

/**
 * Build a `ModalSubmitInteraction` from a raw API payload whose components are
 * Label (type 18) wrappers — the Components V2 modal shape the daily modals
 * submit.
 */
function buildInteraction(payload: TestModalSubmitPayload): ModalSubmitInteraction {
  return new ModalSubmitInteractionCtor(new Client({ intents: [] }), payload);
}

function submitPayload(): TestModalSubmitPayload {
  return {
    id: '1',
    application_id: '2',
    type: 5,
    token: 'tok',
    channel_id: '456',
    user: USER,
    entitlements: [],
    authorizing_integration_owners: {},
    data: {
      custom_id: 'daily:daily:submit:2026-08-14:max-length-substring',
      components: [
        {
          type: 18,
          id: 1,
          component: { type: 21, id: 2, custom_id: 'difficulty', value: 'good-challenge' },
        },
        {
          type: 18,
          id: 3,
          component: { type: 19, id: 4, custom_id: 'code', values: ['att-1'] },
        },
        {
          type: 18,
          id: 5,
          component: { type: 4, id: 6, custom_id: 'details', value: 'want harder follow-ups' },
        },
      ],
      resolved: {
        attachments: {
          'att-1': {
            id: 'att-1',
            filename: 'solution.py',
            url: 'https://cdn.discordapp.com/attachments/1/solution.py',
            proxy_url: 'https://media.discordapp.net/attachments/1/solution.py',
            size: 512,
            content_type: 'text/x-python',
            width: null,
            height: null,
          },
        },
      },
    },
  };
}

// If this fails: the router/handlers cannot read Radio Group values from the
// nested Label-wrapped modal payload, and every submission/Inc-Dec submit breaks.
test('reads the Radio Group value through Label wrappers', () => {
  const interaction = buildInteraction(submitPayload());
  expect(getRadioGroupValue(interaction.fields, 'difficulty')).toBe('good-challenge');
});

// If this fails: an unselected Radio Group is misread as a selected value.
test('returns null when the Radio Group has no selection', () => {
  const payload = submitPayload();
  payload.data.components[0]!.component.value = null;
  const interaction = buildInteraction(payload);
  expect(getRadioGroupValue(interaction.fields, 'difficulty')).toBeNull();
});

// If this fails: the uploaded code file is not resolvable from the modal submit
// payload, breaking the mandatory code upload.
test('reads the uploaded file through Label wrappers', () => {
  const interaction = buildInteraction(submitPayload());
  expect(getUploadedFile(interaction.fields, 'code')).toEqual({
    url: 'https://cdn.discordapp.com/attachments/1/solution.py',
    name: 'solution.py',
  });
});

// If this fails: a modal submitted without an attachment is treated as a
// successful upload instead of a validation failure.
test('returns null when no file was uploaded', () => {
  const payload = submitPayload();
  payload.data.components[1]!.component.values = [];
  delete payload.data.resolved;
  const interaction = buildInteraction(payload);
  expect(getUploadedFile(interaction.fields, 'code')).toBeNull();
});
