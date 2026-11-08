"use client";

import { useEffect, useState } from "react";
import styles from "./FlipClock.module.css";

const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const twoDigits = (value: number) => String(value).padStart(2, "0");

type ClockReading = { current: Date; previous: Date | null };

function FlipCard({ value, previous }: { value: string; previous?: string }) {
  return (
    <div className={styles.card} aria-hidden="true">
      {value.split("").map((digit, index) => {
        const old = previous?.[index] ?? digit;
        const changed = old !== digit;
        return (
          <div className={styles.digit} key={index}>
            <div className={`${styles.half} ${styles.top}`}><span className={styles.halfNumber}>{digit}</span></div>
            <div className={`${styles.half} ${styles.bottom} ${changed ? styles.oldBottom : ""}`}><span className={styles.halfNumber}>{old}</span></div>
            {changed && <>
              <div className={`${styles.half} ${styles.bottom} ${styles.reducedBottom}`}><span className={styles.halfNumber}>{digit}</span></div>
              <div key={`${old}-${digit}`} className={styles.animation}>
                <div className={`${styles.half} ${styles.flipTop}`}><span className={styles.halfNumber}>{old}</span></div>
                <div className={`${styles.half} ${styles.flipBottom}`}><span className={styles.halfNumber}>{digit}</span></div>
              </div>
            </>}
          </div>
        );
      })}
      <span className={styles.seam} />
    </div>
  );
}

/** A local-time, 24-hour clock. Its display updates on each second boundary. */
export function FlipClock({ compact = false }: { compact?: boolean }) {
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
  // After a long pause or a clock adjustment, show the current time directly.
  const animate = current && previous && current.getTime() - previous.getTime() > 0 && current.getTime() - previous.getTime() < 2000;
  const oldParts = animate && previous
    ? [twoDigits(previous.getHours()), twoDigits(previous.getMinutes()), twoDigits(previous.getSeconds())]
    : [];

  return (
    <section className={`${styles.clock} ${compact ? styles.compact : ""}`} aria-label="Local time and date">
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
