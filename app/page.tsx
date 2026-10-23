"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { socket } from "@/lib/socket";
import { SocketEvents } from "@/shared/events";
import type { ProblemTopic } from "@/types/domain";
import {
  ConnectionStatus,
  PremiumShell,
  ToastRegion,
  TopNav,
} from "@/components/ui/PremiumShell";
import { useSocketConnection } from "@/hooks/useSocketConnection";
import { useTransientMessage } from "@/hooks/useTransientMessage";

// Dynamically import the Three.js heavy metal golf ball scene (client-only)
const GolfBallScene = dynamic(
  () =>
    import("@/components/landing/GolfBallScene").then(
      (mod) => mod.GolfBallScene,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="golf-ball-fallback"
        aria-label="Loading 3D brass golf ball…"
      >
        <div className="flat-gold-ball" />
      </div>
    ),
  },
);

type TopicChoice = ProblemTopic | "random";

const topicOptions: Array<{ value: TopicChoice; label: string }> = [
  { value: "random", label: "Any" },
  { value: "arrays", label: "Arrays" },
  { value: "strings", label: "Strings" },
  { value: "math", label: "Math" },
  { value: "dp", label: "DP" },
  { value: "stacks", label: "Stacks" },
  { value: "graphs", label: "Graphs" },
  { value: "hashing", label: "Hashing" },
];

