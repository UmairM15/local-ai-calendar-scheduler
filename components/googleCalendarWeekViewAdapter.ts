// this file contains all google calendar DOM (document object model) knowledge
    // the browser's representation of a webpage, converting HTML into a tree of JS objects

import type { DraftEvent } from '@/domain/draftSchedule';

const MINUTES_PER_DAY = 24 * 60;
const DAY_COLUMN_SELECTOR =
  '[role="gridcell"][data-column-index][data-datekey]';
const HORIZONTAL_INSET_PX = 3;

export type GoogleCalendarWeekViewElements = {
  weekGrid: HTMLElement;
  timedRow: HTMLElement;
  dayColumns: HTMLElement[];
};

export type DraftEventPlacement = {
  renderKey: string;
  eventId: string;
  title: string;
  startDateTime: string;
  endDateTime: string;
  columnIndex: number | null;
  left: number;
  top: number;
  width: number;
  height: number;
  startMinutes: number;
  endMinutes: number;
  isCompact: boolean;
};

export type DraftPlacementMeasurement = {
  elements: GoogleCalendarWeekViewElements | null;
  placements: DraftEventPlacement[];
  warnings: string[];
};

function getWrittenDate(dateTime: string): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(dateTime);

  if (!dateMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  const isValidDate =
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day;

  return isValidDate ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : null;
}

export function getGoogleCalendarDateKey(
  dateTime: string,
): string | null {
  const writtenDate = getWrittenDate(dateTime);

  if (!writtenDate) {
    return null;
  }

  const [yearText, monthText, dayText] = writtenDate.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const dateKey = (year - 1970) * 512 + month * 32 + day;

  return String(dateKey);
}

export function dateToMinutesSinceMidnight(
  dateTime: string,
): number | null {
  const timeMatch = /^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})/.exec(
    dateTime,
  );

  if (!timeMatch) {
    return null;
  }

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

export function findGoogleCalendarWeekView():
  | GoogleCalendarWeekViewElements
  | null {
  const weekGrid = document.querySelector<HTMLElement>(
    '[role="grid"][data-enable-grid-navigation="true"]',
  );

  if (!weekGrid) {
    return null;
  }

  const ownedIds =
    weekGrid
      .getAttribute('aria-owns')
      ?.trim()
      .split(/\s+/)
      .filter(Boolean) ?? [];

  const timedRow = ownedIds
    .map((id) => document.getElementById(id))
    .find((element): element is HTMLElement =>
      Boolean(element?.querySelector(DAY_COLUMN_SELECTOR)),
    );

  if (!timedRow) {
    return null;
  }

  const dayColumns = Array.from(
    timedRow.querySelectorAll<HTMLElement>(DAY_COLUMN_SELECTOR),
  ).sort((firstColumn, secondColumn) => {
    const firstIndex = Number(firstColumn.dataset.columnIndex);
    const secondIndex = Number(secondColumn.dataset.columnIndex);

    return firstIndex - secondIndex;
  });

  if (dayColumns.length === 0) {
    return null;
  }

  return {
    weekGrid,
    timedRow,
    dayColumns,
  };
}

function createPlacement(
  event: DraftEvent,
  eventIndex: number,
  dayColumns: HTMLElement[],
): DraftEventPlacement | string {
  const startDate = getWrittenDate(event.startDateTime);
  const endDate = getWrittenDate(event.endDateTime);

  if (!startDate || !endDate) {
    return `Could not read the written dates for ${event.title}.`;
  }

  if (startDate !== endDate) {
    return `${event.title} crosses midnight. Multi-day draft placement is not supported yet.`;
  }

  const eventDateKey = getGoogleCalendarDateKey(event.startDateTime);
  const startMinutes = dateToMinutesSinceMidnight(event.startDateTime);
  const endMinutes = dateToMinutesSinceMidnight(event.endDateTime);

  if (!eventDateKey || startMinutes === null || endMinutes === null) {
    return `Could not calculate the date or clock time for ${event.title}.`;
  }

  if (endMinutes <= startMinutes) {
    return `${event.title} must end after it starts within the same day.`;
  }

  const matchingColumn = dayColumns.find(
    (column) => column.dataset.datekey === eventDateKey,
  );

  if (!matchingColumn) {
    return `${event.title} is not in the visible week.`;
  }

  const rectangle = matchingColumn.getBoundingClientRect();

  if (rectangle.width <= 0 || rectangle.height <= 0) {
    return `The visible day column for ${event.title} has no measurable size.`;
  }

  const pixelsPerMinute = rectangle.height / MINUTES_PER_DAY;
  const durationMinutes = endMinutes - startMinutes;
  const columnIndexText = matchingColumn.dataset.columnIndex;
  const parsedColumnIndex = Number(columnIndexText);
  const width = Math.max(rectangle.width - HORIZONTAL_INSET_PX * 2, 0);
  const height = durationMinutes * pixelsPerMinute;

  return {
    renderKey: `${event.id || 'draft-event'}-${eventIndex}`,
    eventId: event.id,
    title: event.title,
    startDateTime: event.startDateTime,
    endDateTime: event.endDateTime,
    columnIndex: Number.isFinite(parsedColumnIndex)
      ? parsedColumnIndex
      : null,
    left: rectangle.left + HORIZONTAL_INSET_PX,
    top: rectangle.top + startMinutes * pixelsPerMinute,
    width,
    height,
    startMinutes,
    endMinutes,
    isCompact: height < 44,
  };
}

export function measureDraftEventPlacements(
  events: DraftEvent[],
): DraftPlacementMeasurement {
  const elements = findGoogleCalendarWeekView();

  if (!elements) {
    return {
      elements: null,
      placements: [],
      warnings: [
        'Google Calendar week view was not found. Open week view before previewing the draft.',
      ],
    };
  }

  const placements: DraftEventPlacement[] = [];
  const warnings: string[] = [];

  events.forEach((event, eventIndex) => {
    const result = createPlacement(
      event,
      eventIndex,
      elements.dayColumns,
    );

    if (typeof result === 'string') {
      warnings.push(result);
      return;
    }

    placements.push(result);
  });

  return {
    elements,
    placements,
    warnings,
  };
}
