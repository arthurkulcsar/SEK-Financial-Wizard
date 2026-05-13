"use client";

import { useState, useRef, useEffect } from "react";

const SAMPLE_QUESTIONS = [
  "Qual a receita YTD Mar do Chile country vs. budget?",
  "Receita da Cayman & Others YTD Mar",
  "Qual nosso fechamento esperado para 2026?",
  "Como estamos performando este ano?",
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Page() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Check saved auth on mount
  useEffect(() => {
    const saved = sessionStorage.getItem("sek_auth");
    if (saved) {
      setAuthenticated(true);
      setPassword(saved);
    }
  }, []);

  const tryLogin = async () => {
    if (!password) {
      setAuthError("Digite a senha");
      return;
    }
    // Test the password by making a dummy API call
    setAuthError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-password": password,
        },
        body: JSON.stringify({ messages: [{ role: "user", content: "ping" }] }),
      });
      if (res.status === 401) {
        setAuthError("Senha incorreta");
        return;
      }
      setAuthenticated(true);
      sessionStorage.setItem("sek_auth", password);
    } catch (e: any) {
      setAuthError("Erro ao verificar: " + e.message);
    }
  };

  const sendMessage = async (text?: string) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", content: userText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-password": password,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const assistantText = data.text || "Não consegui processar a resposta.";

      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Erro: ${e.message}` },
      ]);
    }
    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderInline = (text: string) => {
    const parts: any[] = [];
    let lastIdx = 0;
    const regex = /\*\*(.+?)\*\*/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIdx) parts.push(text.slice(lastIdx, match.index));
      parts.push(
        <strong key={match.index} style={{ color: "#064e3b", fontWeight: 700 }}>
          {match[1]}
        </strong>
      );
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) parts.push(text.slice(lastIdx));
    return parts.length > 0 ? parts : text;
  };

  const renderMessage = (text: string) => {
    const lines = text.split("\n");
    const elements: any[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (line.trim().startsWith("|") && lines[i + 1]?.includes("---")) {
        const headerLine = line;
        const tableRows: string[] = [];
        i += 2;
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          tableRows.push(lines[i]);
          i++;
        }
        const headers = headerLine.split("|").filter((c) => c.trim());
        elements.push(
          <div key={elements.length} style={{ overflowX: "auto", margin: "14px 0" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.875rem",
                fontFamily: "'IBM Plex Mono', monospace",
                border: "1px solid #d1fae5",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <thead>
                <tr style={{ background: "#ecfdf5", borderBottom: "2px solid #064e3b" }}>
                  {headers.map((h, j) => (
                    <th
                      key={j}
                      style={{
                        padding: "10px 14px",
                        textAlign: j === 0 ? "left" : "right",
                        color: "#064e3b",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {h.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((rowLine, ri) => {
                  const cells = rowLine.split("|").filter((c) => c.trim());
                  return (
                    <tr key={ri} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      {cells.map((cell, ci) => {
                        const val = cell.trim();
                        const isNeg = val.startsWith("(") && val.endsWith(")");
                        return (
                          <td
                            key={ci}
                            style={{
                              padding: "10px 14px",
                              textAlign: ci === 0 ? "left" : "right",
                              color: isNeg ? "#dc2626" : ci === 0 ? "#1f2937" : "#065f46",
                              fontWeight: ci === 0 ? 600 : 500,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      if (line.startsWith("### ")) {
        elements.push(
          <h4 key={elements.length} style={{ fontSize: "0.95rem", fontWeight: 700, color: "#064e3b", margin: "16px 0 8px" }}>
            {line.slice(4)}
          </h4>
        );
      } else if (line.startsWith("## ")) {
        elements.push(
          <h3 key={elements.length} style={{ fontSize: "1.05rem", fontWeight: 700, color: "#064e3b", margin: "18px 0 8px" }}>
            {line.slice(3)}
          </h3>
        );
      } else if (line.startsWith("# ")) {
        elements.push(
          <h2 key={elements.length} style={{ fontSize: "1.15rem", fontWeight: 700, color: "#064e3b", margin: "20px 0 10px" }}>
            {line.slice(2)}
          </h2>
        );
      } else if (line.startsWith("- ") || line.startsWith("• ")) {
        elements.push(
          <div key={elements.length} style={{ display: "flex", gap: 10, margin: "5px 0", color: "#1f2937", paddingLeft: 4 }}>
            <span style={{ color: "#10b981", fontWeight: 700, marginTop: -2 }}>•</span>
            <span style={{ flex: 1, lineHeight: 1.65 }}>{renderInline(line.slice(2))}</span>
          </div>
        );
      } else if (line.trim() === "") {
        elements.push(<div key={elements.length} style={{ height: 8 }} />);
      } else {
        elements.push(
          <p key={elements.length} style={{ margin: "6px 0", color: "#1f2937", lineHeight: 1.7, fontSize: "0.92rem" }}>
            {renderInline(line)}
          </p>
        );
      }
      i++;
    }

    return elements;
  };

  // Login screen
  if (!authenticated) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          padding: 24,
          background: "#ffffff",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 16,
            background: "linear-gradient(135deg, #064e3b 0%, #047857 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ecfdf5",
            fontWeight: 800,
            fontSize: "1.5rem",
            letterSpacing: "-0.02em",
            boxShadow: "0 8px 24px rgba(6, 78, 59, 0.2)",
            marginBottom: 24,
          }}
        >
          SEK
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#064e3b", marginBottom: 8, letterSpacing: "-0.02em" }}>
          Financial Assistant
        </h1>
        <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: 32, textAlign: "center" }}>
          Digite a senha para acessar
        </p>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tryLogin()}
            placeholder="Senha"
            autoFocus
            style={{
              width: "100%",
              padding: "14px 18px",
              border: "1.5px solid #d1fae5",
              borderRadius: 12,
              fontSize: "0.95rem",
              fontFamily: "inherit",
              outline: "none",
              color: "#064e3b",
              background: "#ffffff",
              marginBottom: 12,
            }}
          />
          {authError && (
            <p style={{ color: "#dc2626", fontSize: "0.8rem", marginBottom: 12 }}>{authError}</p>
          )}
          <button
            onClick={tryLogin}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              border: "none",
              background: "linear-gradient(135deg, #064e3b 0%, #047857 100%)",
              color: "#ecfdf5",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }

  // Chat screen
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#ffffff",
        color: "#064e3b",
      }}
    >
      <header
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid #d1fae5",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: "linear-gradient(135deg, #064e3b 0%, #047857 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ecfdf5",
            fontWeight: 800,
            fontSize: "1rem",
            letterSpacing: "-0.02em",
            boxShadow: "0 4px 12px rgba(6, 78, 59, 0.15)",
            flexShrink: 0,
          }}
        >
          SEK
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 700,
              color: "#064e3b",
              letterSpacing: "-0.02em",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Financial Assistant
          </h1>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: "0.72rem",
              color: "#6b7280",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            FY 2026 · LIN · USD · Cutoff Mar/26
          </p>
        </div>
      </header>

      <main style={{ flex: 1, overflowY: "auto", padding: "24px", background: "#ffffff" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", paddingTop: 32 }}>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#064e3b",
                  marginBottom: 10,
                  letterSpacing: "-0.03em",
                }}
              >
                Olá. Como posso ajudar?
              </div>
              <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.65, maxWidth: 520, margin: "0 auto 32px" }}>
                Faça perguntas em linguagem natural sobre receita, EBITDA, COGS, GP, SG&A e bookings.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: 10,
                  maxWidth: 720,
                  margin: "0 auto",
                }}
              >
                {SAMPLE_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(q)}
                    style={{
                      textAlign: "left",
                      padding: "14px 16px",
                      border: "1px solid #d1fae5",
                      borderRadius: 10,
                      background: "#ffffff",
                      color: "#065f46",
                      fontSize: "0.85rem",
                      lineHeight: 1.5,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.18s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#10b981";
                      e.currentTarget.style.background = "#f0fdf4";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#d1fae5";
                      e.currentTarget.style.background = "#ffffff";
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: 20,
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "#10b981",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                {msg.role === "user" ? "Você" : "SEK Assistant"}
              </div>
              <div
                style={{
                  maxWidth: msg.role === "user" ? "82%" : "100%",
                  padding: msg.role === "user" ? "12px 16px" : "16px 18px",
                  borderRadius: 12,
                  background: msg.role === "user" ? "#064e3b" : "#f0fdf4",
                  color: msg.role === "user" ? "#ecfdf5" : "#064e3b",
                  fontSize: "0.9rem",
                  lineHeight: 1.65,
                  border: msg.role === "user" ? "none" : "1px solid #d1fae5",
                }}
              >
                {msg.role === "user" ? msg.content : <div>{renderMessage(msg.content)}</div>}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: "0.68rem",
                  color: "#10b981",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 6,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}
              >
                SEK Assistant
              </div>
              <div
                style={{
                  display: "inline-flex",
                  gap: 6,
                  padding: "16px 20px",
                  background: "#f0fdf4",
                  border: "1px solid #d1fae5",
                  borderRadius: 12,
                }}
              >
                {[0, 1, 2].map((d) => (
                  <div
                    key={d}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#064e3b",
                      animation: `pulse 1.3s ${d * 0.18}s infinite ease-in-out`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer
        style={{
          padding: "14px 24px 20px",
          borderTop: "1px solid #d1fae5",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto",
            display: "flex",
            gap: 10,
            alignItems: "flex-end",
            background: "#ffffff",
            border: "1.5px solid #d1fae5",
            borderRadius: 14,
            padding: "10px 10px 10px 16px",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Pergunte sobre receita, EBITDA, COGS, GP, SG&A, bookings..."
            rows={1}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              resize: "none",
              fontSize: "0.92rem",
              fontFamily: "inherit",
              color: "#064e3b",
              background: "transparent",
              lineHeight: 1.55,
              padding: "6px 0",
              minHeight: 26,
              maxHeight: 120,
            }}
            onInput={(e: any) => {
              e.target.style.height = "26px";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: "none",
              background:
                input.trim() && !loading
                  ? "linear-gradient(135deg, #064e3b 0%, #047857 100%)"
                  : "#e5e7eb",
              color: input.trim() && !loading ? "#ecfdf5" : "#9ca3af",
              cursor: input.trim() && !loading ? "pointer" : "default",
              fontSize: "1.05rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.2s",
            }}
          >
            ↑
          </button>
        </div>
        <p
          style={{
            textAlign: "center",
            fontSize: "0.65rem",
            color: "#9ca3af",
            marginTop: 10,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          v67 · Dados mensais completos · 6 Countries + 8 Entidades
        </p>
      </footer>
    </div>
  );
}
