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
