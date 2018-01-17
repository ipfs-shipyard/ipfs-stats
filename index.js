const EventEmitter = require('events').EventEmitter
const lookupPretty = require('ipfs-geoip').lookupPretty
const debug = require('debug')('stats-poller')
const LocationsPoller = require('./locations')

const allOptions = ['peers', 'node']

/**
 * It's a Stats Poller.
 * @extends EventEmitter
 */
module.exports = class StatsPoller extends EventEmitter {
  /**
   * Stats Poller constructor.
   * @param {IpfsApi} ipfs
   */
  constructor (ipfs, frequency = 1000) {
    super()

    // Start the variables!
    this.ipfs = ipfs
    this.frequency = frequency
    this.statsCache = {}
    this.locations = new LocationsPoller(ipfs)

    this.poll = {
      peers: false,
      node: false
    }

    // Start the engines!
    this._pollNodeStats()
    this._pollPeerStats()

    debug('Fetching self ID')
    this.ipfs.id()
      .then((id) => { this._handleId(id) })
      .catch(this._error.bind(this))
  }

  /**
   * Logs the erros using the provided logger function.
   * @private
   * @param {Error} error
   */
  _error (error) {
    this.emit('error', error)
    if (error.stack) {
      debug(error.stack)
    } else {
      debug(error)
    }
  }

  /**
   * Poll node stats.
   * @private
   * @return {Void}
   */
  _pollNodeStats () {
    const next = () => {
      setTimeout(() => { this._pollNodeStats() }, this.frequency)
    }

    if (!this.poll.node) {
      return next()
    }

    debug('Polling node stats')

    Promise.all([
      this.ipfs.stats.bw(),
      this.ipfs.repo.stat()
    ]).then(([bw, repo]) => {
      this.statsCache.bw = bw
      this.statsCache.repo = repo
      this.emit('change', this.statsCache)

      next()
    }).catch(this._error.bind(this))
  }

  /**
   * Poll peers.
   * @private
   * @return {Void}
   */
  _pollPeerStats () {
    const next = () => {
      setTimeout(() => { this._pollPeerStats() }, this.frequency)
    }

    if (!this.poll.peers) {
      return next()
    }

    debug('Polling peer stats')

    this.ipfs.swarm.peers().then((peers) => {
      this._handlePeers(peers)
      next()
    }).catch(this._error.bind(this))
  }

  /**
   * Handle the Peers.
   * @private
   * @param {Object} raw - Raw Peers
   */
  _handlePeers (raw) {
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

      peer.location = this.locations.get(peer.addr)
      peers.push(peer)
    })

    this.statsCache.peers = peers
    this.emit('change', this.statsCache)
  }

  /**
   * Handle the raw ID.
   * @private
   * @param {Object} raw - Raw ID
   */
  _handleId (raw) {
    this.statsCache.node = raw
    this.statsCache.node.addresses.sort()
    this.statsCache.node.location = 'Unknown'

    lookupPretty(this.ipfs, raw.addresses, (err, location) => {
      if (err) { return }

      this.statsCache.node.location = location && location.formatted
      this.emit('change', this.statsCache)
    })

    this.emit('change', this.statsCache)
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
    opts.forEach(what => { this.poll[what] = false })
  }

  /**
   * Starts the poller.
   * @param {Array} opts
   * @return {Void}
   */
  start (opts = allOptions) {
    opts.forEach(what => { this.poll[what] = true })
  }
}
