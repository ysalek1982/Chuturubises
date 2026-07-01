const BOLIVIA_TIME_ZONE = "America/La_Paz";

function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime());
}

export function formatBoliviaDateTime(value: string) {
  const date = new Date(value);
  if (!isValidDate(date)) return "Fecha por definir";

  return `${new Intl.DateTimeFormat("es-BO", {
    timeZone: BOLIVIA_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date)} (UTC-4 Bolivia)`;
}

export function toBoliviaDateTimeInput(value: string) {
  const date = new Date(value);
  if (!isValidDate(date)) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BOLIVIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function fromBoliviaDateTimeInput(value: string) {
  if (!value) return "";
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return new Date(`${withSeconds}-04:00`).toISOString();
}
