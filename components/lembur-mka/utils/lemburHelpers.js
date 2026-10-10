import {
  MONTHS,
  NATIONAL_HOLIDAYS_2026,
  RETENTION_DAYS,
} from "./lemburConstants";

export function pad(value) {
  return String(value).padStart(2, "0");
}
export function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function formatDateLong(value) {
  const date = new Date(`${value}T00:00:00`);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
export function formatDateShort(value) {
  const date = new Date(`${value}T00:00:00`);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}
export function getDefaultStartTime(value) {
  const date = new Date(`${value}T00:00:00`);
  const day = date.getDay();
  if (day === 0 || day === 6 || NATIONAL_HOLIDAYS_2026[value]) return "07:30";
  return "16:30";
}
export function getRetentionLimit() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() - RETENTION_DAYS);
  return dateKey(limit);
}
export function getCalendarCells(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay.getDay(); i += 1) cells.push(null);
  for (let day = 1; day <= lastDate; day += 1)
    cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
