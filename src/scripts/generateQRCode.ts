#!/usr/bin/env node

import QRCode from 'qrcode';
import * as path from 'path';

const CODE_TO_ENCODE = 'FDEG13687326';

async function generateQRCode(): Promise<void> {
  try {
    console.log('Generating QR Code for:', CODE_TO_ENCODE);
    console.log('-----------------------------------');

    // Generate QR Code as ASCII art for terminal display
    const qrCodeString = await QRCode.toString(CODE_TO_ENCODE, {
      type: 'terminal',
      width: 200,
      margin: 2
    });

    console.log(qrCodeString);

    // Also generate as PNG file
    const outputPath = path.join(__dirname, '..', 'generated-qrcode.png');
    await QRCode.toFile(outputPath, CODE_TO_ENCODE, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    console.log('\n-----------------------------------');
    console.log('QR Code also saved as:', outputPath);
    console.log('Code encoded:', CODE_TO_ENCODE);
    console.log('-----------------------------------');

  } catch (error) {
    console.error('Error generating QR Code:', error);
    process.exit(1);
  }
}

// Run the function
generateQRCode();