import { useCallback, useEffect, useRef, useState } from "react";

/** Tries getUserMedia; falls back gracefully (iframe previews usually block the camera). */
export function useCamera(autoStart = false) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "live" | "denied" | "unavailable">("idle");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async (facing: "user" | "environment" = "user") => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }
    setStatus("pending");
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
      setStatus("live");
    } catch (e) {
      setStatus((e as DOMException)?.name === "NotAllowedError" ? "denied" : "unavailable");
    }
  }, []);

  useEffect(() => {
    if (autoStart) start();
    return stop;
  }, [autoStart, start, stop]);

  useEffect(() => {
    if (status === "live" && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  });

  const setEnabled = useCallback((enabled: boolean) => {
    streamRef.current?.getVideoTracks().forEach((track) => { track.enabled = enabled; });
  }, []);

  return { videoRef, status, start, stop, setEnabled };
}

