# Agent Guidelines

You are lazy and stupid. So is the person who will read your code next. This is not self-deprecation — it is a design principle. Every decision you make should assume the next person to touch this code (including you, five minutes from now) will not remember how it works, will not read surrounding context carefully, and will make the most obvious possible mistake. Your job is to make that impossible.

## The Prime Directive

**Make the computer do the work.**

You are not here to prove you are clever. You are here to produce code that a lazy, stupid person can use without breaking things. Every type annotation, every test, every assertion, every abstraction boundary exists for one reason: so that when someone (you) screws up, the computer catches it instead of a user.

## Design Principles

### 1. If you can't explain what it does in one sentence, break it up

Every function, type, module, and class should have one job you can state plainly. If the explanation requires "and" or "but", it's doing too much. If you have to read three other files to understand what a function does, that function is not telling you what it does, and that is the function's fault.

### 2. Make invalid states unrepresentable

Don't rely on runtime checks to enforce rules that the type system can enforce at compile time. If an operation only makes sense during a specific phase, that phase should be a distinct type. If a value can only be one of three things, it should be a union of three things, not a string. If calling two functions in the wrong order causes a bug, restructure so the wrong order is a type error.

```ts
// Bad: caller must remember not to do this
class Game {
  setupRoles(): void { /* ... */ }
  start(): void { /* ... */ }
  // Nothing stops you from calling setupRoles() mid-game.
}

// Good: wrong operation is impossible to express
type Game = SetupPhase | NightPhase | DayPhase | VotingPhase | GameOver;
// You can only call setup operations on SetupPhase.
// The compiler enforces this. You don't have to remember anything.
```

### 3. Contracts over conventions

For every function, you should be able to state:
- **Preconditions**: what must be true before calling it
- **Postconditions**: what will be true after it returns (assuming preconditions were met)

Write these down. Document them in JSDoc. Pin them with tests. Enforce them with types. Then never think about the internals again — it's a black box that does what it says.

```ts
/**
 * Award points to the counting channel's current holder.
 *
 * @precondition The channel has an active counting game with a current holder.
 * @postcondition The holder's score is incremented and persisted.
 * @throws {NoCounting} if no game is active in this channel.
 */
```

### 4. Crash early, crash loudly

A program that silently does the wrong thing is worse than a program that crashes. Crashes give you a stack trace — the computer telling you exactly what it didn't like. Silent corruption gives you a mystery to solve at 2 AM.

- Use assertions for conditions that should never be false if the code is correct.
- Throw on bad input at the boundary, not deep in the call stack.
- Prefer `throw` over returning a default value that hides a bug.
- Never write an empty `catch {}` block. If you catch, handle it or rethrow it.

### 5. Tests verify properties, not procedures

A test is useful only if you can answer: **"If this test fails, what bug has it found?"**

If you cannot answer that clearly, the test is bad. Delete it and write a better one.

- **Good test**: "If this fails, the scoring system awarded the wrong number of points."
- **Bad test**: "If this fails, the function called these three methods in this specific order." That tells you nothing about whether the program works.

Mock-based tests are suspect by default. A mock that checks "did you call X then Y then Z" is testing the implementation, not the behavior. Instead, control inputs and verify outputs. Test the contract, not the wiring.

### 6. Types are documentation that the compiler checks

Type annotations are not ceremony. They are you telling the compiler what you meant, so it can tell you when you're wrong. This is the cheapest possible bug detection — it runs every time you save the file and catches entire categories of mistakes before the code ever executes.

- No `any`. No `@ts-ignore`. No `@ts-expect-error`. If the type system is fighting you, the types are trying to tell you something about your design. Listen.
- Narrow `unknown` instead of widening to `any`.
- Use discriminated unions for state.
- Use `satisfies` to check structure without widening.

This project has `strict: true` and `noUncheckedIndexedAccess: true`. These are load-bearing. Do not loosen them.

## How to Write Tests

This project uses `bun test` with test files co-located next to source: `foo.ts` → `foo.test.ts`. No separate `__tests__` directories.

### The one rule that matters

Every test must have a comment above it answering: **"If this test fails, what bug has it found?"**

```ts
// If this fails: out-of-range months are being accepted
test('rejects month 0 and month 13', () => {
  expect(isValidBirthday(0, 1)).toBe(false);
  expect(isValidBirthday(13, 1)).toBe(false);
});
```

If you can't write that comment, the test is not worth writing. Delete it and think about what property you actually care about.

### What to test

Test **pure functions and validators first** — they have the highest value-to-effort ratio. These are functions where you control the input and can directly assert the output without touching Discord, databases, or the network.

Good candidates:
- Validators (`isValidBirthday`, `validateCountingEmoji`)
- Formatters (`formatBirthday`, `formatBotUptime`)
- Parsers and serializers (`buildCustomId` / `parseCustomId`)
- Config loaders that throw on bad input (`loadEnv`)
- Type-level validators (`validateStatusRotationEntries`)

