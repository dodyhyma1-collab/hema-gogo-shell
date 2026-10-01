import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "hema-gogo-demo-data-v1";
const EVENT = "hema-gogo-demo-data-change";

function read() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(KEY) !== "off";
}

/** Global demo-data flag shared by every module (persisted in this browser). */
export function useDemoData() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(read());
    const sync = () => setOn(read());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const toggle = useCallback(() => {
    window.localStorage.setItem(KEY, read() ? "off" : "on");
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { on, toggle };
}

/** Calls fill/clear whenever the flag changes (skips the first render when demo is on). */
export function useDemoSync(fill: () => void, clear: () => void) {
  const { on } = useDemoData();
  const first = useRef(true);
  useEffect(() => {
    const isFirst = first.current;
    first.current = false;
    if (on && isFirst) return;
    if (on) fill();
    else clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
}
