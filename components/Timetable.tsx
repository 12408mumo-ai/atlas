"use client";

import { useState } from "react";
import { addTimetableSlot, removeTimetableSlot, updateTimetableSlot, type Slot } from "@/lib/store";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
type SlotDetails = Omit<Slot, "id">;
const emptySlot = (): SlotDetails => ({ day: "Mon", time: "", title: "", place: "", lecturer: "" });

/** The same editable weekly timetable is shared by Work and Study. */
export function Timetable({ slots }: { slots: Slot[] }) {
  const [form, setForm] = useState<SlotDetails>(emptySlot);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function resetForm() {
    setForm(emptySlot());
    setEditingId(null);
    setShowForm(false);
  }

  function edit(slot: Slot) {
    setForm({ day: slot.day, time: slot.time, title: slot.title, place: slot.place, lecturer: slot.lecturer });
    setEditingId(slot.id);
    setShowForm(true);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const details = { ...form, title: form.title.trim(), time: form.time.trim(), place: form.place.trim(), lecturer: form.lecturer.trim() };
    if (!details.title || !details.time) return;
    if (editingId) updateTimetableSlot(editingId, details);
    else addTimetableSlot(details);
    resetForm();
  }

  function remove(slot: Slot) {
    if (!window.confirm(`Delete “${slot.title}” from ${slot.day} at ${slot.time}?`)) return;
    removeTimetableSlot(slot.id);
    if (editingId === slot.id) resetForm();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-ui text-[15px] text-wine opacity-75">Your weekly schedule · saved on this device</p>
        <button type="button" className="glass-button px-4 py-2 font-ui text-[15px]" onClick={() => showForm ? resetForm() : setShowForm(true)}>
          {showForm ? "Close" : "+ Add entry"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="glass-card space-y-3 p-4 sm:p-5">
          <h3 className="font-display text-[22px] text-wine">{editingId ? "Edit timetable entry" : "Add timetable entry"}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="font-ui text-[15px] text-wine">Title
              <input className="field mt-1 py-2" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Class or activity" required />
            </label>
            <label className="font-ui text-[15px] text-wine">Day
              <select className="field mt-1 py-2" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
                {DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
              </select>
            </label>
            <label className="font-ui text-[15px] text-wine">Time
              <input className="field mt-1 py-2" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="e.g. 09:00 or 09:00–10:30" required />
            </label>
            <label className="font-ui text-[15px] text-wine">Place <span className="opacity-60">(optional)</span>
              <input className="field mt-1 py-2" value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} placeholder="Room or location" />
            </label>
            <label className="font-ui text-[15px] text-wine">Lecturer or notes <span className="opacity-60">(optional)</span>
              <input className="field mt-1 py-2" value={form.lecturer} onChange={(e) => setForm({ ...form, lecturer: e.target.value })} placeholder="Name or a short note" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-wine btn-sm">{editingId ? "Save changes" : "Add entry"}</button>
            <button type="button" className="glass-button px-4 py-2 font-ui text-[15px]" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DAYS.map((day) => {
          const daySlots = slots.filter((slot) => slot.day === day);
          return (
            <section key={day} className="glass-tile overflow-hidden">
              <h3 className="border-b border-wine/20 px-3.5 py-2.5 font-ui text-[15px] uppercase tracking-[0.15em] text-wine">{day}</h3>
              <div className="space-y-2.5 p-2.5">
                {daySlots.length === 0 && <p className="px-1 py-4 text-center font-body text-[18px] italic text-wine opacity-60">Free</p>}
                {daySlots.map((slot) => (
                  <article key={slot.id} className="rounded-xl border border-white/60 bg-white/55 px-3 py-2.5">
                    <p className="font-ui text-[14px] tracking-[0.08em] text-wine">{slot.time}</p>
                    <p className="mt-0.5 break-words font-body text-[18.5px] leading-snug text-wine">{slot.title}</p>
                    {slot.place && <p className="mt-0.5 break-words font-body text-[16.5px] italic text-wine opacity-70">{slot.place}</p>}
                    {slot.lecturer && <p className="mt-0.5 break-words font-ui text-[13.5px] text-wine opacity-70">{slot.lecturer}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => edit(slot)} aria-label={`Edit ${slot.title} on ${day} at ${slot.time}`} className="glass-button px-3 py-1 font-ui text-[14px]">Edit</button>
                      <button type="button" onClick={() => remove(slot)} aria-label={`Delete ${slot.title} on ${day} at ${slot.time}`} className="glass-button px-3 py-1 font-ui text-[14px]">Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
