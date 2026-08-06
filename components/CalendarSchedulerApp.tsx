import { useState } from "react";
import CalendarDraftOverlay from "@/components/CalendarDraftOverlay";
import CalendarSidebar from "@/components/CalendarSidebar";
import type { DraftSchedule } from "@/domain/draftSchedule";

function CalendarSchedulerApp() {
  const [draft, setDraft] = useState<DraftSchedule | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  function handleDraftChange(nextDraft: DraftSchedule | null) {
    setDraft(nextDraft);
    setSelectedEventId(nextDraft?.events[0]?.id ?? null);
  }

  return (
    <>
      <CalendarDraftOverlay
        draft={draft}
        selectedEventId={selectedEventId}
        onSelectEvent={setSelectedEventId}
      />

      <CalendarSidebar
        draft={draft}
        selectedEventId={selectedEventId}
        onDraftChange={handleDraftChange}
        onSelectEvent={setSelectedEventId}
      />
    </>
  );
}

export default CalendarSchedulerApp;
