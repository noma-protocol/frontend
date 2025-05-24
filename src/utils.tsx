
// export const commify = (number, decimals = 4) => {
//   if (number === undefined || number === null || isNaN(number)) return "";
//   let numStr = Number(number).toFixed(decimals);
//   let [integerPart, decimalPart] = numStr.split(".");
//   integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
//   return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
// };

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
