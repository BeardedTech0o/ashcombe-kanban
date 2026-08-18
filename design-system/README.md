# nullxx design system, v1

Locked from the neumorphic direction, flattened shadow depth ("Barely There"), teal accent.

## What's locked

- Base surface colour: `#e6e9ee` (light grey blue)
- Text: `#3a3f4a` primary, `#767c88` secondary
- Accent: teal `#2f8a8a`, lighter teal `#6fc4c4` for gradients or fills
- Shadow depth: soft, close in emboss (`2px 2px 5px`, not the deeper `8px 8px 16px` from the first pass)
- Card radius: 22px, controls 13px, badges 20px, progress bars 6px
- Font family: Google Sans Flex, with system font fallback

See `tokens.json` for the full source of truth and `tokens.css` for ready to use custom properties.

## Not decided yet

- Dark mode palette. The neumorphic style depends on the surface and shadow colours matching closely, so dark mode is not just an inverted light mode, it needs its own pass.
- Secondary or semantic colours (success, warning, error, info) beyond the single teal accent.
- How this applies outside the task card context (nav, forms, empty states, modals).

## Applying this to the existing apps

Retrofitting is different from building fresh, so the order matters more than the coverage.

1. **Audit before touching anything.** Get Claude Code to grep the codebase for hardcoded colours, border radius values, box shadow declarations, and spacing (padding/margin) values. That list is the actual scope, not a guess.
2. **Introduce the tokens without applying them yet.** Drop `tokens.css` in as a new file, imported globally, but don't touch any existing component styles in this step. This gets the variables available everywhere with zero visual change, so the diff for step 1 is separated from the diff for step 3 and easy to review or revert independently.
3. **Swap one component family at a time**, not one screen at a time. Buttons everywhere, then cards everywhere, then progress bars everywhere. Swapping by component keeps the change consistent and makes it obvious if you missed an instance, since a stray hardcoded value will visually clash next to its now tokenised siblings.
4. **For apps mid-rebuild**: apply tokens as part of the rebuild rather than to code you're about to replace. No point styling code that's being rewritten.
5. **For apps already in production**: take screenshots of key screens before starting, so you've got a clear before and after to catch regressions.
6. **For apps using native UI**: confirm whether the app shares a webview/HTML rendering layer or uses native controls. If it renders HTML, `tokens.css` drops straight in. If it's native UI, `tokens.json` is still the source of truth, but someone (or Claude Code) needs to translate it into whatever the native styling system uses, since CSS custom properties won't apply directly.
7. **Watch for the gaps.** Anywhere the retrofit hits dark mode or a colour outside the teal accent (success/error states, for instance), stop and flag it rather than improvising a value that isn't in `tokens.json`. Improvised one off values are exactly how design systems drift.

## Hand off to Claude Code

Point Claude Code at `tokens.json` as the single source of truth and have it:

1. Generate the `tokens.css` file (already done here, but regenerate if `tokens.json` changes)
2. Build a small shared package or file that all apps can import
3. Run the audit first, and share the results before writing any component changes
4. Apply the tokens to one real screen first rather than the whole app at once, so you can react to it in context before rolling it out everywhere
