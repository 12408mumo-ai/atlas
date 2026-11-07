"use client";

import { useEffect, useState } from "react";
import styles from "./FlipClock.module.css";

const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const twoDigits = (value: number) => String(value).padStart(2, "0");

type ClockReading = { current: Date; previous: Date | null };

function FlipCard({ value, previous }: { value: string; previous?: string }) {
  const changed = previous !== undefined && previous !== value;

  return (
    <div className={styles.card} aria-hidden="true">
      <span className={styles.number}>{value}</span>
      {changed && (
        <div key={`${previous}-${value}`} className={styles.animation}>
          <div className={`${styles.half} ${styles.flipTop}`}>
            <span className={styles.halfNumber}>{previous}</span>
          </div>
          <div className={`${styles.half} ${styles.flipBottom}`}>
            <span className={styles.halfNumber}>{value}</span>
          </div>
        </div>
      )}
      <span className={styles.seam} />
    </div>
  );
}

/** A local-time, 24-hour clock. Its display updates on each second boundary. */
export function FlipClock() {
  const [reading, setReading] = useState<ClockReading | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = new Date();
      setReading((last) => ({ current, previous: last?.current ?? null }));
      timer = setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  const current = reading?.current;
  const previous = reading?.previous;
  const date = current
    ? `${twoDigits(current.getDate())}-${months[current.getMonth()]}-${current.getFullYear()} ${days[current.getDay()]}`
    : "\u00a0";
  const parts = current
    ? [twoDigits(current.getHours()), twoDigits(current.getMinutes()), twoDigits(current.getSeconds())]
    : ["--", "--", "--"];
  const oldParts = previous
    ? [twoDigits(previous.getHours()), twoDigits(previous.getMinutes()), twoDigits(previous.getSeconds())]
    : [];

  return (
    <section className={styles.clock} aria-label="Local time and date">
      <p className={styles.date}>{date}</p>
      <div className={styles.cards} role="timer" aria-label={current ? `Local time ${parts.join(":")}` : "Loading local time"} aria-live="off">
        {parts.map((value, index) => (
          <div className={styles.cardGroup} key={index}>
            {index > 0 && <span className={styles.separator} aria-hidden="true">:</span>}
            <FlipCard value={value} previous={oldParts[index]} />
          </div>
        ))}
      </div>
      <p className={styles.caption}>LESS IS MORE</p>
    </section>
  );
}
