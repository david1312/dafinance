type AmountParts = {
  whole: string;
  fraction: string | null;
};

function cleanAmount(raw: string) {
  return raw.trim().replace(/[^\d.,]/g, "");
}

function groupDigits(whole: string) {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseParts(raw: string): AmountParts {
  const value = cleanAmount(raw);
  if (!value || !/\d|[.,]/.test(value)) return { whole: "", fraction: null };
  if (value === "." || value === ",") return { whole: "0", fraction: "" };

  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");
  let decimalIndex = -1;
  let thousands = "";

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      decimalIndex = lastComma;
      thousands = ".";
    } else {
      decimalIndex = lastDot;
      thousands = ",";
    }
  } else if (lastComma !== -1) {
    const groups = value.split(",");
    const lastLength = groups[groups.length - 1].length;
    const middleGroupsFit = groups.slice(1, -1).every((group) => group.length === 3);
    const completeThousands = lastLength === 3 && middleGroupsFit;
    const partialThousands =
      groups.length === 2 &&
      groups[0].length > 0 &&
      groups[0].length <= 3 &&
      lastLength > 0 &&
      lastLength < 3;

    if (completeThousands || partialThousands || lastLength > 3) {
      thousands = ",";
    } else {
      decimalIndex = lastComma;
      thousands = ",";
    }
  } else if (lastDot !== -1) {
    const groups = value.split(".");
    const lastLength = groups[groups.length - 1].length;
    const middleGroupsFit = groups.slice(1, -1).every((group) => group.length === 3);
    if (groups.length > 2 && middleGroupsFit && lastLength <= 2) {
      decimalIndex = lastDot;
      thousands = ".";
    } else if (groups.length > 2 && groups.slice(1).every((group) => group.length === 3)) {
      thousands = ".";
    } else {
      decimalIndex = lastDot;
    }
  }

  let whole = "";
  let fraction: string | null = null;

  if (decimalIndex === -1) {
    whole = thousands ? value.split(thousands).join("") : value;
  } else {
    const left = value.slice(0, decimalIndex);
    const right = value.slice(decimalIndex + 1);
    whole = thousands ? left.split(thousands).join("") : left;
    fraction = right.replace(/\D/g, "").slice(0, 2);
  }

  whole = whole.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  if (!whole && fraction !== null) whole = "0";
  if (!whole) return { whole: "", fraction: null };

  return { whole, fraction };
}

export function formatAmountTyping(value: string) {
  const { whole, fraction } = parseParts(value);
  if (!whole) return "";
  const grouped = groupDigits(whole);
  if (fraction === null) return grouped;
  return `${grouped}.${fraction}`;
}

export function formatAmountFixed(value: string | number) {
  const amount = typeof value === "number" ? value : parseAmount(value);
  if (amount === null || !Number.isFinite(amount)) return "";

  const negative = amount < 0;
  const [whole, fraction] = Math.abs(amount).toFixed(2).split(".");
  const grouped = `${groupDigits(whole.replace(/^0+(?=\d)/, "") || "0")}.${fraction}`;
  return negative ? `-${grouped}` : grouped;
}

export function parseAmount(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? roundCents(value) : null;
  }

  const formatted = formatAmountTyping(String(value ?? ""));
  if (!formatted) return null;
  const amount = Number(formatted.replaceAll(",", ""));
  return Number.isFinite(amount) ? roundCents(amount) : null;
}

export function amountCursor(raw: string, cursor: number, formatted: string) {
  const cleaned = cleanAmount(raw);
  const cleanedCursor = cleanAmount(raw.slice(0, cursor)).length;
  const { fraction } = parseParts(raw);
  const decimalInCleaned = fraction === null ? -1 : cleaned.search(/[.,](?=[^.,]*$)/);
  const passedDecimal = decimalInCleaned !== -1 && cleanedCursor > decimalInCleaned;

  if (!passedDecimal) {
    const digits = cleaned.slice(0, cleanedCursor).replace(/\D/g, "").length;
    let seen = 0;
    for (let index = 0; index < formatted.length; index += 1) {
      const character = formatted[index];
      if (character === ".") return index;
      if (character >= "0" && character <= "9") {
        seen += 1;
        if (seen === digits) return index + 1;
      }
    }
    const dot = formatted.indexOf(".");
    return dot === -1 ? formatted.length : dot;
  }

  const fractionDigits = cleaned
    .slice(decimalInCleaned + 1, cleanedCursor)
    .replace(/\D/g, "").length;
  const dot = formatted.indexOf(".");
  if (dot === -1) return formatted.length;
  return Math.min(formatted.length, dot + 1 + fractionDigits);
}

function roundCents(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