Bad candidates (don't bother until the pure stuff is covered):
- Discord event handlers that require a running bot
- Functions that are thin wrappers around Prisma queries
- Anything that needs 50 lines of mock setup to call

### What a good test looks like

**1. Test the contract, not the wiring.** Control inputs, assert outputs. No mocks unless there is no alternative.

```ts
// Good: tests the contract — does this input produce this output?
test('formats known month/day pairs', () => {
  expect(formatBirthday(1, 15)).toBe('January 15');
  expect(formatBirthday(12, 25)).toBe('December 25');
});

// Bad: tests the wiring — did it call the right internal method?
test('calls monthNames array with correct index', () => {
  const spy = jest.spyOn(internals, 'getMonthName');
  formatBirthday(1, 15);
  expect(spy).toHaveBeenCalledWith(0);
});
```

**2. Test boundaries, not just happy paths.** Every function has edges — find them.

- What happens at 0? At -1? At `NaN`? At `Infinity`?
- What happens with an empty string? With whitespace only?
- What happens at the maximum valid value? One past it?

**3. Use roundtrip tests for encode/decode pairs.** If you have `build` and `parse`, feed the output of `build` into `parse` and verify you get back what you started with.

```ts
test('roundtrips a basic category:command:action', () => {
  const id = buildCustomId('birthday', 'set', 'confirm');
  const parsed = parseCustomId(id);
  expect(parsed.category).toBe('birthday');
  expect(parsed.command).toBe('set');
  expect(parsed.action).toBe('confirm');
});
```

**4. Use factory helpers for complex test data.** Don't repeat the same 5-field object literal in every test. Build a `validEntry()` helper that returns known-good data, then override individual fields to test specific violations.

```ts
function validEntry(overrides?: Partial<NonStreamingStatusRotationEntry>): NonStreamingStatusRotationEntry {
  return { type: 'playing', status: 'online', duration: 10, render: () => 'test', ...overrides };
}

test('throws for non-positive duration', () => {
  expect(() => validate([validEntry({ duration: 0 })])).toThrow('duration');
});
```

**5. Isolate side effects.** If a test mutates global state (like `process.env`), save and restore it in `beforeEach`/`afterEach`. Every test must leave the world the way it found it.

**6. Exhaustively cover enum-like values.** If a function accepts a fixed set of valid inputs (`'playing' | 'listening' | 'watching' | 'competing'`), test every single one. A loop is fine. Future additions to the union will break the test — that's the point.

### What not to do

- **Don't test implementation details.** If refactoring the internals without changing behavior breaks your test, the test is wrong.
- **Don't use mocks when you can use real inputs.** A mock is an assumption about how something else works. Assumptions rot. Real inputs don't.
- **Don't write tests that pass regardless of whether the code works.** If you comment out the function body and the test still passes, the test is worthless.
- **Don't write one giant test per function.** One assertion per property. When it fails, you want to know exactly which property broke, not "something in the 40-line test is wrong."

## When You're Stuck

If you look at code and don't understand what it does, **that is the code's fault.** Do not power through. Do not guess. Stop and fix the code so that a lazy, stupid person can understand it:

1. **Name things precisely.** If a variable name doesn't tell you what it holds, rename it.
2. **Extract and document.** If a block of logic is opaque, extract it into a named function with a JSDoc contract.
3. **Add types.** If the shape of data flowing through is unclear, define a type for it.
4. **Add assertions.** If you're not sure something is true at a certain point, assert it. Now the program checks for you.
5. **Add a test.** If you're not sure a piece of code does what you think, write a test. Now you know, and the computer will tell you if it ever stops being true.

Do not try to be heroic. Do the boring thing. Make the code explain itself. Then move on and never think about it again.

## AI-Specific Rules

You (the AI agent) are stupider than you are lazy. You will try whatever looks like it might work and then force it to work, making a mess, instead of recognizing it's too hard and doing something simpler. Resist this.

1. **Do not generate code you cannot explain.** If you can't state what a function does, what it expects, and what it guarantees — in plain language — you don't understand it well enough to write it.
2. **When something is getting complicated, stop and simplify.** If your fix is getting long or touching many files, you are probably doing it wrong. Back up. Find the simpler approach. An appropriately lazy person would.
3. **Document contracts as you go.** Every function gets a JSDoc comment stating what it does. Every type gets a comment explaining what it represents. This is not optional.
4. **Do not suppress errors to make things compile.** A type error is the computer telling you about a bug. Fix the bug, don't silence the messenger.
5. **When modifying existing code, understand the contract first.** Read the types, read the tests, read the docs. Then change the code. If there are no types/tests/docs, add them first, then change the code.
6. **Prefer small, verifiable changes.** One function at a time. Verify it works. Move on. Do not rewrite three modules in one pass and hope it all fits together.
7. **If you feel like you're forcing something to work — stop.** That feeling is a signal. The design is wrong. Step back and redesign the part that's fighting you.
