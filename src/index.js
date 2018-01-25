'use strict'

const EventEmitter = require('events').EventEmitter
const debug = require('debug')('stats-poller')
const LocationsPoller = require('ipfs-locations')

const allOptions = ['id', 'bw', 'repo', 'peers']

function makePoller (obj) {
  return {
    running: false,
    stop: false,
    do: obj.do,
    then: obj.then
  }
}

/**
 * It's a Stats Poller.
 * @extends EventEmitter
 */
module.exports = class StatsPoller extends EventEmitter {
  /**
   * Stats Poller constructor.
   * @param {IpfsApi} ipfs
   * @param {Number} frequency
   */
  constructor (ipfs, frequency = 1000) {
    super()

    // Start the variables!
    this.ipfs = ipfs
    this.frequency = frequency
    this.statsCache = {}
    this.locations = new LocationsPoller(ipfs)

    // Configure the pollers!
    this.pollers = {
      id: makePoller({
        do: () => this.ipfs.id(),
        then: (done, s) => { this._handleId(s, done) }
      }),
      bw: makePoller({
        do: () => this.ipfs.stats.bw(),
        then: (done, s) => { done(s) }
      }),
      repo: makePoller({
        do: () => this.ipfs.stats.repo(),
        then: (done, s) => { done(s) }
      }),
      peers: makePoller({
        do: () => this.ipfs.swarm.peers(),
        then: (done, s) => { this._handlePeers(s, done) }
      })
    }

    // Run the ID poller.
    this.start('id')
  }

  /**
   * Logs the erros using the provided logger function.
   * @private
   * @param {Error} error
   * @return {Void}
   */
  _error (error) {
    if (error.stack) {
      debug(error.stack)
    } else {
      debug(error)
    }
  }

  /**
   * Poll Manager.
   * @param {String} name
   * @param {Function} fn
   * @return {Void}
   */
  _pollManager (name) {
    if (this.pollers[name].running) {
      return
    }

    const execute = () => {
      // Stop it if that's what we want.
      if (this.pollers[name].stop) {
        debug('Stopped polling %s stats', name)
        this.pollers[name].stop = false
        this.pollers[name].running = false
        return
      }

      // Run!
      debug('Polling %s stats', name)
      this.pollers[name].running = true
      this.pollers[name].do.call(this)
        .then(this.pollers[name].then.bind(this, done))
        .catch(this._error.bind(this))
    }

    const done = (stats) => {
      if (stats) this.statsCache[name] = stats
      this.emit('change', this.statsCache)

      // Schedule the next polling.
      setTimeout(() => {
        execute()
      }, this.frequency)
    }

    execute()
  }

  /**
   * Handle the raw ID.
   * @private
   * @param {Object} raw - Raw ID
   * @param {Function} done
   * @return {Void}
   */
  _handleId (raw, done) {
    this.statsCache.id = raw
    this.statsCache.id.addresses.sort()
    this.statsCache.id.location = 'Unknown'

    this.locations.get(raw.addresses)
      .then((location) => {
        this.statsCache.id.location = location && location.formatted
        this.emit('change', this.statsCache)
      })
      .catch((e) => { this._error(e) })

    this.stop('id')
    done()
  }

  /**
   * Handle the Peers.
   * @private
   * @param {Object} raw - Raw Peers
   * @param {Function} done
   * @return {Void}
   */
  _handlePeers (raw, done) {
    const peers = []
    raw = raw.sort((a, b) => a.peer.toB58String() > b.peer.toB58String())

    raw.forEach((rawPeer) => {
      let peer = {
        id: rawPeer.peer.toB58String(),
        addr: rawPeer.addr.toString(),
        location: {
          formatted: 'Unknown'
        }
      }

      peer.location = this.locations.getImmediate(peer.addr)
      peers.push(peer)
    })

    done(peers)
  }

  /**
   * Stats
   */
  get stats () {
    return this.statsCache
  }

  /**
   * Stops the poller.
   * @param {Array} opts
   * @return {Void}
   */
  stop (opts = allOptions) {
    if (typeof opts === 'string') {
      opts = [opts]
    }

    opts.forEach(what => {
      if (!this.pollers[what]) {
        throw new Error(`${what} poller does not exist`)
      }

      this.pollers[what].stop = true
    })
  }

  /**
   * Starts the poller.
   * @param {Array} opts
   * @return {Void}
   */
  start (opts = allOptions) {
    if (typeof opts === 'string') {
      opts = [opts]
    }

    opts.forEach(what => {
      if (!this.pollers[what]) {
        throw new Error(`${what} poller does not exist`)
      }

      this._pollManager(what)
    })
  }
}
