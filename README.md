# nsite-profile

A simple SPA that serves as a landing page for a nostr nsite. When deployed to an nsite domain, it parses the current host, fetches the owner's profile (kind 0) from relays, and lists the owner's root site, named nsites, and manifest snapshots.

## How it works

1. Parses root, named-site, or snapshot hosts from the hostname
2. Queries bootstrap relays for the user's relay list (kind 10002)
3. Streams in profile (kind 0), nsite manifests (kinds `15128` and `35128`), snapshots (kind `5128`), and theme events as they arrive
4. Renders the profile card and a site list with expandable version history

Data is fully reactive — there's no loading state or waiting. Events stream into an [applesauce](https://github.com/hzrd149/applesauce) `EventStore` and the UI updates as data arrives.

## Stack

- **SvelteKit** with `adapter-static` (client-side SPA, no SSR)
- **Tailwind CSS v4**
- **applesauce-core / applesauce-relay** for EventStore and relay connections
- **nostr-tools** for npub decoding
- **rxjs** for reactive event streams

## Setup

```sh
pnpm install
```

## Development

Create a `.env` file with a test npub for local development:

```sh
VITE_DEV_NPUB=npub1...
```

Then start the dev server:

```sh
pnpm dev
```

On `localhost`, the app uses `VITE_DEV_NPUB` since there's no npub in the hostname. Without it, an error message is shown.

## Build

```sh
pnpm build
```

Outputs a static SPA to `dist/` with `index.html` as the fallback entry point. Deploy the contents of `dist/` to your nsite.

## Project structure

```
src/
  lib/
    nostr/
      bootstrap.ts    # host parsing, site/snapshot URL builders, bootstrap relays
      store.ts         # EventStore + RelayPool singletons
      loaders.ts       # relay subscriptions, nsite/snapshot extraction
    components/
      ProfileCard.svelte
      NsiteList.svelte
      ErrorMessage.svelte
      LoadingSpinner.svelte
  routes/
    +layout.ts         # SPA mode (ssr=false)
    +layout.svelte
    +page.svelte       # main page orchestrator
```
