import { describe, expect, test } from 'bun:test';

describe('text-display', () => {
  // If this fails: text children are not joined into a single content string
  test('joins string children into content', () => {
    const el = <text-display>Hello, {'world'}! {42}</text-display>;
    expect(el).toEqual({ type: 10, content: 'Hello, world! 42' });
  });

  // If this fails: non-string children are silently stringified instead of rejected
  test('throws when a child is an element object', () => {
    expect(() => <text-display>{<separator />}</text-display>).toThrow(
      'cv2: <text-display> accepts only string children',
    );
  });
});

describe('section', () => {
  // If this fails: sections render without their required accessory
  test('throws without an accessory', () => {
    expect(() => (
      // @ts-expect-error testing runtime validation of a missing required prop
      <section>
        <text-display>hi</text-display>
      </section>
    )).toThrow('cv2: <section> requires 1-3 <text-display> children and a button/thumbnail accessory');
  });

  // If this fails: sections accept more than Discord's 3 text displays
  test('throws with 4 text-display children', () => {
    expect(() => (
      <section accessory={<button style="primary" customId="a" label="A" />}>
        <text-display>1</text-display>
        <text-display>2</text-display>
        <text-display>3</text-display>
        <text-display>4</text-display>
      </section>
    )).toThrow('cv2: <section> requires 1-3 <text-display> children and a button/thumbnail accessory');
  });

  // If this fails: thumbnail accessories are not inlined into section JSON
  test('accepts a thumbnail accessory', () => {
    const el = (
      <section accessory={<thumbnail url="https://example.com/a.png" />}>
        <text-display>caption</text-display>
      </section>
    );
    expect(el).toEqual({
      type: 9,
      components: [{ type: 10, content: 'caption' }],
      accessory: { type: 11, media: { url: 'https://example.com/a.png' } },
    });
  });
});

describe('button', () => {
  // If this fails: link buttons can be built without a url
  test('link without url throws', () => {
    expect(() => <button style="link" label="x" />).toThrow('cv2: <button style="link"> requires url');
  });

  // If this fails: non-link buttons can be built without a customId
  test('primary without customId throws', () => {
    expect(() => <button style="primary" label="x" />).toThrow('cv2: <button> customId');
  });

  // If this fails: premium buttons carry forbidden props
  test('premium forbids label', () => {
    expect(() => <button style="premium" skuId="123" label="buy" />).toThrow(
      'cv2: <button style="premium"> forbids customId/url/label/emoji',
    );
  });

  // If this fails: string/number children are not mapped to label
  test('maps string children to label', () => {
    const btn = <button style="primary" customId="click">Click Me!</button>;
    expect(btn).toEqual({ type: 2, style: 1, custom_id: 'click', label: 'Click Me!' });
  });

  // If this fails: conflicting label prop and children pass silently
  test('throws if label prop and different children are both provided', () => {
    expect(() => (
      <button style="primary" customId="click" label="Label Prop">Different Child</button>
    )).toThrow('cv2: <button> cannot specify both label prop and different children');
  });
});

describe('option', () => {
  // If this fails: option text children are not mapped to label
  test('maps text children to label', () => {
    const opt = <option value="val1">Option 1 Label</option>;
    expect(opt).toEqual({ label: 'Option 1 Label', value: 'val1' });
  });
});

describe('children enforcement', () => {
  // If this fails: leaf components silently accept children that get dropped
  test('rejects children on leaf components and auto-selects', () => {
    expect(() => (
      // @ts-expect-error testing runtime rejection
      <file url="attachment://log.txt">Unexpected</file>
    )).toThrow('cv2: <file> does not accept children');

    expect(() => (
      // @ts-expect-error testing runtime rejection
      <user-select customId="u">Unexpected</user-select>
    )).toThrow('cv2: <user-select> does not accept children');
  });
});

