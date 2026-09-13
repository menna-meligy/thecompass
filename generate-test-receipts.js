#!/usr/bin/env node

/**
 * Generate test receipt images that will pass OCR verification.
 * Creates PNG images with text that Tesseract can read.
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const today = new Date('2026-09-12');
const dateStr = `${String(today.getDate()).padStart(2, '0')} Sep 2026`;

// Receipt 1: InstaPay 500 EGP (should PASS)
function createInstapayReceipt500() {
  const canvas = createCanvas(600, 400);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 600, 400);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('InstaPay Receipt', 300, 50);

  ctx.font = '18px Arial';
  ctx.fillText('Transfer Successful', 300, 100);

  ctx.font = 'bold 32px Arial';
  ctx.fillText('500 EGP', 300, 150);

  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('To InstaPay:', 50, 200);
  ctx.fillText('MOHAMED TAREK', 50, 225);
  ctx.fillText('01223810409', 50, 250);

  ctx.fillText('Reference:', 50, 290);
  ctx.fillText('550066110009', 50, 315);

  ctx.fillText('Date:', 50, 355);
  ctx.fillText(dateStr, 50, 380);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('/tmp/receipt-instapay-500.png', buffer);
  console.log('✅ Created: receipt-instapay-500.png (500 EGP, TODAY)');
}

// Receipt 2: Vodafone Cash 500 EGP (should PASS)
function createVodafoneReceipt500() {
  const canvas = createCanvas(600, 400);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, 600, 50);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Vodafone Cash', 300, 35);

  ctx.fillStyle = '#000000';
  ctx.font = '18px Arial';
  ctx.fillText('Transfer Successful', 300, 100);

  ctx.font = 'bold 36px Arial';
  ctx.fillText('EGP 500', 300, 160);

  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('To:', 50, 210);
  ctx.fillText('01223810409', 50, 235);

  ctx.fillText('Transaction ID:', 50, 280);
  ctx.fillText('550066110010', 50, 305);

  ctx.fillText('Date:', 50, 350);
  ctx.fillText(dateStr, 50, 375);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('/tmp/receipt-vodafone-500.png', buffer);
  console.log('✅ Created: receipt-vodafone-500.png (500 EGP, TODAY)');
}

// Receipt 3: InstaPay 300 EGP (should FAIL - amount mismatch)
function createInstapayReceipt300() {
  const canvas = createCanvas(600, 400);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 600, 400);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('InstaPay Receipt', 300, 50);

  ctx.font = '18px Arial';
  ctx.fillText('Transfer Successful', 300, 100);

  ctx.font = 'bold 32px Arial';
  ctx.fillText('300 EGP', 300, 150);

  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('To InstaPay:', 50, 200);
  ctx.fillText('MOHAMED TAREK', 50, 225);
  ctx.fillText('01223810409', 50, 250);

  ctx.fillText('Reference:', 50, 290);
  ctx.fillText('550066110011', 50, 315);

  ctx.fillText('Date:', 50, 355);
  ctx.fillText(dateStr, 50, 380);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('/tmp/receipt-instapay-300.png', buffer);
  console.log('⚠️  Created: receipt-instapay-300.png (300 EGP, should FAIL)');
}

try {
  createInstapayReceipt500();
  createVodafoneReceipt500();
  createInstapayReceipt300();
  console.log('\n✅ All test receipts generated in /tmp/');
  console.log('Use these to test the verification workflow');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
