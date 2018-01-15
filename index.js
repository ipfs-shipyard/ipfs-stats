const EventEmitter = require('events').EventEmitter
const lookupPretty = require('ipfs-geoip').lookupPretty

const allOptions = ['peers', 'node']

/**
 * It's a Stats Poller.
 * @extends EventEmitter
 */
module.exports = class StatsPoller extends EventEmitter {
  /**
   * Stats Poller constructor.
   * @param {IpfsApi} ipfs
   * @param {Debugger} debug
   */
  constructor (ipfs, frequency = 3000, logger) {
    super()

    // Start the variables!
    this.ipfs = ipfs
    this.frequency = frequency
    this.logger = logger
    this.statsCache = {}
    this.locationsCache = {}
    this.poll = {
      peers: false,
      node: false
    }

    // Start the engines!
    this._pollNodeStats()
    this._pollPeerStats()
  }

  _error (error) {
    if (error.stack) {
      this.logger(error.stack)
    } else {
      this.logger(error)
    }
  }

  /**
   * Poll node stats.
   * @return {Void}
   */
  _pollNodeStats () {
    const next = () => {
      setTimeout(() => { this._pollNodeStats() }, this.frequency)
    }

    if (!this.poll.node) {
      return next()
    }

    Promise.all([
      this.ipfs.id(),
      this.ipfs.stats.bw(),
      this.ipfs.repo.stat()
    ]).then(([id, bw, repo]) => {
      this._handleId(id)
      this.statsCache.bw = bw
      this.statsCache.repo = repo
      this.emit('change', this.statsCache)

      next()
    }).catch(this._error.bind(this))
  }

  /**
   * Poll peers.
   * @return {Void}
   */
  _pollPeerStats () {
    const next = () => {
      setTimeout(() => { this._pollPeerStats() }, this.frequency)
    }

    if (!this.poll.peers) {
      return next()
    }

    this.ipfs.swarm.peers().then((peers) => {
      this._handlePeers(peers)
      next()
    }).catch(this._error.bind(this))
  }

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

      if (!this.locationsCache[peer.id]) {
        lookupPretty(this.ipfs, [peer.addr], (err, result) => {
          if (err) { return }
          this.locationsCache[peer.id] = result
        })
      } else {
        peer.location = this.locationsCache[peer.id]
      }

      peers.push(peer)
    })

    this.statsCache.peers = peers
    this.emit('change', this.statsCache)
  }

  _handleId (raw) {
    this.statsCache.node = raw
    this.statsCache.node.location = 'Unknown'

    lookupPretty(this.ipfs, raw.addresses, (err, location) => {
      if (err) { return }

      this.statsCache.node.location = location && location.formatted
      this.emit('change', this.statsCache)
    })
  }

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
