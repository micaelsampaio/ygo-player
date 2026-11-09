import { ChangeEvent, FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { YGOTextArea } from "../../../components/TextArea";
import type { YGODuel } from "../../../../core/YGODuel";
import { useCoach } from "../../coach-panel";

/** What a replay's chat panel reads off ygo-core: its command queue and position in it. */
type ReplayCommands = {
  index: number;
  at(index: number): { baseType?: string; data?: unknown } | undefined;
};

/**
 * The chat a replay has reached: its ChatCommands up to the current command
 * (ygo-core keeps index on the last command played, chat around it included).
 * ChatCommand only announces itself the first time it runs (when the replay
 * loads, before this panel listens), so a replay reads its chat off the log.
 */
export function replayChatMessages(commands: ReplayCommands): Array<{ username: string; message: string }> {
  const out: Array<{ username: string; message: string }> = [];
  for (let i = 0; i <= commands.index; i++) {
    const command = commands.at(i);
    if (command?.baseType !== "ChatCommand") continue;
    const data = (command.data ?? {}) as { username?: unknown; message?: unknown };
    if (typeof data.message !== "string") continue;
    out.push({ username: typeof data.username === "string" ? data.username : "", message: data.message });
  }
  return out;
}

/** Hard cap the server accepts for one chat message. */
export const CHAT_MAX_LENGTH = 100;

type ChatMessage = {
  key: string;
  username: string;
  owner: boolean;
  system?: boolean;
  /** A Duel Coach line: only this player sees it (never sent). */
  coach?: boolean;
  /** When it arrived: the coach's lines are merged in by time. */
  at?: number;
  message: ReactNode;
};

const lines = (text: string) => text.split(/\n/g).map((line, index) => <div key={index}>{line}</div>);

/** The chat's messages and the coach's lines, by arrival time (messages without a time keep their place). */
export function mergeCoachLines<T extends { at?: number }>(chat: T[], coach: T[]): T[] {
  if (!coach.length) return chat;
  const out: T[] = [];
  let j = 0;
  for (const m of chat) {
    while (j < coach.length && m.at !== undefined && (coach[j].at ?? 0) <= m.at) out.push(coach[j++]);
    out.push(m);
  }
  while (j < coach.length) out.push(coach[j++]);
  return out;
}

export function Chat({ duel }: { duel: YGODuel }) {
  const [isChatHidden, setIsChatHidden] = useState(false);
  const coach = useCoach(duel);
  // Coach lines that arrived while the chat was hidden: a dot on its toggle.
  const [seenCoach, setSeenCoach] = useState(0);
  const coachCount = coach.messages.length;
  useEffect(() => { if (!isChatHidden) setSeenCoach(coachCount); }, [isChatHidden, coachCount]);
  const unreadCoach = isChatHidden && coachCount > seenCoach;
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const isReplay = duel.config.gameMode === "REPLAY";

  const toggleChat = () => {
    setIsChatHidden(prev => !prev);
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value.slice(0, CHAT_MAX_LENGTH));
  };

  const submitMessage = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    sendMessage();
  };

  const sendMessage = () => {
    if (message.trim().length > 0) {
      duel.serverActions.chat.send(message.trim());
      setMessage("");
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [message]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceToBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      shouldAutoScroll.current = distanceToBottom < 80;
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const toChatMessage = (data: { username: string; message: string }, key: string): ChatMessage => ({
      key,
      username: data.username,
      owner: data.username === duel.client.username,
      at: Date.now(),
      message: lines(data.message),
    });

    if (isReplay) {
      // A replay: the chat up to where it stands, again on every step, seek or rewind.
      const sync = () => setChatMessages(replayChatMessages(duel.ygo.commands).map((m, i) => toChatMessage(m, `replay-${i}`)));
      sync();
      duel.ygo.events.on("command-redo", sync);
      duel.ygo.events.on("command-undo", sync);
      duel.events.on("commands-process-completed", sync);
      return () => {
        duel.ygo.events.off("command-redo", sync);
        duel.ygo.events.off("command-undo", sync);
        duel.events.off("commands-process-completed", sync);
      };
    }

    const handler = (data: { username: string; message: string }) => {
      setChatMessages((prev) => [...prev, toChatMessage(data, crypto.randomUUID())]);
    };
    const systemHandler = (data: { message: string }) => {
      const chatMessage: ChatMessage = {
        key: crypto.randomUUID(),
        username: "",
        owner: false,
        message: data.message,
        system: true,
        at: Date.now(),
      };
      setChatMessages((prev) => [...prev, chatMessage]);
    }

    duel.ygo.events.on("chat-message", handler);
    duel.events.on("system-chat-message", systemHandler);
    return () => {
      duel.ygo.events.off("chat-message", handler);
      duel.events.off("system-chat-message", systemHandler);
    };
  }, [duel, isReplay]);

  useEffect(() => {
    if (shouldAutoScroll.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, coachCount]);

  const shown = isReplay ? chatMessages : mergeCoachLines(chatMessages, coach.messages.map((m): ChatMessage => ({
    key: `coach:${m.key}`, username: "Coach", owner: false, coach: true, at: m.at, message: lines(m.text),
  })));

  let prevUser = "";

  if(duel.ygo.options.showChat === false) return null;

  return (
    <div className={`ygo-left-menu-chat-container ${isChatHidden ? "ygo-hidden" : ""}`}>
      <div className="ygo-chat-toggle-wrapper">
        <button
          type="button"
          className="ygo-chat-toggle-btn"
          onClick={toggleChat}
          aria-label={isChatHidden ? (unreadCoach ? "Show chat (new coach tips)" : "Show chat") : "Hide chat"}
          aria-expanded={!isChatHidden}
          title={isChatHidden ? (unreadCoach ? "Show chat: new coach tips" : "Show chat") : "Hide chat"}
        >
          <div className={`ygo-close-btn-icon ${isChatHidden ? "ygo-collapsed" : ""}`}></div>
          {unreadCoach && <span className="ygo-chat-coach-dot" aria-hidden="true" />}
        </button>
      </div>
      <div className={`ygo-chat-container ${isChatHidden ? "ygo-hidden" : ""}`}>
        <div className="ygo-chat-messages" ref={messagesContainerRef}>
          {shown.length === 0 && <div className="ygo-chat-empty">{isReplay ? "No messages yet." : "No messages yet. Say hi to your opponent."}</div>}
          {shown.map((msg) => {

            if (msg.coach) {
              prevUser = "";
              return (
                <div key={msg.key} className="ygo-chat-message left ygo-chat-coach" aria-label="Coach (only you see this)">
                  <div className="ygo-text-xs ygo-chat-coach-name">Coach · only you</div>
                  {msg.message}
                </div>
              );
            }

            if (msg.system) {
              prevUser = "";
              return <div key={msg.key} className="ygo-schat-message">{msg.message}</div>
            }

            const className = msg.owner
              ? "ygo-chat-message right"
              : "ygo-chat-message left";
            const username = prevUser !== msg.username ? msg.username : "";
            prevUser = msg.username;
            return (
              <div key={msg.key} className={className}>
                {username && <div className="ygo-text-xs">{username}</div>}
                {msg.message}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {!isReplay && <form className="ygo-chat-input" onSubmit={submitMessage}>
          <YGOTextArea
            className="ygo-single-line"
            ref={textareaRef}
            placeholder="Type a message…"
            aria-label="Chat message"
            maxLength={CHAT_MAX_LENGTH}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                sendMessage();
              }
            }}
            value={message}
            onChange={handleChange} />
          <div className="ygo-chat-input-footer">
            <span
              className={`ygo-chat-counter${message.length >= CHAT_MAX_LENGTH ? " ygo-chat-counter-full" : ""}`}
              aria-live="polite"
            >
              {message.length}/{CHAT_MAX_LENGTH}
            </span>
            <button
              type="submit"
              className="ygo-btn ygo-btn-primary ygo-btn-sm"
              disabled={message.trim().length === 0}
            >
              Send
            </button>
          </div>
        </form>}
      </div>
    </div>
  );
}
