/* eslint-env mocha */
'use strict'

const DaemonFactory = require('ipfsd-ctl')
const df = DaemonFactory.create()
const expect = require('chai').expect
const StatsPoller = require('../src/index')

describe('stats poller', () => {
  let ipfsd
  let poller

  before(function (done) {
    // CI takes longer to instantiate the daemon,
    // so we need to increase the timeout for the
    // before step
    this.timeout(60 * 1000)

    df.spawn((err, node) => {
      expect(err).to.be.null
      ipfsd = node

      poller = new StatsPoller(node.api, 500)
      done()
    })
  })

  after(function (done) {
    this.timeout(15 * 1000)
    ipfsd.stop(done)
  })

  it('id stats', function (done) {
    this.timeout(5000)

    const assert = () => {
      try {
        expect(poller.stats).to.have.property('id')
        done()
      } catch (e) {}
    }

    setTimeout(() => { assert() }, 500)
  })

  it('peer stats', function (done) {
    this.timeout(5000)

    poller.start('peers')

    const assert = () => {
      try {
        expect(poller.stats).to.have.property('peers')
        expect(poller.stats.peers).to.be.an('array')
        poller.stop('peers')
        done()
      } catch (e) {}
    }

    setTimeout(() => { assert() }, 500)
  })

  it('bandwidth stats', function (done) {
    this.timeout(5000)

    poller.start('bw')

    const assert = () => {
      try {
        expect(poller.stats).to.have.property('bw')
        poller.stop('bw')
        done()
      } catch (e) {}
    }

    setTimeout(() => { assert() }, 500)
  })

  it('repo stats', function (done) {
    this.timeout(5000)

    poller.start('repo')

    const assert = () => {
      try {
        expect(poller.stats).to.have.property('repo')
        poller.stop('repo')
        done()
      } catch (e) {}
    }

    setTimeout(() => { assert() }, 500)
  })
})
