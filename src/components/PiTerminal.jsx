import React, { useState, useEffect, useRef, useCallback } from "react";

const PiSession = ({ onExit }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streamText, setStreamText] = useState("");
  const [status, setStatus] = useState("idle");
  const [currentTool, setCurrentTool] = useState(null);
  const [toolOutput, setToolOutput] = useState("");
  const [modelInfo, setModelInfo] = useState(null);
  const [pendingQueue, setPendingQueue] = useState({ steering: [], followUp: [] });
  const procRef = useRef(null);
  const bufferRef = useRef("");
  const streamTextRef = useRef("");
  const inputRef = useRef(null);
  const messageLogRef = useRef(null);

  const appendMessage = useCallback((role, text, type = "text") => {
    setMessages((prev) => [...prev, { role, text, type, id: Date.now() + Math.random() }]);
  }, []);

  const sendCommand = useCallback((cmd) => {
    if (procRef.current && procRef.current.stdin) {
      procRef.current.stdin.write(JSON.stringify(cmd) + "\n");
    }
  }, []);

  useEffect(() => {
    setStatus("ready");
    appendMessage("SYS", "PI_TERMINAL: Ready. Configure PI_RPC_URL to connect.", "system");
  }, []);

  const handleSend = (e) => {
    if (e.key !== "Enter" || !input.trim()) return;
    const text = input.trim();
    setInput("");
    appendMessage("user", text, "text");
    setStreamText("thinking...");
  };

  const handleAbort = () => {
    sendCommand({ type: "abort" });
    setStatus("ready");
    setStreamText("");
  };

  const handleNewSession = () => {
    sendCommand({ type: "new_session" });
    setMessages([]);
    setStreamText("");
    streamTextRef.current = "";
  };

  useEffect(() => {
    if (messageLogRef.current) {
      messageLogRef.current.scrollTop = messageLogRef.current.scrollHeight;
    }
  }, [messages, streamText]);

  const statusColor = status === "ready" ? "#00ff00" : status === "thinking" ? "#ffaa00" : status === "error" ? "#ff5555" : "#888888";
  const statusLabel = status === "idle" ? "PI_INIT" : status === "starting" ? "LAUNCHING" : status === "ready" ? "READY" : status === "thinking" ? "RUNNING" : status === "exited" ? "EXITED" : "ERR";

  const displayModel = modelInfo?.id || null;

  return (
    <div className="flex flex-col h-full bg-black text-green-400 font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-gray-950">
        <div className="flex items-center gap-3">
          <span style={{ color: statusColor }}>●</span>
          <span style={{ color: statusColor }}>PI_TERMINAL</span>
          <span style={{ color: statusColor }}>{statusLabel}</span>
          {displayModel && (
            <span style={{ color: "#00ff00", textShadow: "0 0 6px rgba(0, 255, 0, 0.3)" }}>
              {displayModel}
            </span>
          )}
          {currentTool && (
            <span style={{ color: "#78b8ff" }}>TOOL:{currentTool}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNewSession}
            className="px-2 py-1 bg-gray-800 text-gray-400 border border-gray-700 rounded hover:bg-gray-700"
            style={{ fontSize: "9px" }}
          >
            NEW
          </button>
          <button
            onClick={handleAbort}
            className="px-2 py-1 bg-gray-800 text-red-400 border border-gray-700 rounded hover:bg-gray-700"
            style={{ fontSize: "9px" }}
          >
            ABORT
          </button>
        </div>
      </div>

      <div ref={messageLogRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <span className="text-gray-600 w-12 flex-shrink-0">
                {msg.role === "assistant" ? "AI" : msg.role === "tool" ? "TOOL" : msg.role === "SYS" ? "SYS" : "USER"}
              </span>
              <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>{msg.text}</pre>
            </div>
          </div>
        ))}
        {streamText && (
          <div className="flex items-start gap-2">
            <span className="text-gray-600 w-12 flex-shrink-0">AI</span>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, color: "#aaffaa" }}>{streamText}</pre>
            <span className="cursor-blink text-green-500">█</span>
          </div>
        )}
        {toolOutput && (
          <div className="flex items-start gap-2 ml-4 border-l border-gray-700 pl-2">
            <span className="text-gray-600 w-10 flex-shrink-0">OUT</span>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, color: "#00d4ff", fontSize: "11px" }}>{toolOutput.slice(-500)}</pre>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-gray-800 bg-gray-950">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleSend}
          placeholder="pi > message..."
          className="w-full px-3 py-2 bg-black border border-gray-700 text-green-400 placeholder-gray-600 focus:outline-none focus:border-green-500"
          style={{ fontFamily: "monospace", fontSize: "11px" }}
        />
      </div>
    </div>
  );
};

export default PiSession;