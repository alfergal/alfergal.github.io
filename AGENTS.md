## Development

When starting the dev server, use background mode:

```
npm run dev
```

`npm run dev` runs `astro dev --background`. Use the same command from VS Code and the terminal.

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Validation

Run `npm test`, `npm run check`, `npm run build`, and `npm audit` before the stable commit. Tests create isolated temporary copies of this project and manage their own background servers. Never write fixtures into `src/content/blog` or use the editorial dev server for test mutations.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Permanent design rules

- No decorative middle dots (Unicode U+00B7) in visible interface text or generated CSS content. Use separate labels and CSS gaps, not replacement ornaments.
- No horizontal decorative section dividers: no `hr`, separator borders, pseudo-element rules, SVG rules or separator gradients.
- Separate content with subtle dark background tones, vertical space, typography and composition. Preserve Cambria, the existing palette, responsive layouts and accessibility.
- Keep meaningful scientific notation, plot axes, table borders, form controls, focus indicators and reading progress intact. These are functional, not section dividers.
- Apply these rules to both languages, new pages/components/articles, and draft previews. The rendered design-policy tests cover editorial previews and isolated fixtures, including no-JavaScript rendering.
