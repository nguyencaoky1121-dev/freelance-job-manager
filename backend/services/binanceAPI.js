const axios = require('axios');
const crypto = require('crypto');

const BINANCE_API_BASE = 'https://api.binance.com/api';

class BinanceAPI {
  constructor() {
    this.apiKey = process.env.BINANCE_API_KEY || '';
    this.secretKey = process.env.BINANCE_SECRET_KEY || '';
    this.uid = process.env.BINANCE_UID || '';
    this.walletAddress = process.env.BINANCE_WALLET_ADDRESS || '';
  }

  /**
   * Generate signature for Binance API
   */
  generateSignature(queryString) {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Get account balance
   */
  async getBalance() {
    try {
      if (!this.apiKey || !this.secretKey) {
        return {
          success: false,
          error: 'Binance API credentials not configured',
        };
      }

      const timestamp = Date.now();
      const queryString = `timestamp=${timestamp}`;
      const signature = this.generateSignature(queryString);

      const response = await axios.get(
        `${BINANCE_API_BASE}/v3/account?${queryString}&signature=${signature}`,
        {
          headers: {
            'X-MBX-APIKEY': this.apiKey,
          },
          timeout: 10000,
        }
      );

      if (response.data && response.data.balances) {
        // Filter non-zero balances
        const balances = response.data.balances
          .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
          .map(b => ({
            asset: b.asset,
            free: parseFloat(b.free),
            locked: parseFloat(b.locked),
            total: parseFloat(b.free) + parseFloat(b.locked),
          }));

        return {
          success: true,
          balances,
          uid: this.uid,
        };
      }

      return { success: true, balances: [] };
    } catch (error) {
      // Handle geo-restriction (451) and other API errors gracefully
      if (error.response?.status === 451) {
        console.warn('⚠️ Binance API: Geographic restriction (451) - IP may be blocked');
        return {
          success: false,
          error: 'Binance API: Geographic restriction - service not available in your region',
          status: 451,
        };
      }

      if (error.response?.status === 403) {
        console.warn('⚠️ Binance API: Access forbidden (403) - check API key permissions');
        return {
          success: false,
          error: 'Binance API: Access forbidden - check API key and permissions',
          status: 403,
        };
      }

      console.error('❌ Error getting Binance balance:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get deposit address for a coin
   */
  async getDepositAddress(coin = 'USDT') {
    try {
      if (!this.apiKey || !this.secretKey) {
        return {
          success: false,
          error: 'Binance API credentials not configured',
        };
      }

      const timestamp = Date.now();
      const queryString = `coin=${coin}&timestamp=${timestamp}`;
      const signature = this.generateSignature(queryString);

      const response = await axios.get(
        `${BINANCE_API_BASE}/v1/capital/deposit/address?${queryString}&signature=${signature}`,
        {
          headers: {
            'X-MBX-APIKEY': this.apiKey,
          },
          timeout: 10000,
        }
      );

      if (response.data) {
        return {
          success: true,
          coin: response.data.coin,
          address: response.data.address,
          tag: response.data.tag || '',
          url: response.data.url || '',
        };
      }

      return { success: false, error: 'No address found' };
    } catch (error) {
      // Handle geo-restriction (451) and other API errors gracefully
      if (error.response?.status === 451) {
        console.warn('⚠️ Binance API: Geographic restriction (451) - IP may be blocked');
        return {
          success: false,
          error: 'Binance API: Geographic restriction - service not available in your region',
          status: 451,
        };
      }

      if (error.response?.status === 403) {
        console.warn('⚠️ Binance API: Access forbidden (403) - check API key permissions');
        return {
          success: false,
          error: 'Binance API: Access forbidden - check API key and permissions',
          status: 403,
        };
      }

      console.error(`❌ Error getting ${coin} deposit address:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get deposit history
   */
  async getDepositHistory(coin = 'USDT', limit = 50) {
    try {
      if (!this.apiKey || !this.secretKey) {
        return {
          success: false,
          error: 'Binance API credentials not configured',
        };
      }

      const timestamp = Date.now();
      const queryString = `coin=${coin}&limit=${limit}&timestamp=${timestamp}`;
      const signature = this.generateSignature(queryString);

      const response = await axios.get(
        `${BINANCE_API_BASE}/v1/capital/deposit/hisrec?${queryString}&signature=${signature}`,
        {
          headers: {
            'X-MBX-APIKEY': this.apiKey,
          },
          timeout: 10000,
        }
      );

      if (Array.isArray(response.data)) {
        const deposits = response.data.map(d => ({
          id: d.id,
          coin: d.coin,
          amount: parseFloat(d.amount),
          address: d.address,
          addressTag: d.addressTag || '',
          txId: d.txId,
          insertTime: new Date(d.insertTime),
          status: d.status, // 0: pending, 1: success
          statusText: d.status === 1 ? 'Thành công' : 'Chờ xử lý',
          confirmTimes: d.confirmTimes,
          unlockConfirm: d.unlockConfirm,
          network: d.network,
        }));

        return {
          success: true,
          deposits,
          total: deposits.length,
        };
      }

      return { success: true, deposits: [] };
    } catch (error) {
      if (error.response?.status === 451) {
        console.warn(`⚠️ Binance API: Geographic restriction (451) for ${coin} deposit history`);
        return {
          success: false,
          error: 'Binance API: Geographic restriction - service not available in your region',
          status: 451,
          deposits: [],
        };
      }

      console.error(`❌ Error getting ${coin} deposit history:`, error.message);
      return {
        success: false,
        error: error.message,
        deposits: [],
      };
    }
  }

  /**
   * Get wallet address info
   */
  getWalletInfo() {
    return {
      address: this.walletAddress,
      network: process.env.BINANCE_NETWORK || 'TRC20',
      uid: this.uid,
      coin: 'USDT',
    };
  }

  /**
   * Convert crypto to VND (using Binance price)
   */
  async convertToVND(amount, coin = 'USDT') {
    try {
      // Get USDT price in VND (via USDT/BUSD pair)
      const response = await axios.get(
        `${BINANCE_API_BASE}/v3/ticker/price?symbol=USDTVND`,
        { timeout: 5000 }
      );

      if (response.data && response.data.price) {
        const price = parseFloat(response.data.price);
        const vndAmount = amount * price;
        return {
          success: true,
          amount,
          coin,
          price,
          vndAmount: Math.round(vndAmount),
        };
      }

      // Fallback: use approximate rate
      const approximateRate = 24000; // ~24,000 VND per USDT
      return {
        success: true,
        amount,
        coin,
        price: approximateRate,
        vndAmount: Math.round(amount * approximateRate),
        note: 'Approximate rate (API unavailable)',
      };
    } catch (error) {
      console.error('❌ Error converting to VND:', error.message);
      // Return approximate conversion
      const approximateRate = 24000;
      return {
        success: true,
        amount,
        coin,
        price: approximateRate,
        vndAmount: Math.round(amount * approximateRate),
        note: 'Approximate rate (fallback)',
      };
    }
  }
}

module.exports = { BinanceAPI };