export default function HomePage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [pendingAction, setPendingAction] = useState<
    "create" | "join" | "solo" | null
  >(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicChoice>("random");
  const { connected } = useSocketConnection();
  const { message, setMessage } = useTransientMessage();

  const normalizedJoinCode = useMemo(
    () => joinCode.trim().toUpperCase(),
    [joinCode],
  );

  useEffect(() => {
    const handleRoomCreated = (roomCode: string) => {
      setPendingAction(null);
      router.push(`/lobby/${roomCode}`);
    };

    const handleRoomReady = ({ roomCode }: { roomCode: string }) => {
      setPendingAction(null);
      router.push(`/game/${roomCode}`);
    };

    const handleError = (message: string) => {
      setPendingAction(null);
      setMessage(message);
    };

    socket.on(SocketEvents.ROOM_CREATED, handleRoomCreated);
    socket.on(SocketEvents.ROOM_READY, handleRoomReady);
    socket.on(SocketEvents.ROOM_ERROR, handleError);

    return () => {
      socket.off(SocketEvents.ROOM_CREATED, handleRoomCreated);
      socket.off(SocketEvents.ROOM_READY, handleRoomReady);
      socket.off(SocketEvents.ROOM_ERROR, handleError);
    };
  }, [router, setMessage]);

  useEffect(() => {
    if (!pendingAction) return;

    const timeout = window.setTimeout(() => {
      setPendingAction(null);
      setMessage(
        "The realtime server did not respond. Check the connection and try again.",
      );
    }, 12000);
    return () => window.clearTimeout(timeout);
  }, [pendingAction, setMessage]);

  const createRoom = () => {
    if (!connected || pendingAction) return;
    setPendingAction("create");
    socket.emit(SocketEvents.CREATE_ROOM, { topic: selectedTopic });
  };

  const startSolo = () => {
    if (!connected || pendingAction) return;
    setPendingAction("solo");
    socket.emit(SocketEvents.START_SOLO, { topic: selectedTopic });
  };

  const joinRoom = () => {
    if (!/^[A-Z0-9]{8}$/.test(normalizedJoinCode)) {
      setJoinError("Enter the eight-letter or number room code.");
      return;
    }

    if (!connected || pendingAction) return;
    setJoinError("");
    setPendingAction("join");
    socket.emit(SocketEvents.JOIN_ROOM, normalizedJoinCode);
  };

  return (
    <PremiumShell
      status={
        <>
          <div className="status-orbit">
            <span className={connected ? "" : "offline"} />
          </div>
          <div>
            <strong>Realtime Engine</strong>
            <span>{connected ? "connected" : "reconnecting"}</span>
          </div>
        </>
      }
      topbar={
        <TopNav
          eyebrow="Printed Scorecard · Metal Ball"
          title="Start a round"
          actions={<ConnectionStatus connected={connected} />}
        />
      }
    >
      <ToastRegion message={message} />
      <span className="sr-only" role="status" aria-live="polite">
        {pendingAction === "create"
          ? "Creating a room."
          : pendingAction === "join"
            ? "Joining the room."
            : pendingAction === "solo"
              ? "Starting solo practice."
              : ""}
      </span>

      <section className="unslop-landing">
        {/* Left Stage: 3JS Heavy Metal Golf Ball + Scorecard Statement */}
        <section className="unslop-stage" aria-label="Interactive Arena Display">
          <GolfBallScene />

          <div className="unslop-copy-block">
            <h1 className="unslop-heading">
              Write it <span className="gold-word">shorter.</span>
            </h1>
            <p className="unslop-tagline">
              Head-to-head code golf. Same problem, same judge, fewest characters wins.
            </p>

            <div className="unslop-telemetry">
              <span className="unslop-telemetry-tag">
                <strong>61</strong> problems in catalog
              </span>
              <span className="unslop-telemetry-tag">
                <strong>Docker</strong> hardened sandbox
              </span>
              <span className="unslop-telemetry-tag">
                <strong>UTF-8</strong> byte scoring
              </span>
            </div>
          </div>
        </section>

        {/* Right Stage: Printed Scorecard Control Console */}
        <aside className="unslop-rail" aria-label="Round Controls">
          <section className="unslop-console">
            <header className="unslop-console-header">
              <span className="unslop-console-title">Start a round</span>
              <span className="unslop-console-status">
                {connected ? "ONLINE" : "RECONNECTING…"}
              </span>
            </header>

            {/* Topic selection chips */}
            <div className="unslop-field-group">
              <span className="unslop-label">Problem Topic</span>
              <div className="unslop-topic-chips" role="radiogroup" aria-label="Problem topic">
                {topicOptions.map((option) => {
                  const isSelected = selectedTopic === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`unslop-topic-chip ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedTopic(option.value)}
                      disabled={Boolean(pendingAction)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Create Room Primary Trigger (Gold action) */}
            <button
              type="button"
              className="unslop-btn-gold"
              onClick={createRoom}
              disabled={Boolean(pendingAction) || !connected}
            >
              {pendingAction === "create" ? "Creating room…" : "Create room"}
            </button>

            {/* Join / Solo Practice Section */}
            <form
              className="unslop-join-section"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                joinRoom();
              }}
            >
              <label className="unslop-label" htmlFor="room-code">
                Join by Room Code
              </label>
              <input
                id="room-code"
                className="unslop-input-code"
                value={joinCode}
                onChange={(event) => {
                  setJoinCode(
                    event.target.value
                      .replace(/[^a-z0-9]/gi, "")
                      .toUpperCase()
                      .slice(0, 8),
                  );
                  setJoinError("");
                }}
                placeholder="ABCD2345"
                maxLength={8}
                minLength={8}
                pattern="[A-Za-z0-9]{8}"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={Boolean(joinError)}
                aria-describedby={joinError ? "room-code-error" : undefined}
              />
              {joinError && (
                <span className="field-error" id="room-code-error" role="alert">
                  {joinError}
                </span>
              )}

              <div className="unslop-actions-row">
                <button
                  type="submit"
                  className="unslop-btn-outline"
                  disabled={Boolean(pendingAction) || !connected}
                >
                  {pendingAction === "join" ? "Joining…" : "Join"}
                </button>
                <button
                  type="button"
                  className="unslop-btn-outline"
                  onClick={startSolo}
                  disabled={Boolean(pendingAction) || !connected}
                >
                  {pendingAction === "solo" ? "Starting…" : "Practice alone"}
                </button>
              </div>
            </form>
          </section>
        </aside>
      </section>
    </PremiumShell>
  );
}
