import { describe, expect, test } from 'bun:test';
import { htmlToMarkdown } from './htmlToMarkdown.js';

// If this fails: inline code/emphasis markup is lost when rendering the
// fallback problem statement.
test('converts inline code, strong, and em tags', () => {
  expect(htmlToMarkdown('<p>Given a string <code>s</code>, return the <strong>maximum</strong> <em>length</em>.</p>')).toBe(
    'Given a string `s`, return the **maximum** *length*.'
  );
});

// If this fails: the Input/Output/Explanation examples inside <pre> blocks are
// not preserved as readable code blocks.
test('converts pre blocks to fenced code blocks', () => {
  const html =
    '<p>Return the max.</p><pre><strong>Input:</strong> s = "bcbbbcba"\n<strong>Output:</strong> 4</pre>';
  const markdown = htmlToMarkdown(html);
  expect(markdown).toContain('```');
  expect(markdown).toContain('Input: s = "bcbbbcba"');
  expect(markdown).toContain('Output: 4');
  expect(markdown).not.toContain('<');
});

// If this fails: list items lose their bullet markers.
test('converts list items to markdown bullets', () => {
  expect(htmlToMarkdown('<ul><li>One</li><li>Two</li></ul>')).toBe('- One\n- Two');
});

// If this fails: links are dropped instead of becoming masked links.
test('converts links to masked links', () => {
  expect(htmlToMarkdown('<p>See <a href="https://example.com">this</a>.</p>')).toBe('See [this](https://example.com).');
});

// If this fails: HTML entities leak into the card text.
test('decodes HTML entities', () => {
  expect(htmlToMarkdown('<p>a &lt; b &amp;&amp; c &gt; d</p>')).toBe('a < b && c > d');
});

// If this fails: multi-paragraph statements are jammed together.
test('separates paragraphs with blank lines', () => {
  expect(htmlToMarkdown('<p>First paragraph.</p><p>Second paragraph.</p>')).toBe(
    'First paragraph.\n\nSecond paragraph.'
  );
});
