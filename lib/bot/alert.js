const PN = require('google-libphonenumber');
const cloneDeep = require('lodash.clonedeep');
const shortid = require('shortid');

const { getPriceForFlight } = require('./get-price.js');

class Alert {

  constructor (data) {
    this.data = typeof data === 'string' ? JSON.parse(data) : cloneDeep(data);
    this.data.id = this.data.id || shortid.generate();
    this.data.from = this.data.from.toLocaleUpperCase();
    this.data.to = this.data.to.toLocaleUpperCase();
    this.data.number = this.data.number.split(',').map(n => n.trim()).filter(n => n.length).join(',');
    this.data.price = parseInt(this.data.price, 10);
    this.data.phone = this.data.phone.split('').filter(d => /\d/.test(d)).join('');
    this.data.priceHistory = Alert.compactPriceHistory(this.data.priceHistory || []);
  }

  get id () { return this.data.id; }
  get date () { return new Date(this.data.date); }
  get from () { return this.data.from; }
  get to () { return this.data.to; }
  get number () { return this.data.number; }
  get price () { return this.data.price; }
  get phone () { return this.data.phone; }
  get priceHistory () { return this.data.priceHistory; }

  get formattedDate () {
    return this.date.toLocaleDateString('en-US', { timeZone: 'UTC' });
  }

  get formattedNumber () {
    return '#' + this.number.split(',').join(', ');
  }

  get formattedPhone () {
    const phoneUtil = PN.PhoneNumberUtil.getInstance();
    const number = phoneUtil.parse(this.data.phone, 'US');
    return phoneUtil.format(number, PN.INTERNATIONAL);
  }

  get latestPrice () {
    const ph = this.data.priceHistory;
    return ph.length ? (ph[ph.length - 1]).price : Infinity;
  }

  get priceHasDropped () {
    return this.latestPrice < this.price;
  }

  get signature () {
    return [ this.formattedDate, this.from, this.to, this.number ].join('|');
  }

  toJSON () {
    return JSON.stringify(this.data);
  }

  key (namespace = 'alert') {
    return `${namespace}.${this.id}`;
  }

  async getLatestPrice () {
    const time = Date.now();
    const price = await getPriceForFlight(this);
    const entry = { time, price };
    console.log('Got price:', this.signature, entry);
    if (price < Infinity) this.priceHistory.push(entry);
    return price;
  }

  static compactPriceHistory (history) {
    const compact = [];

    for (let i = 0; i < history.length; i++) {
      const p = i - 1;
      const n = i + 1;

      const prevDifferent = !history[p] || history[i].price !== history[p].price;
      const nextDifferent = !history[n] || history[i].price !== history[n].price;

      if (prevDifferent || nextDifferent) compact.push(history[i]);
    }

    return compact;
  }

}

module.exports = Alert;