describe('container', () => {
  // If this fails: nested containers pass validation and Discord rejects the payload
  test('rejects a nested container', () => {
    expect(() => (
      <container>
        <container>
          <text-display>inner</text-display>
        </container>
      </container>
    )).toThrow('cv2: <container> cannot contain another <container>');
  });

  // If this fails: valid container children are rejected
  test('accepts row, section, separator, and file children', () => {
    const el = (
      <container>
        <row>
          <button style="secondary" customId="b" label="B" />
        </row>
        <section accessory={<button style="primary" customId="a" label="A" />}>
          <text-display>body</text-display>
        </section>
        <separator spacing="large" />
        <file url="attachment://log.txt" />
      </container>
    );
    expect((el as { components: { type: number }[] }).components.map((c) => c.type)).toEqual([1, 9, 14, 13]);
  });
});

describe('row', () => {
  // If this fails: rows accept more than 5 buttons
  test('rejects 6 buttons', () => {
    expect(() => (
      <row>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button style="primary" customId={`b${n}`} label={`B${n}`} />
        ))}
      </row>
    )).toThrow('cv2: <row> requires 1-5 <button> children or exactly 1 select menu');
  });

  // If this fails: rows mix buttons with selects, which Discord rejects
  test('rejects a button+select mix', () => {
    expect(() => (
      <row>
        <button style="primary" customId="b" label="B" />
        <string-select customId="s">
          <option label="x" value="x" />
        </string-select>
      </row>
    )).toThrow('cv2: <row> requires 1-5 <button> children or exactly 1 select menu');
  });

  // If this fails: the two valid row shapes are rejected
  test('accepts 5 buttons and accepts 1 select', () => {
    const buttons = (
      <row>
        {[1, 2, 3, 4, 5].map((n) => (
          <button style="primary" customId={`b${n}`} label={`B${n}`} />
        ))}
      </row>
    );
    expect((buttons as { components: unknown[] }).components).toHaveLength(5);

    const select = (
      <row>
        <user-select customId="u" />
      </row>
    );
    expect((select as { components: { type: number }[] }).components[0]?.type).toBe(5);
  });
});

describe('media-gallery', () => {
  // If this fails: empty galleries pass validation
  test('rejects 0 items', () => {
    expect(() => <media-gallery />).toThrow('cv2: <media-gallery> requires 1-10 <media-item> children');
  });

  // If this fails: galleries accept more than Discord's 10 items
  test('rejects 11 items and accepts 10', () => {
    const items = (n: number) =>
      Array.from({ length: n }, (_, i) => <media-item url={`https://example.com/${i}.png`} />);
    expect(() => <media-gallery>{items(11)}</media-gallery>).toThrow(
      'cv2: <media-gallery> requires 1-10 <media-item> children',
    );
    const gallery = <media-gallery>{items(10)}</media-gallery>;
    expect((gallery as { items: unknown[] }).items).toHaveLength(10);
  });
});

describe('file', () => {
  // If this fails: non-attachment urls are accepted and Discord rejects the payload
  test('rejects a non-attachment:// url', () => {
    expect(() => <file url="https://example.com/a.png" />).toThrow(
      'cv2: <file> url must start with "attachment://"',
    );
  });
});

describe('message flags', () => {
  // If this fails: ephemeral messages are missing the 64 flag
  test('ephemeral sets flags to 32832', () => {
    const msg = (
      <message ephemeral>
        <text-display>hi</text-display>
      </message>
    );
    expect(msg.flags).toBe(32832);
  });

  // If this fails: suppressNotifications is not OR'd into the flags
  test('ephemeral + suppressNotifications sets flags to 36928', () => {
    const msg = (
      <message ephemeral suppressNotifications>
        <text-display>hi</text-display>
      </message>
    );
    expect(msg.flags).toBe(36928);
  });
});

