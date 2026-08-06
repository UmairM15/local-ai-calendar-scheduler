import { useEffect, useState } from "react";
import { validateDraft, type DraftSchedule } from "@/domain/draftSchedule";
import {
  measureDraftEventPlacements,
  type DraftEventPlacement,
  type GoogleCalendarWeekViewElements,
} from "@/components/googleCalendarWeekViewAdapter";
import "@/components/CalendarDraftOverlay.css";

type CalendarDraftOverlayProps = {
  draft: DraftSchedule | null;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
};

function placementsAreEqual(
  currentPlacements: DraftEventPlacement[],
  nextPlacements: DraftEventPlacement[],
): boolean {
  if (currentPlacements.length !== nextPlacements.length) {
    return false;
  }

  return currentPlacements.every((currentPlacement, index) => {
    const nextPlacement = nextPlacements[index];

    return (
      currentPlacement.renderKey === nextPlacement.renderKey &&
      currentPlacement.left === nextPlacement.left &&
      currentPlacement.top === nextPlacement.top &&
      currentPlacement.width === nextPlacement.width &&
      currentPlacement.height === nextPlacement.height &&
      currentPlacement.title === nextPlacement.title
    );
  });
}

function formatWrittenTime(dateTime: string): string {
  const timeMatch = /T(\d{2}):(\d{2})/.exec(dateTime);

  return timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : "Unknown time";
}

export default function CalendarDraftOverlay({
  draft,
  selectedEventId,
  onSelectEvent,
}: CalendarDraftOverlayProps) {
  const [placements, setPlacements] = useState<DraftEventPlacement[]>([]);
  const isDraftValid = draft !== null && validateDraft(draft).length === 0;

  useEffect(() => {
    if (!draft || !isDraftValid) {
      setPlacements([]);
      return;
    }

    const activeDraft = draft;
    let animationFrameId: number | null = null;
    let observedElements: GoogleCalendarWeekViewElements | null = null;
    let lastWarningSignature = "";
    let lastDebugSignature = "";

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            scheduleMeasurement();
          });

    function observedTargetsAreUnchanged(
      elements: GoogleCalendarWeekViewElements | null,
    ): boolean {
      if (!observedElements || !elements) {
        return observedElements === elements;
      }

      return (
        observedElements.weekGrid === elements.weekGrid &&
        observedElements.timedRow === elements.timedRow &&
        observedElements.dayColumns.length === elements.dayColumns.length &&
        observedElements.dayColumns.every(
          (column, index) => column === elements.dayColumns[index],
        )
      );
    }

    function observeMeasuredElements(
      elements: GoogleCalendarWeekViewElements | null,
    ) {
      if (!resizeObserver || observedTargetsAreUnchanged(elements)) {
        return;
      }

      resizeObserver.disconnect();
      observedElements = elements;

      if (!elements) {
        return;
      }

      resizeObserver.observe(elements.weekGrid);
      resizeObserver.observe(elements.timedRow);
      elements.dayColumns.forEach((column) => {
        resizeObserver.observe(column);
      });
    }

    function measure() {
      animationFrameId = null;

      const measurement = measureDraftEventPlacements(activeDraft.events);
      const warningSignature = measurement.warnings.join("\n");

      if (warningSignature && warningSignature !== lastWarningSignature) {
        measurement.warnings.forEach((warning) => {
          console.warn(`[Calendar draft overlay] ${warning}`);
        });
      }

      lastWarningSignature = warningSignature;

      const debugModel = measurement.placements.map((placement) => ({
        eventId: placement.eventId,
        columnIndex: placement.columnIndex,
        startMinutes: placement.startMinutes,
        endMinutes: placement.endMinutes,
      }));
      const debugSignature = JSON.stringify(debugModel);

      if (debugSignature && debugSignature !== lastDebugSignature) {
        console.debug("[Calendar draft overlay] Position model:", debugModel);
      }

      lastDebugSignature = debugSignature;
      observeMeasuredElements(measurement.elements);
      setPlacements((currentPlacements) =>
        placementsAreEqual(currentPlacements, measurement.placements)
          ? currentPlacements
          : measurement.placements,
      );
    }

    function scheduleMeasurement() {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(measure);
    }

    const mutationObserver = new MutationObserver(() => {
      scheduleMeasurement();
    });

    mutationObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["aria-owns", "data-column-index", "data-datekey"],
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", scheduleMeasurement);
    window.addEventListener("scroll", scheduleMeasurement, true);
    document.addEventListener("visibilitychange", scheduleMeasurement);

    scheduleMeasurement();

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasurement);
      window.removeEventListener("scroll", scheduleMeasurement, true);
      document.removeEventListener("visibilitychange", scheduleMeasurement);
    };
  }, [draft, isDraftValid]);

  if (!draft || !isDraftValid || placements.length === 0) {
    return null;
  }

  return (
    <div
      className="calendar-draft-overlay"
      role="region"
      aria-label="Draft calendar event previews"
    >
      {placements.map((placement) => {
        const isSelected = placement.eventId === selectedEventId;
        const timeRange = `${formatWrittenTime(
          placement.startDateTime,
        )}–${formatWrittenTime(placement.endDateTime)}`;

        return (
          <button
            type="button"
            className={`calendar-draft-event${
              placement.isCompact ? " calendar-draft-event--compact" : ""
            }${isSelected ? " calendar-draft-event--selected" : ""}`}
            key={placement.renderKey}
            style={{
              left: placement.left,
              top: placement.top,
              width: placement.width,
              height: placement.height,
            }}
            aria-pressed={isSelected}
            aria-label={`Draft event: ${placement.title}, ${timeRange}`}
            title={`${placement.title}\n${timeRange}`}
            onClick={() => {
              onSelectEvent(placement.eventId);
            }}
          >
            <span className="calendar-draft-event__heading">
              <span className="calendar-draft-label">Draft</span>
              <strong className="calendar-draft-event__title">
                {placement.title}
              </strong>
            </span>

            <span className="calendar-draft-event__time">{timeRange}</span>
          </button>
        );
      })}
    </div>
  );
}
