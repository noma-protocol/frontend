
// export const commify = (number, decimals = 4) => {
//   if (number === undefined || number === null || isNaN(number)) return "";
//   let numStr = Number(number).toFixed(decimals);
//   let [integerPart, decimalPart] = numStr.split(".");
//   integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
//   return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
// };

import { ethers } from "ethers";

const HEX_SYMBOLS = "0123456789abcdef";

export function unCommify(value) {
  if (value === null || value === undefined) return "0";

  // Remove commas and convert to a number
  let numStr = String(value).replace(/,/g, "");
  
  // Handle scientific notation (e.g., 1.23e-10)
  if (numStr.includes("e") || numStr.includes("E")) {
      numStr = Number(numStr).toFixed(18).replace(/\.?0+$/, ""); // Convert to full decimal format
  }

  return Number(numStr);
}
export function commify(value, decimals = 4) {
  if (value == null || value === "") return "0";

  // Convertir a número
  const num = Number(value);
  if (isNaN(num)) return "0";

  // Decidir si aplicamos decimales
  const applyDecimals = Number.isInteger(decimals) && decimals > 0;

  // Obtener cadena fija o entero truncado
  let numStr = applyDecimals
    ? num.toFixed(decimals)
    : Math.trunc(num).toString();

  // Separar parte entera y decimal
  let [integerPart, decimalPart] = numStr.split(".");

  // Detectar negativo
  const isNegative = integerPart.startsWith("-");
  if (isNegative) integerPart = integerPart.slice(1);

  // Poner comas cada 3 dígitos en la parte entera
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // Reconstruir resultado
  let result = (isNegative ? "-" : "") + integerPart;
  if (applyDecimals && decimalPart) {
    result += "." + decimalPart;
  }

  return result;
}

export function getContractAddress(contracts, networkId, contractName) {
  if (!contracts[networkId]) {
    throw new Error(`Network ID ${networkId} not found.`);
  }
  const address = contracts[networkId][contractName];
  if (!address) {
    throw new Error(`Contract ${contractName} not found on network ${networkId}.`);
  }
  return address;
}

export const commifyDecimals = (number, decimals = 4) => {
  if (number === undefined || number === null || isNaN(number)) return "";
  let numStr = Number(number).toFixed(decimals);
  let [integerPart, decimalPart] = numStr.split(".");
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return Number(decimalPart ? `${integerPart}.${decimalPart}` : integerPart).toFixed(decimals);
};

export const commifyPatched = (number) => {
  if (number === undefined) return "";
    let numStr = number.toString();
    let [integerPart, decimalPart] = numStr.split(".");
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");     
    decimalPart = String(decimalPart).indexOf(",") > -1 ? decimalPart.split(",")[0] : decimalPart;
    let retValue = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
    return Number(retValue).toFixed(6);
  }

// Generate a bytes32 string
export function generateBytes32String(text) {
  if (text.length > 32) {
      throw new Error("String exceeds 32 bytes");
  }

  // Convert the string to a UTF-8 encoded bytes array and pad it to 32 bytes
  const hex = Buffer.from(text, "utf8").toString("hex");
  return "0x" + hex.padEnd(64, "0"); // Ensure it's padded to 64 hex characters (32 bytes)
}

export function tickToPrice(tick, token0Decimals=18, token1Decimals=18){
	let price0 = (1.0001**Number(tick))/(10**(token1Decimals-token0Decimals));
	let price1 = 1 / price0;
	return [price0.toFixed(token1Decimals), price1.toFixed(token0Decimals)]
}

export function getDaysLeft(expiryTimestamp) {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const secondsLeft = expiryTimestamp - now;
  return secondsLeft > 0 ? Math.floor(secondsLeft / 86400) : 0; // Convert seconds to days
}

export function calculateExpiryDate(days = 30) {
  const today = new Date();
  today.setDate(today.getDate() + days);
  
  // Format the date to a readable format (e.g., "March 26")
  const options = { month: 'long', day: 'numeric' };
  return today.toLocaleDateString('en-US', options);
}

/**
 * Calculate loan fees based on a daily rate of 0.057%
 *
 * @param {number} borrowAmount  – principal amount borrowed
 * @param {number} duration      – loan duration in seconds
 * @returns {number} fees        – total fees owed
 */
