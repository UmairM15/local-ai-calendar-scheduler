export type DraftEvent = {
  id: string;
  title: string;
  startDateTime: string;
  endDateTime: string;
};

export type DraftSchedule = {
  requestText: string;
  events: DraftEvent[];
};

export function getDurationMinutes(event: DraftEvent): number | null {
  const startTime = Date.parse(event.startDateTime);
  const endTime = Date.parse(event.endDateTime);

  if (
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    endTime <= startTime
  ) {
    return null;
  }

  return (endTime - startTime) / 60_000;
}

export function validateDraft(draft: DraftSchedule): string[] {
  const errors: string[] = [];
  const eventIds = new Set<string>();

  const validEventTimes: {
    index: number;
    startTime: number;
    endTime: number;
  }[] = [];

  if (!draft.requestText.trim()) {
    errors.push('The scheduling request is missing.');
  }

  if (draft.events.length === 0) {
    errors.push('The draft must contain at least one event.');
  }

  draft.events.forEach((event, index) => {
    const eventName = `Event ${index + 1}`;

    if (!event.id.trim()) {
      errors.push(`${eventName} is missing an ID.`);
    } else if (eventIds.has(event.id)) {
      errors.push(`${eventName} has a duplicate ID.`);
    } else {
      eventIds.add(event.id);
    }

    if (!event.title.trim()) {
      errors.push(`${eventName} is missing a title.`);
    }

    const startTime = Date.parse(event.startDateTime);
    const endTime = Date.parse(event.endDateTime);

    const hasValidStartTime = Number.isFinite(startTime);
    const hasValidEndTime = Number.isFinite(endTime);

    if (!hasValidStartTime) {
      errors.push(`${eventName} has an invalid start date and time.`);
    }

    if (!hasValidEndTime) {
      errors.push(`${eventName} has an invalid end date and time.`);
    }

    if (
      hasValidStartTime &&
      hasValidEndTime &&
      endTime <= startTime
    ) {
      errors.push(`${eventName} must end after it starts.`);
    }

    if (
      hasValidStartTime &&
      hasValidEndTime &&
      endTime > startTime
    ) {
      validEventTimes.push({
        index,
        startTime,
        endTime,
      });
    }
  });

  for (let firstIndex = 0; firstIndex < validEventTimes.length; firstIndex++) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < validEventTimes.length;
      secondIndex++
    ) {
      const firstEvent = validEventTimes[firstIndex];
      const secondEvent = validEventTimes[secondIndex];

      const eventsOverlap =
        firstEvent.startTime < secondEvent.endTime &&
        secondEvent.startTime < firstEvent.endTime;

      if (eventsOverlap) {
        errors.push(
          `Event ${firstEvent.index + 1} overlaps with Event ${
            secondEvent.index + 1
          }.`,
        );
      }
    }
  }

  return errors;
}