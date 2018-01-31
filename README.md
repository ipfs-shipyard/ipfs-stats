# ipfs-stats

[![npm](https://img.shields.io/npm/v/ipfs-stats.svg?style=flat-square)](https://www.npmjs.com/package/ipfs-stats)
[![Travis](https://img.shields.io/travis/ipfs-shipyard/ipfs-stats.svg?style=flat-square)](https://travis-ci.org/ipfs-shipyard/ipfs-stats)

This lets you poll peer and node stats from IPFS very easily.

## Install

### In Node.js through npm

```bash
$ npm install --save ipfs-stats
```

### Browser: Browserify, Webpack, other bundlers

The code published to npm that gets loaded on require is in fact an ES5 transpiled version with the right shims added. This means that you can require it and use with your favorite bundler without having to adjust asset management process.

```js
const StatsPoller = require('ipfs-stats')
```

### In the Browser through `<script>` tag

Loading this module through a script tag will make the ```IpfsStats``` obj available in the global namespace.

```
<script src="https://unpkg.com/ipfs-stats/dist/index.min.js"></script>
<!-- OR -->
<script src="https://unpkg.com/ipfs-stats/dist/index.js"></script>
```

## API

### Class `StatsPoller`

#### `new StatsPoller(ipfs, [frequency])`

- `ipfs` Object. [IPFS API Object](https://github.com/ipfs/js-ipfs-api).
- `frequency` Integer (optional). The frequency, in milliseconds, to push new stats. Defaults to `1000`.

#### Properties

- `poller.stats` retrieves the current stats. It should contain the fields `bw`, `id`, `peers` and `repo`.
    
#### Methods

- `poller.start([opts])` tells the poller to start polling the `opts`.
- `poller.stop([opts])` tells the poller to stop polling the `opts`.

`opts` is an Array of strings. Default is `['bw', 'id', 'peers', 'repo']`. Beware that the `id` poller only runs once because
the ID stats are the same throughout the lifespan of the daemon.


#### Events

- `change`