describe('message limits and character counting', () => {
  // If this fails: messages with more than 40 components reach Discord and get rejected
  test('throws at 41 counted components', () => {
    const children = Array.from({ length: 13 }, (_, i) => (
      <section accessory={<button style="primary" customId={`b${i}`} label="B" />}>
        <text-display>{`text ${i}`}</text-display>
      </section>
    ));
    const at40 = (
      <message>
        {children}
        <text-display>extra</text-display>
      </message>
    );
    expect(at40.components).toHaveLength(14);

    expect(() => (
      <message>
        {children}
        <text-display>extra</text-display>
        <text-display>one too many</text-display>
      </message>
    )).toThrow('cv2: <message> has 41 components');
  });

  // If this fails: combined text across text-displays, buttons, and select placeholders is not calculated using UTF-8 byte length
  test('calculates total text length across all components including buttons and select options using UTF-8 byte length', () => {
    // 1400 CJK characters = 4200 UTF-8 bytes (though string.length is 1400)
    const cjkText = '字'.repeat(1400);
    expect(() => (
      <message>
        <container>
          <text-display>{cjkText}</text-display>
        </container>
      </message>
    )).toThrow('cv2: <message> has 4200 characters of text');

    // Multi-component text length sum (text-display + button label + option label)
    const textPart = 'a'.repeat(3900);
    const buttonPart = 'b'.repeat(60);
    const optionPart = 'c'.repeat(50);
    expect(() => (
      <message>
        <container>
          <text-display>{textPart}</text-display>
          <row>
            <button style="primary" customId="b" label={buttonPart} />
          </row>
          <row>
            <string-select customId="s">
              <option label={optionPart} value="1" />
            </string-select>
          </row>
        </container>
      </message>
    )).toThrow('cv2: <message> has 4010 characters of text');
  });

  // If this fails: empty messages pass validation
  test('throws with no children', () => {
    expect(() => <message />).toThrow('cv2: <message> requires at least one component child');
  });
});

describe('conditional children', () => {
  // If this fails: false/null children leak into the payload as components
  test('drops false children so {cond && <…/>} works', () => {
    const showExtra = false;
    const msg = (
      <message>
        <container>
          <text-display>always</text-display>
          {showExtra && <text-display>never</text-display>}
        </container>
      </message>
    );
    expect(msg.components).toEqual([{ type: 17, components: [{ type: 10, content: 'always' }] }]);
  });
});

describe('full card snapshot', () => {
  // If this fails: the DSL's end-to-end JSON contract changed — review every consumer
  test('a realistic card matches the expected API JSON', () => {
    const msg = (
      <message ephemeral>
        <container accentColor={0x00ff88}>
          <text-display># Player Profile</text-display>
          <section accessory={<button style="primary" customId="stats" label="Stats" />}>
            <text-display>**Level 42**</text-display>
            <text-display>-# updated just now</text-display>
          </section>
          <separator spacing="large" />
          <media-gallery>
            <media-item url="https://example.com/chart.png" description="stats chart" />
          </media-gallery>
          <file url="attachment://export.csv" spoiler />
          <row>
            <button style="success" customId="refresh" emoji="🔄">Refresh</button>
            <button style="link" url="https://example.com/profile">Open on web</button>
          </row>
        </container>
      </message>
    );

    expect(msg).toEqual({
      flags: 32832,
      components: [
        {
          type: 17,
          accent_color: 0x00ff88,
          components: [
            { type: 10, content: '# Player Profile' },
            {
              type: 9,
              components: [
                { type: 10, content: '**Level 42**' },
                { type: 10, content: '-# updated just now' },
              ],
              accessory: { type: 2, style: 1, custom_id: 'stats', label: 'Stats' },
            },
            { type: 14, spacing: 2 },
            {
              type: 12,
              items: [{ media: { url: 'https://example.com/chart.png' }, description: 'stats chart' }],
            },
            { type: 13, file: { url: 'attachment://export.csv' }, spoiler: true },
            {
              type: 1,
              components: [
                { type: 2, style: 3, custom_id: 'refresh', label: 'Refresh', emoji: { name: '🔄' } },
                { type: 2, style: 5, url: 'https://example.com/profile', label: 'Open on web' },
              ],
            },
          ],
        },
      ],
    });
  });
});
