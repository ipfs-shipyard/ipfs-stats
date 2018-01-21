# ipfs-stats

[![npm](https://img.shields.io/npm/v/ipfs-stats.svg?style=flat-square)](https://www.npmjs.com/package/ipfs-stats)
[![Travis](https://img.shields.io/travis/hacdias/ipfs-stats.svg?style=flat-square)](https://travis-ci.org/hacdias/ipfs-stats)

This lets you poll peer and node stats from IPFS very easily.

## Install

```
npm install --save ipfs-stats
```

## Documentation

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