export function calculateLoanFees(borrowAmount, duration) {
  const SECONDS_IN_DAY = 86400;
  // daily rate = 0.057% → 57 / 100_000
  const daysElapsed = Math.floor(duration / SECONDS_IN_DAY);
  return (borrowAmount * 57 * daysElapsed) / 100_000;
}

export function formatNumberPrecise(value, sigDigits = 4) {
  let num = typeof value === 'number'
    ? value
    : parseFloat(value);
  if (isNaN(num)) return '0';

  const sign = num < 0 ? '-' : '';
  num = Math.abs(num);

  const suffixes = ['', 'K', 'M', 'B', 'T'];
  let idx = 0;
  while (num >= 1000 && idx < suffixes.length - 1) {
    num /= 1000;
    idx++;
  }

  // Figure out how many decimals we need to hit sigDigits in total
  const intDigits = Math.floor(num).toString().length;
  const decPlaces = Math.max(sigDigits - intDigits, 0);

  // Format and trim trailing zeros
  const str = num
    .toFixed(decPlaces)
    .replace(/\.?0+$/, '');

  return sign + str + suffixes[idx];
}

/**
 * @param {string} userAddress  An Ethereum address (e.g. "0xAbC123...").
 * @returns {string}            A 32‐byte hex string: first 8 bytes are ASCII hex chars, rest zero.
 *
 * This matches Solidity's:
 *   bytes32 hash = keccak256(abi.encodePacked(user));
 *   // take hash[0..3], convert each byte to two ASCII hex chars ⇒ 8 ASCII bytes
 *   // pack into bytes32 (left‐aligned), leaving remaining 24 bytes = 0x00
 */
export function generateReferralCode(userAddress) {
  console.debug("generateReferralCode", userAddress);
  if (userAddress == "" || typeof userAddress !== "string" ) return;

  // 1) Compute keccak256 of the address (packed)
  //    ethers.utils.keccak256 expects a bytes‐like value, so we can pass the address directly.
  const hash = ethers.utils.keccak256(userAddress);
  // `hash` is a 0x‐prefixed 64‐hex‐char string (32 bytes)

  // 2) Remove "0x", so we have 64 hex characters
  const hexHash = hash.slice(2); // e.g. "3af1...<total 64 chars>"

  // 3) Build an 8‐character ASCII string by converting the first 4 bytes of hexHash to two hex‐digits each
  let ascii8 = "";
  for (let i = 0; i < 4; i++) {
    // Extract the i‐th byte (two hex chars) from hexHash
    const twoHex = hexHash.slice(i * 2, i * 2 + 2);
    const byteVal = parseInt(twoHex, 16); // 0 .. 255

    // High nibble → one hex character
    const highNibble = (byteVal >> 4) & 0x0f;      // 0 .. 15
    // Low nibble → one hex character
    const lowNibble = byteVal & 0x0f;              // 0 .. 15

    // Append their ASCII‐hex representation
    ascii8 += HEX_SYMBOLS[highNibble]; // e.g. '3'
    ascii8 += HEX_SYMBOLS[lowNibble];  // e.g. 'a'
  }
  // Now ascii8 is exactly 8 characters long (each '0'..'9','a'..'f')

  // 4) Convert that ASCII string into its byte‐level hex form:
  //    e.g. ascii8 = "3af108c3" → asciiHex = "33 61 66 31 30 38 63 33"
  let asciiHex = "";
  for (let i = 0; i < ascii8.length; i++) {
    // Get ASCII code of that character (e.g. '3' → 0x33, 'a' → 0x61)
    const code = ascii8.charCodeAt(i);
    // Convert to two‐digit hex
    asciiHex += code.toString(16).padStart(2, "0");
  }
  // asciiHex is now 16 hex chars long (8 bytes)

  // 5) Pad the remaining bytes (32 total minus 8 used) with zeros
  const zeroPad = "0".repeat(64 - asciiHex.length); // 64 total hex chars for 32 bytes
  const fullHex = "0x" + asciiHex + zeroPad;

  return fullHex;
}
