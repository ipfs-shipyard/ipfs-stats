const lookupPretty = require('ipfs-geoip').lookupPretty
const debug = require('debug')('locations-poller')

module.exports = class LocationsPoller {
  /**
   * Locations Poller constructor.
   * @param {IpfsApi} ipfs
   */
  constructor (ipfs) {
    if (!ipfs) {
      throw new Error('ipfs argument missing')
    }

    this.ipfs = ipfs
    this.cache = {}
    this.pending = []
    this.fetching = null

    // Start the engines.
    this.poller()
  }

  /**
   * Gets the location for an address.
   * @param {String} addr
   * @return {Object}
   */
  get (addr) {
    // If in cache, resolve it.
    if (this.cache[addr]) {
      return this.cache[addr]
    }

    // Otherwise, look for it.
    this.lookup(addr)
    return {
      formatted: 'Unknown'
    }
  }

  /**
   * Looks up for an address
   * @private
   * @param {String} addr
   */
  lookup (addr) {
    if (addr !== this.fetching && !this.pending.includes(addr)) {
      this.pending.push(addr)
    }
  }

  /**
   * The internal poller function.
   * @private
   */
  poller () {
    const next = () => {
      this.fetching = null
      setTimeout(this.poller.bind(this), 50)
    }

    // If there is no pending address to be fetched,
    // stop the poller.
    if (this.pending.length === 0) {
      next()
      return
    }

    this.fetching = this.pending.shift()

    debug('Fetching location for %s', this.fetching)

    lookupPretty(this.ipfs, [this.fetching], (err, result) => {
      if (err) {
        next()
        return debug (err)
      }

      this.cache[this.fetching] = result
      next()
    })
  }
}
