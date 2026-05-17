const express = require('express');
const { BinanceAPI } = require('../services/binanceAPI');

const router = express.Router();
const binance = new BinanceAPI();

/**
 * GET /api/crypto/wallet - Get wallet info (address, network, QR data)
 */
router.get('/wallet', (req, res) => {
  try {
    const walletInfo = binance.getWalletInfo();

    res.json({
      success: true,
      wallet: {
        ...walletInfo,
        qrData: walletInfo.address,
        paymentInstructions: {
          vi: `Gửi USDT qua mạng ${walletInfo.network} đến địa chỉ: ${walletInfo.address}`,
          en: `Send USDT via ${walletInfo.network} network to: ${walletInfo.address}`,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/crypto/balance - Get current crypto balance
 */
router.get('/balance', async (req, res) => {
  try {
    const result = await binance.getBalance();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/crypto/address/:coin - Get deposit address for a coin
 */
router.get('/address/:coin', async (req, res) => {
  try {
    const { coin } = req.params;
    const result = await binance.getDepositAddress(coin.toUpperCase());
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/crypto/deposits - Get deposit history
 */
router.get('/deposits', async (req, res) => {
  try {
    const coin = req.query.coin || 'USDT';
    const limit = parseInt(req.query.limit) || 50;
    const result = await binance.getDepositHistory(coin, limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/crypto/convert/:amount - Convert crypto amount to VND
 */
router.get('/convert/:amount', async (req, res) => {
  try {
    const amount = parseFloat(req.params.amount);
    const coin = req.query.coin || 'USDT';

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Must be a positive number.',
      });
    }

    const result = await binance.convertToVND(amount, coin);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/crypto/summary - Get crypto payment summary
 */
router.get('/summary', async (req, res) => {
  try {
    const balance = await binance.getBalance();
    const deposits = await binance.getDepositHistory('USDT', 10);
    const walletInfo = binance.getWalletInfo();

    const totalReceived = deposits.success
      ? deposits.deposits.reduce((sum, d) => sum + d.amount, 0)
      : 0;

    const usdtBalance = balance.success
      ? balance.balances.find(b => b.asset === 'USDT')
      : null;

    const conversion = totalReceived > 0
      ? await binance.convertToVND(totalReceived)
      : { vndAmount: 0, price: 24000 };

    res.json({
      success: true,
      summary: {
        wallet: walletInfo,
        usdtBalance: usdtBalance ? usdtBalance.total : 0,
        totalReceived,
        totalReceivedVND: conversion.vndAmount || 0,
        exchangeRate: conversion.price || 24000,
        recentDeposits: deposits.success ? deposits.deposits.slice(0, 5) : [],
        lastCheck: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
