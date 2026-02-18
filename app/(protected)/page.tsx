"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";

export default function Chat() {
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { messages, sendMessage } = useChat();

  async function handleUpload() {
    if (!file) return;

    setUploading(true);

    const form = new FormData();
    form.append("file", file);

    await fetch("/api/upload", {
      method: "POST",
      body: form,
    });

    setUploading(false);
    alert("Uploaded & embedded");
  }

  return (
    <div className="flex flex-col w-full max-w-xl mx-auto py-10">

      {/* upload */}
      <div className="border p-4 mb-6 rounded">
        <div className="font-bold mb-2">Upload PDF</div>

        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <button
          onClick={handleUpload}
          disabled={uploading}
          className="ml-2 border px-3 py-1"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {/* messages */}
      <div className="space-y-4 mb-24">
        {messages.map((m) => (
          <div key={m.id}>
            <b>{m.role}:</b>{" "}
            {m.parts.map((p, i) =>
              p.type === "text" ? <span key={i}>{p.text}</span> : null
            )}
          </div>
        ))}
      </div>

      {/* chat input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput("");
        }}
      >
        <input
          className="fixed bottom-6 w-full max-w-xl p-3 border rounded"
          value={input}
          placeholder="Ask about your docs..."
          onChange={(e) => setInput(e.target.value)}
        />
      </form>
    </div>
  );
}
