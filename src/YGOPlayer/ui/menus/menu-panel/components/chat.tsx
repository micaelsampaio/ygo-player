import { ChangeEvent, FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { YGOTextArea } from "../../../components/TextArea";
import { YGODuel } from "../../../../core/YGODuel";

type ChatMessage = {
  key: string;
  username: string;
  owner: boolean;
  system?: boolean;
  message: ReactNode;
};

export function Chat({ duel }: { duel: YGODuel }) {
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= 100) {
      setMessage(e.target.value);
    }
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
    const handler = (data: any) => {
      const chatMessage: ChatMessage = {
        key: crypto.randomUUID(),
        username: data.username,
        owner: data.username === duel.client.username,
        message: data.message.split(/\n/g).map((line: string, index: number) => <div key={index}>{line}</div>),
      };
      setChatMessages((prev) => [...prev, chatMessage]);
    };
    const systemHandler = (data: any) => {
      const chatMessage: ChatMessage = {
        key: crypto.randomUUID(),
        username: "",
        owner: false,
        message: data.message,
        system: true,
      };
      setChatMessages((prev) => [...prev, chatMessage]);
    }

    duel.ygo.events.on("chat-message", handler);
    duel.events.on("system-chat-message", systemHandler);
    return () => {
      duel.ygo.events.off("chat-message", handler);
      duel.events.off("system-chat-message", systemHandler);
    };
  }, [duel]);

  useEffect(() => {
    if (shouldAutoScroll.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  let prevUser = "";
  return (
    <div className="ygo-chat-container">
      <div className="ygo-chat-messages" ref={messagesContainerRef}>
        {chatMessages.map((msg) => {

          if (msg.system) {
            prevUser = "";
            return <div className="ygo-schat-message">{msg.message}</div>
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

      <form className="ygo-chat-input" onSubmit={submitMessage}>
        <YGOTextArea className="ygo-single-line" ref={textareaRef} onKeyDown={(e: any) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            sendMessage();
          }
        }} value={message} onChange={handleChange} />
      </form>
    </div>
  );
}
