import { useState, type ChangeEvent } from "react";
import {
  getDurationMinutes,
  validateDraft,
  type DraftSchedule,
} from "@/domain/draftSchedule";

type ApplyStatus = "idle" | "applied";

type CalendarSidebarProps = {
  draft: DraftSchedule | null;
  selectedEventId: string | null;
  onDraftChange: (draft: DraftSchedule | null) => void;
  onSelectEvent: (eventId: string) => void;
};

function formatDateTime(dateTime: string): string {
  const timestamp = Date.parse(dateTime);

  if (!Number.isFinite(timestamp)) {
    return "Invalid date and time";
  }

  return new Date(timestamp).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function CalendarSidebar({
  draft,
  selectedEventId,
  onDraftChange,
  onSelectEvent,
}: CalendarSidebarProps) {
  const [request, setRequest] = useState("");
  const [applyStatus, setApplyStatus] = useState<ApplyStatus>("idle");

  const validationErrors = draft ? validateDraft(draft) : [];
  const isDraftValid = draft !== null && validationErrors.length === 0;

  function handleGenerateDraft() {
    const cleanedRequest = request.trim();

    if (!cleanedRequest) {
      return;
    }

    const nextDraft: DraftSchedule = {
      requestText: cleanedRequest,
      events: [
        {
          id: "draft-1",
          title: "Planned Calendar Event 1",
          startDateTime: "2026-07-21T09:00:00-04:00",
          endDateTime: "2026-07-21T09:30:00-04:00",
        },
        {
          id: "draft-2",
          title: "Planned Calendar Event 2",
          startDateTime: "2026-07-23T09:00:00-04:00",
          endDateTime: "2026-07-23T09:30:00-04:00",
        },
      ],
    };

    onDraftChange(nextDraft);
    setApplyStatus("idle");
  }

  function handleApplyDraft() {
    if (!draft || !isDraftValid || applyStatus === "applied") {
      return;
    }

    console.log("Simulated calendar apply:", draft);
    setApplyStatus("applied");
  }

  return (
    <aside id="ai-sidebar">
      <header className="sidebar-header">
        <h2>Calendar Scheduler</h2>
      </header>

      <section aria-labelledby="request-heading">
        <h3 id="request-heading">Scheduling Request</h3>

        <label htmlFor="scheduling-request">
          What do you need to schedule?
        </label>

        <textarea
          id="scheduling-request"
          rows={5}
          placeholder="Example: Coffee with Umair next week, 30 minutes, in the morning."
          value={request}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
            setRequest(event.target.value);
            onDraftChange(null);
            setApplyStatus("idle");
          }}
        />

        <button
          type="button"
          disabled={!request.trim()}
          onClick={handleGenerateDraft}
        >
          Generate draft
        </button>
      </section>

      <section aria-labelledby="draft-heading">
        <h3 id="draft-heading">Draft Schedule</h3>

        {draft ? (
          <article className="draft-card">
            <p>
              <strong>Proposed events:</strong> {draft.events.length}
            </p>

            <div className="draft-events">
              {draft.events.map((event, index) => {
                const durationMinutes = getDurationMinutes(event);
                const isSelected = event.id === selectedEventId;

                return (
                  <section
                    className={`draft-event${
                      isSelected ? " draft-event--selected" : ""
                    }`}
                    key={`${event.id}-${index}`}
                    aria-label={isSelected ? "Selected draft event" : undefined}
                  >
                    <h4>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          onSelectEvent(event.id);
                        }}
                      >
                        {event.title}
                      </button>
                    </h4>

                    <p>
                      <strong>Starts:</strong>{" "}
                      {formatDateTime(event.startDateTime)}
                    </p>

                    <p>
                      <strong>Ends:</strong> {formatDateTime(event.endDateTime)}
                    </p>

                    <p>
                      <strong>Duration:</strong>{" "}
                      {durationMinutes !== null
                        ? `${durationMinutes} minutes`
                        : "Invalid duration"}
                    </p>
                  </section>
                );
              })}
            </div>

            <div className="validation-status" aria-live="polite">
              {isDraftValid ? (
                <p>Draft is valid.</p>
              ) : (
                <>
                  <p>Draft needs attention:</p>

                  <ul>
                    {validationErrors.map((error, index) => (
                      <li key={`${error}-${index}`}>{error}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </article>
        ) : (
          <p>No draft generated yet.</p>
        )}
      </section>

      <footer className="sidebar-footer">
        <p>Review the draft before applying it to Google Calendar.</p>

        <button
          type="button"
          disabled={!isDraftValid || applyStatus === "applied"}
          onClick={handleApplyDraft}
        >
          {applyStatus === "applied" ? "Draft Applied" : "Apply Draft"}
        </button>

        <div aria-live="polite">
          {applyStatus === "applied" && (
            <p>Draft applied successfully. No calendar events were created.</p>
          )}
        </div>
      </footer>
    </aside>
  );
}

export default CalendarSidebar;
