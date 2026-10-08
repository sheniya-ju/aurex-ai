import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { Pin, Trash2 } from "lucide-react";
import ProjectPanel, { Project } from "./components/ProjectPanel";
import SettingsPanel, { AppSettings } from "./components/SettingsPanel";

import logo from "./assets/aurex-logo.png";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const DEFAULT_MODEL = "openai/gpt-oss-20b";

/* =========================================================
   TYPES
========================================================= */

type AuthPage = "login" | "register";

type UserData = {
  id: number;
  name: string;
  email: string;
};

type AuthResponse = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: UserData;
};

type Source = {
  document_id: number;
  filename: string;
  page_number: number;
  chunk: string;
};

type ChatMessage = {
  id?: number;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  sources?: Source[];
};

type Conversation = {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  project_id?: number | null;
  is_pinned?: boolean;
};

type ChatResponse = {
  conversation_id: number;
  message_id: number;
  role: string;
  content: string;
  sources?: Source[];
};

type DocumentItem = {
  id: number;
  filename: string;
  file_type: string;
  file_size: number | null;
  total_pages: number;
  created_at: string;
};

type AppView = "chat" | "projects" | "settings";

/* =========================================================
   AUTHENTICATION TOKEN
========================================================= */

function getAccessToken(): string | null {
  return localStorage.getItem("aurex_token");
}

function getRefreshToken(): string | null {
  return localStorage.getItem("aurex_refresh_token");
}

function clearAuthStorage() {
  localStorage.removeItem("aurex_token");
  localStorage.removeItem("aurex_refresh_token");
  localStorage.removeItem("aurex_user");
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      clearAuthStorage();
      return null;
    }

    const data = await response.json();

    if (!data.access_token) {
      clearAuthStorage();
      return null;
    }

    localStorage.setItem("aurex_token", data.access_token);
    return data.access_token;
  } catch {
    clearAuthStorage();
    return null;
  }
}

async function apiFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  let token = getAccessToken();

  if (!token) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  let response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    token = await refreshAccessToken();

    if (!token) {
      throw new Error("Your session has expired. Please sign in again.");
    }

    const retryHeaders = new Headers(options.headers || {});
    retryHeaders.set("Authorization", `Bearer ${token}`);

    response = await fetch(url, {
      ...options,
      headers: retryHeaders,
    });
  }

  return response;
}

/* =========================================================
   AUTH API
========================================================= */

async function loginUser(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const response =
    await fetch(
      `${API_URL}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      },
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Invalid email or password.",
    );
  }

  return data;
}

async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  const response =
    await fetch(
      `${API_URL}/api/auth/register`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      },
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Unable to create account.",
    );
  }

  return data;
}

/* =========================================================
   CHAT API
========================================================= */

async function sendChatMessage(
  message: string,
  conversationId:
    | number
    | null,
  model: string,
  documentIds: number[],
): Promise<ChatResponse> {
  const response =
    await apiFetch(
      `${API_URL}/api/chat/message`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          message,
          conversation_id:
            conversationId,
          model,
          document_ids: documentIds,
        }),
      },
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Unable to get a response from AUREX AI.",
    );
  }

  return data;
}

async function streamChatMessage(
  message: string,
  conversationId: number | null,
  model: string,
  documentIds: number[],
  projectId: number | null,
  signal: AbortSignal,
  onStart: (data: any) => void,
  onToken: (token: string) => void,
  onDone: () => void,
): Promise<void> {
  const response = await apiFetch(`${API_URL}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      model,
      document_ids: documentIds,
      project_id: projectId,
    }),
    signal,
  });
  if (!response.ok || !response.body) {
    let detail = "Unable to start streaming response.";
    try { const data = await response.json(); detail = data.detail || detail; } catch {}
    throw new Error(detail);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";
    for (const event of events) {
      const line = event.split("\n").find((item) => item.startsWith("data: "));
      if (!line) continue;
      const data = JSON.parse(line.slice(6));
      if (data.type === "start") onStart(data);
      else if (data.type === "token") onToken(data.content);
      else if (data.type === "error") throw new Error(data.message || "AI streaming failed.");
      else if (data.type === "done") onDone();
    }
    if (done) break;
  }
}

async function fetchConversations(
  projectId: number | null = null,
): Promise<Conversation[]> {
  const response =
    await apiFetch(
      `${API_URL}/api/chat/conversations${
        projectId ? `?project_id=${projectId}` : ""
      }`,
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Unable to load conversations.",
    );
  }

  return data;
}

async function fetchConversationMessages(
  conversationId: number,
): Promise<ChatMessage[]> {
  const response =
    await apiFetch(
      `${API_URL}/api/chat/conversations/${conversationId}/messages`,
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Unable to load conversation.",
    );
  }

  return data;
}

async function togglePinConversation(
  conversationId: number,
): Promise<boolean> {
  const response = await apiFetch(
    `${API_URL}/api/chat/conversations/${conversationId}/pin`,
    { method: "PATCH" },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || "Unable to pin chat.",
    );
  }

  return Boolean(data.is_pinned);
}

async function deleteConversation(
  conversationId: number,
): Promise<void> {
  const response =
    await apiFetch(
      `${API_URL}/api/chat/conversations/${conversationId}`,
      { method: "DELETE" },
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Unable to delete conversation.",
    );
  }
}

/* =========================================================
   DOCUMENT API
========================================================= */

async function fetchDocuments(): Promise<
  DocumentItem[]
> {
  const response =
    await apiFetch(
      `${API_URL}/api/documents`,
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Unable to load documents.",
    );
  }

  return data;
}

async function uploadDocument(
  file: File,
): Promise<DocumentItem> {
  const formData =
    new FormData();

  formData.append(
    "file",
    file,
  );

  const response =
    await apiFetch(
      `${API_URL}/api/documents/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Unable to upload PDF.",
    );
  }

  return data;
}

async function deleteDocument(
  documentId: number,
): Promise<void> {
  const response =
    await apiFetch(
      `${API_URL}/api/documents/${documentId}`,
      { method: "DELETE" },
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail ||
        "Unable to delete document.",
    );
  }
}

async function fetchProjects(): Promise<Project[]> {
  const response = await apiFetch(`${API_URL}/api/projects`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Unable to load projects.");
  return data;
}

async function createProjectApi(name: string, description: string, instructions: string) {
  const response = await apiFetch(`${API_URL}/api/projects`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, instructions }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Unable to create project.");
  return data as Project;
}

async function updateProjectApi(id: number, name: string, description: string, instructions: string) {
  const response = await apiFetch(`${API_URL}/api/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, instructions }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Unable to update project.");
  return data as Project;
}

async function deleteProjectApi(id: number) {
  const response = await apiFetch(`${API_URL}/api/projects/${id}`, { method: "DELETE" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Unable to delete project.");
}

async function attachProjectDocument(projectId: number, documentId: number, detach = false) {
  const response = await apiFetch(`${API_URL}/api/projects/${projectId}/documents/${documentId}`, { method: detach ? "DELETE" : "POST" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Unable to update project file.");
}

async function fetchSettings(): Promise<AppSettings> {
  const response = await apiFetch(`${API_URL}/api/settings`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Unable to load settings.");
  return data;
}

async function updateSettingsApi(settings: AppSettings): Promise<AppSettings> {
  const response = await apiFetch(`${API_URL}/api/settings`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Unable to save settings.");
  return data;
}

async function clearChatsApi() {
  const response = await apiFetch(`${API_URL}/api/settings/chats`, { method: "DELETE" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Unable to clear chat history.");
}

/* =========================================================
   INLINE MARKDOWN
========================================================= */

function renderInlineText(
  text: string,
): ReactNode[] {
  const parts =
    text.split(
      /(\*\*[^*]+\*\*|`[^`]+`)/g,
    );

  return parts.map(
    (part, index) => {
      if (
        part.startsWith(
          "**",
        ) &&
        part.endsWith(
          "**",
        )
      ) {
        return (
          <strong
            key={index}
          >
            {part.slice(
              2,
              -2,
            )}
          </strong>
        );
      }

      if (
        part.startsWith(
          "`",
        ) &&
        part.endsWith(
          "`",
        )
      ) {
        return (
          <code
            key={index}
            className="inline-code"
          >
            {part.slice(
              1,
              -1,
            )}
          </code>
        );
      }

      return (
        <span key={index}>
          {part}
        </span>
      );
    },
  );
}

/* =========================================================
   MARKDOWN MESSAGE
========================================================= */

function MessageContent({
  content,
}: {
  content: string;
}) {
  const [
    copiedCode,
    setCopiedCode,
  ] =
    useState<
      number | null
    >(null);

  const lines =
    content.split("\n");

  const elements: ReactNode[] =
    [];

  let insideCodeBlock =
    false;

  let codeLines: string[] =
    [];

  let codeLanguage = "";

  let codeIndex = 0;

  let insideTable =
    false;

  let tableRows: string[][] =
    [];

  /* -------------------------------------------------------
     TABLE PARSER
  ------------------------------------------------------- */

  function parseTableRow(
    line: string,
  ): string[] {
    return line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) =>
        cell.trim(),
      );
  }

  function isTableSeparator(
    line: string,
  ): boolean {
    const cells =
      parseTableRow(line);

    return (
      cells.length > 0 &&
      cells.every((cell) =>
        /^:?-{3,}:?$/.test(
          cell,
        ),
      )
    );
  }

  function flushTable() {
    if (
      tableRows.length === 0
    ) {
      tableRows = [];

      insideTable = false;

      return;
    }

    const headers =
      tableRows[0];

    const body =
      tableRows.slice(1);

    elements.push(
      <div
        className="markdown-table-wrapper"
        key={`table-${elements.length}`}
      >
        <table className="markdown-table">
          <thead>
            <tr>
              {headers.map(
                (
                  header,
                  index,
                ) => (
                  <th
                    key={
                      index
                    }
                  >
                    {renderInlineText(
                      header,
                    )}
                  </th>
                ),
              )}
            </tr>
          </thead>

          <tbody>
            {body.map(
              (
                row,
                rowIndex,
              ) => (
                <tr
                  key={
                    rowIndex
                  }
                >
                  {headers.map(
                    (
                      _,
                      cellIndex,
                    ) => (
                      <td
                        key={
                          cellIndex
                        }
                      >
                        {renderInlineText(
                          row[
                            cellIndex
                          ] ||
                            "",
                        )}
                      </td>
                    ),
                  )}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>,
    );

    tableRows = [];

    insideTable = false;
  }

  /* -------------------------------------------------------
     COPY CODE
  ------------------------------------------------------- */

  async function copyCode(
    code: string,
    index: number,
  ) {
    try {
      await navigator.clipboard.writeText(
        code,
      );

      setCopiedCode(
        index,
      );

      window.setTimeout(
        () => {
          setCopiedCode(
            null,
          );
        },
        1800,
      );
    } catch {
      // Clipboard unavailable.
    }
  }

  /* -------------------------------------------------------
     PARSE LINES
  ------------------------------------------------------- */

  lines.forEach(
    (line, index) => {
      const trimmed =
        line.trim();

      const nextLine =
        lines[
          index + 1
        ]?.trim() || "";

      /* ===================================================
         FENCED CODE / MARKDOWN BLOCK
      =================================================== */

      if (
        trimmed.startsWith(
          "```",
        )
      ) {
        /*
         * OPENING FENCE
         */

        if (
          !insideCodeBlock
        ) {
          if (insideTable) {
            flushTable();
          }

          insideCodeBlock =
            true;

          codeLines = [];

          codeLanguage =
            trimmed
              .replace(
                "```",
                "",
              )
              .trim()
              .toLowerCase();

          /*
           * Markdown is NOT treated
           * as a programming code block.
           *
           * GPT-OSS may produce:
           *
           * ```markdown
           * | A | B |
           * |---|---|
           * | X | Y |
           * ```
           *
           * We collect it and render it
           * as actual Markdown later.
           */

          if (
            codeLanguage !==
              "markdown" &&
            codeLanguage !==
              "md"
          ) {
            codeIndex += 1;
          }

          return;
        }

        /*
         * CLOSING FENCE
         */

        if (
          insideCodeBlock
        ) {
          insideCodeBlock =
            false;

          const code =
            codeLines.join(
              "\n",
            );

          /*
           * MARKDOWN FENCE
           */

          if (
            codeLanguage ===
              "markdown" ||
            codeLanguage ===
              "md"
          ) {
            /*
             * Parse the inner Markdown
             * as Markdown rather than
             * displaying raw pipes.
             */

            elements.push(
              <MessageContent
                key={`markdown-${index}`}
                content={
                  code
                }
              />,
            );

            codeLines = [];

            codeLanguage = "";

            return;
          }

          /*
           * NORMAL CODE BLOCK
           */

          const currentCodeIndex =
            codeIndex;

          elements.push(
            <div
              className="code-block-wrapper"
              key={`code-${index}`}
            >
              <div className="code-block-header">
                <span>
                  {codeLanguage ||
                    "code"}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    copyCode(
                      code,
                      currentCodeIndex,
                    )
                  }
                >
                  {copiedCode ===
                  currentCodeIndex
                    ? "✓ Copied"
                    : "Copy"}
                </button>
              </div>

              <pre className="message-code-block">
                <code>
                  {code}
                </code>
              </pre>
            </div>,
          );

          codeLines = [];

          codeLanguage = "";

          return;
        }
      }

      /*
       * COLLECT FENCED CONTENT
       */

      if (
        insideCodeBlock
      ) {
        codeLines.push(
          line,
        );

        return;
      }

      /* ===================================================
         TABLE DETECTION
      =================================================== */

      /* ===================================================
   TABLE DETECTION
=================================================== */

const looksLikeTable =
  trimmed.includes("|") &&
  trimmed.split("|").length >= 3;

/*
 * HEADER + SEPARATOR
 *
 * | Domain | Risk |
 * |--------|------|
 */

if (
  !insideTable &&
  looksLikeTable &&
  isTableSeparator(nextLine)
) {
  insideTable = true;

  tableRows.push(
    parseTableRow(line),
  );

  return;
}

/*
 * CONTINUE TABLE
 */

if (insideTable) {
  /*
   * The separator line belongs to the table.
   * Do NOT flush the table here.
   */
  if (isTableSeparator(trimmed)) {
    return;
  }

  /*
   * Normal table row
   */
  if (looksLikeTable) {
    tableRows.push(
      parseTableRow(line),
    );

    return;
  }

  /*
   * Anything that is not a table row
   * means the table has ended.
   */
  flushTable();
}

      /* ===================================================
         HEADINGS
      =================================================== */

      if (
        trimmed.startsWith(
          "### ",
        )
      ) {
        elements.push(
          <h3
            className="message-heading"
            key={index}
          >
            {renderInlineText(
              trimmed.slice(
                4,
              ),
            )}
          </h3>,
        );

        return;
      }

      if (
        trimmed.startsWith(
          "## ",
        )
      ) {
        elements.push(
          <h2
            className="message-heading"
            key={index}
          >
            {renderInlineText(
              trimmed.slice(
                3,
              ),
            )}
          </h2>,
        );

        return;
      }

      if (
        trimmed.startsWith(
          "# ",
        )
      ) {
        elements.push(
          <h1
            className="message-heading"
            key={index}
          >
            {renderInlineText(
              trimmed.slice(
                2,
              ),
            )}
          </h1>,
        );

        return;
      }

      /* ===================================================
         BULLET LIST
      =================================================== */

      if (
        trimmed.startsWith(
          "- ",
        ) ||
        trimmed.startsWith(
          "* ",
        )
      ) {
        elements.push(
          <div
            className="message-list-item"
            key={index}
          >
            <span className="bullet">
              •
            </span>

            <span>
              {renderInlineText(
                trimmed.slice(
                  2,
                ),
              )}
            </span>
          </div>,
        );

        return;
      }

      /* ===================================================
         NUMBERED LIST
      =================================================== */

      if (
        /^\d+\.\s/.test(
          trimmed,
        )
      ) {
        const number =
          trimmed.match(
            /^\d+/,
          )?.[0] || "";

        const text =
          trimmed.replace(
            /^\d+\.\s/,
            "",
          );

        elements.push(
          <div
            className="message-list-item"
            key={index}
          >
            <span className="number-bullet">
              {number}.
            </span>

            <span>
              {renderInlineText(
                text,
              )}
            </span>
          </div>,
        );

        return;
      }

      /* ===================================================
         EMPTY LINE
      =================================================== */

      if (!trimmed) {
        elements.push(
          <div
            className="message-space"
            key={index}
          />,
        );

        return;
      }

      /* ===================================================
         NORMAL TEXT
      =================================================== */

      elements.push(
        <div
          className="message-line"
          key={index}
        >
          {renderInlineText(
            line,
          )}
        </div>,
      );
    },
  );

  /* =======================================================
     CLOSE OPEN TABLE
  ======================================================= */

  if (insideTable) {
    flushTable();
  }

  /* =======================================================
     UNFINISHED CODE BLOCK
  ======================================================= */

  if (
    insideCodeBlock &&
    codeLines.length > 0
  ) {
    const code =
      codeLines.join(
        "\n",
      );

    /*
     * If the response somehow ends without
     * a closing ``` and it is Markdown,
     * render it as Markdown.
     */

    if (
      codeLanguage ===
        "markdown" ||
      codeLanguage === "md"
    ) {
      elements.push(
        <MessageContent
          key="unfinished-markdown"
          content={code}
        />,
      );
    } else {
      elements.push(
        <div
          className="code-block-wrapper"
          key="unfinished-code"
        >
          <div className="code-block-header">
            <span>
              {codeLanguage ||
                "code"}
            </span>

            <button
              type="button"
              onClick={() =>
                copyCode(
                  code,
                  codeIndex,
                )
              }
            >
              {copiedCode ===
              codeIndex
                ? "✓ Copied"
                : "Copy"}
            </button>
          </div>

          <pre className="message-code-block">
            <code>
              {code}
            </code>
          </pre>
        </div>,
      );
    }
  }

  return (
    <div className="message-content">
      {elements}
    </div>
  );
}

/* =========================================================
   SOURCE PANEL
========================================================= */

function SourcePanel({
  sources,
}: {
  sources: Source[];
}) {
  const [open, setOpen] =
    useState(false);

  const [
    selectedSource,
    setSelectedSource,
  ] =
    useState<Source | null>(
      null,
    );

  if (
    !sources ||
    sources.length === 0
  ) {
    return null;
  }

  return (
    <div className="source-panel">
      <button
        type="button"
        className="source-toggle"
        onClick={() =>
          setOpen(
            (value) =>
              !value,
          )
        }
      >
        <span>
          ◈{" "}
          {sources.length}{" "}
          source
          {sources.length !==
          1
            ? "s"
            : ""}
        </span>

        <span>
          {open ? "⌃" : "⌄"}
        </span>
      </button>

      {open && (
        <div className="source-list">
          {sources.map(
            (
              source,
              index,
            ) => (
              <div
                className="source-card"
                key={`${source.document_id}-${source.page_number}-${index}`}
              >
                <div className="source-card-top">
                  <div className="source-file">
                    <span className="pdf-icon">
                      PDF
                    </span>

                    <div>
                      <strong>
                        {
                          source.filename
                        }
                      </strong>

                      <span>
                        Page{" "}
                        {
                          source.page_number
                        }
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="view-excerpt-button"
                    onClick={() =>
                      setSelectedSource(
                        source,
                      )
                    }
                  >
                    View excerpt
                  </button>
                </div>

                {selectedSource ===
                  source && (
                  <div className="source-excerpt">
                    <div className="excerpt-header">
                      <span>
                        Page{" "}
                        {
                          source.page_number
                        }
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedSource(
                            null,
                          )
                        }
                      >
                        ×
                      </button>
                    </div>

                    <p>
                      {
                        source.chunk
                      }
                    </p>
                  </div>
                )}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   DOCUMENT CHIPS
========================================================= */

function DocumentChips({
  documents,
  selectedDocumentIds,
  uploading,
  onUpload,
  onRemove,
}: {
  documents: DocumentItem[];
  selectedDocumentIds: number[];
  uploading: boolean;
  onUpload: (
    file: File,
  ) => Promise<void>;
  onRemove: (
    documentId: number,
  ) => void;
}) {
  const fileInputRef =
    useRef<HTMLInputElement>(
      null,
    );

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    await onUpload(file);
  }

  const selectedDocuments =
    documents.filter((document) =>
      selectedDocumentIds.includes(
        document.id,
      ),
    );

  return (
    <div className="composer-documents">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        hidden
        onChange={
          handleFileChange
        }
      />

      <button
        type="button"
        className="composer-attach"
        onClick={
          openFilePicker
        }
        disabled={
          uploading
        }
        title="Attach PDF"
      >
        {uploading
          ? "…"
          : "+"}
      </button>

      {selectedDocuments.map(
        (document) => (
          <div
            className="attached-document"
            key={document.id}
            title={
              document.filename
            }
          >
            <span className="attached-document-icon">
              PDF
            </span>

            <span className="attached-document-name">
              {
                document.filename
              }
            </span>

            <span className="attached-document-pages">
              {
                document.total_pages
              }
              p
            </span>

            <button
              type="button"
              className="attached-document-delete"
              onClick={() =>
                onRemove(
                  document.id,
                )
              }
              title={`Remove ${document.filename} from this chat`}
              aria-label={`Remove ${document.filename} from this chat`}
            >
              ×
            </button>
          </div>
        ),
      )}
    </div>
  );
}

/* =========================================================
   AUTH SCREEN
========================================================= */

function AuthScreen({
  page,
  setPage,
  onLogin,
  onRegister,
}: {
  page: AuthPage;
  setPage: (
    page: AuthPage,
  ) => void;
  onLogin: (
    email: string,
    password: string,
  ) => Promise<void>;
  onRegister: (
    name: string,
    email: string,
    password: string,
  ) => Promise<void>;
}) {
  const isLogin =
    page === "login";

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setError("");

    setLoading(true);

    try {
      if (isLogin) {
        await onLogin(
          email,
          password,
        );
      } else {
        await onRegister(
          name,
          email,
          password,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-glow glow-one" />

      <div className="auth-glow glow-two" />

      <div className="auth-brand">
        <img
          src={logo}
          alt="AUREX AI"
        />

        <strong>
          AUREX
        </strong>

        <span>AI</span>
      </div>

      <section className="auth-card">
        <div className="auth-heading">
          <div className="mobile-logo">
            <img
              src={logo}
              alt="AUREX AI"
            />
          </div>

          <h1>
            {isLogin
              ? "Welcome back"
              : "Create your account"}
          </h1>

          <p>
            {isLogin
              ? "Sign in to continue to AUREX AI."
              : "Start your AI workspace with AUREX AI."}
          </p>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form
          onSubmit={
            handleSubmit
          }
        >
          {!isLogin && (
            <label>
              Full name

              <input
                type="text"
                value={name}
                onChange={(
                  event,
                ) =>
                  setName(
                    event.target
                      .value,
                  )
                }
                placeholder="Enter your name"
                required
              />
            </label>
          )}

          <label>
            Email

            <input
              type="email"
              value={email}
              onChange={(
                event,
              ) =>
                setEmail(
                  event.target
                    .value,
                )
              }
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password

            <div className="password-wrap">
              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(
                  event,
                ) =>
                  setPassword(
                    event.target
                      .value,
                  )
                }
                placeholder="Enter your password"
                minLength={6}
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (
                      value,
                    ) =>
                      !value,
                  )
                }
              >
                {showPassword
                  ? "◉"
                  : "○"}
              </button>
            </div>
          </label>

          {!isLogin && (
            <label className="check terms">
              <input
                type="checkbox"
                required
              />

              <span>
                I agree to the
                terms and privacy
                policy.
              </span>
            </label>
          )}

          <button
            className="primary-button"
            type="submit"
            disabled={
              loading
            }
          >
            {loading
              ? "Please wait..."
              : isLogin
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <div className="switch-text">
          {isLogin
            ? "Don't have an account?"
            : "Already have an account?"}

          <button
            className="link-button strong"
            type="button"
            onClick={() => {
              setError("");

              setPage(
                isLogin
                  ? "register"
                  : "login",
              );
            }}
          >
            {isLogin
              ? " Create one"
              : " Sign in"}
          </button>
        </div>
      </section>

      <footer>
        © 2026 AUREX AI.
        Intelligence, unified.
      </footer>
    </main>
  );
}

/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar({
  user,
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onTogglePin,
  onLogout,
  mobileOpen,
  setMobileOpen,
  activeView,
  onViewChange,
}: {
  user: UserData;
  conversations: Conversation[];
  activeConversationId:
    | number
    | null;
  onNewChat: () => void;
  onSelectConversation: (
    id: number,
  ) => void;
  onDeleteConversation: (
    id: number,
  ) => void;
  onTogglePin: (id: number) => void;
  onLogout: () => void;
  mobileOpen: boolean;
  setMobileOpen: (
    value: boolean,
  ) => void;
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}) {
  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() =>
            setMobileOpen(
              false,
            )
          }
        />
      )}

      <aside
        className={`sidebar ${
          mobileOpen
            ? "sidebar-open"
            : ""
        }`}
      >
        <div className="brand-small">
          <img
            src={logo}
            alt="AUREX AI"
          />

          <span>
            AUREX{" "}
            <b>AI</b>
          </span>

          <button
            className="mobile-close"
            type="button"
            onClick={() =>
              setMobileOpen(
                false,
              )
            }
          >
            ×
          </button>
        </div>

        <button
          className="new-chat"
          type="button"
          onClick={() => {
            onNewChat();

            setMobileOpen(
              false,
            );
          }}
        >
          <span className="button-icon">
            +
          </span>

          <span>
            New chat
          </span>
        </button>

        <nav>
          <button
            type="button"
            className={`nav-item ${activeView === "chat" ? "active" : ""}`}
            onClick={() => onViewChange("chat")}
          >
            <span className="nav-icon">
              ⌂
            </span>

            <span>
              Chat
            </span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeView === "projects" ? "active" : ""}`}
            onClick={() => onViewChange("projects")}
          >
            <span className="nav-icon">
              ▣
            </span>

            <span>
              Projects
            </span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeView === "settings" ? "active" : ""}`}
            onClick={() => onViewChange("settings")}
          >
            <span className="nav-icon">
              ⚙
            </span>

            <span>
              Settings
            </span>
          </button>
        </nav>

        <div className="recent">
          {(() => {
            const pinnedConversations = conversations
              .filter((conversation) => Boolean(conversation.is_pinned))
              .sort(
                (a, b) =>
                  new Date(b.updated_at).getTime() -
                  new Date(a.updated_at).getTime(),
              );

            const recentConversations = conversations
              .filter((conversation) => !conversation.is_pinned)
              .sort(
                (a, b) =>
                  new Date(b.updated_at).getTime() -
                  new Date(a.updated_at).getTime(),
              );

            const renderConversation = (conversation: Conversation) => (
                  <div
                    key={
                      conversation.id
                    }
                    className={`recent-chat ${
                      activeConversationId ===
                      conversation.id
                        ? "selected"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="recent-chat-main"
                      onClick={() => {
                        onSelectConversation(
                          conversation.id,
                        );

                        setMobileOpen(
                          false,
                        );
                      }}
                      title={
                        conversation.title
                      }
                    >
                      <span>
                        ◌
                      </span>

                      <span>
                        {
                          conversation.title
                        }
                      </span>
                    </button>

                    <button
                      type="button"
                      className={`recent-chat-pin ${conversation.is_pinned ? "pinned" : ""}`}
                      title={conversation.is_pinned ? "Unpin chat" : "Pin chat"}
                      aria-label={conversation.is_pinned ? "Unpin chat" : "Pin chat"}
                      onClick={(event) => {
                        event.stopPropagation();
                        onTogglePin(conversation.id);
                      }}
                    >
                      <Pin
                        size={14}
                        fill={conversation.is_pinned ? "currentColor" : "none"}
                      />
                    </button>

                    <button
                      type="button"
                      className="recent-chat-menu"
                      title="Delete chat"
                      aria-label="Delete chat"
                      onClick={(
                        event,
                      ) => {
                        event.stopPropagation();

                        onDeleteConversation(
                          conversation.id,
                        );
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
            );

            return (
              <>
                {pinnedConversations.length > 0 && (
                  <>
                    <p>Pinned chats</p>
                    {pinnedConversations.slice(0, 12).map(renderConversation)}
                  </>
                )}

                <p>Recent chats</p>
                {recentConversations.length === 0 ? (
                  <div className="empty-recent">
                    {pinnedConversations.length > 0
                      ? "No recent conversations"
                      : "No conversations yet"}
                  </div>
                ) : (
                  recentConversations.slice(0, 12).map(renderConversation)
                )}
              </>
            );
          })()}
        </div>

        <div className="sidebar-bottom">
          <div className="user-profile">
            <div className="avatar">
              {user.name
                .charAt(
                  0,
                )
                .toUpperCase()}
            </div>

            <div className="user-info">
              <strong>
                {user.name}
              </strong>

              <span>
                {user.email}
              </span>
            </div>
          </div>

          <button
            className="logout-button"
            type="button"
            onClick={
              onLogout
            }
          >
            <span>
              ↪
            </span>

            <span>
              Logout
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}

/* =========================================================
   CHAT PAGE
========================================================= */

function ChatPage({
  user,
  onLogout,
}: {
  user: UserData;
  onLogout: () => void;
}) {
  const [activeView, setActiveView] = useState<AppView>("chat");
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [settings, setSettings] = useState<AppSettings>({ theme: "system", model: DEFAULT_MODEL, enter_to_send: true, show_sources: true, auto_scroll: true });
  const abortControllerRef = useRef<AbortController | null>(null);
  const [
    messages,
    setMessages,
  ] =
    useState<
      ChatMessage[]
    >([]);

  const [
    conversations,
    setConversations,
  ] =
    useState<
      Conversation[]
    >([]);

  const [
    activeConversationId,
    setActiveConversationId,
  ] =
    useState<
      number | null
    >(null);

  const [
    selectedModel,
    setSelectedModel,
  ] = useState(
    DEFAULT_MODEL,
  );

  const [
    documents,
    setDocuments,
  ] =
    useState<
      DocumentItem[]
    >([]);

  const [
    selectedDocumentIds,
    setSelectedDocumentIds,
  ] = useState<number[]>(
    [],
  );

  const [input, setInput] =
    useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    loadingHistory,
    setLoadingHistory,
  ] = useState(false);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  const [
    replyingTo,
    setReplyingTo,
  ] =
    useState<
      ChatMessage | null
    >(null);

  const messagesEndRef =
    useRef<HTMLDivElement>(
      null,
    );

  const inputRef =
    useRef<HTMLTextAreaElement>(
      null,
    );

  /* =======================================================
     LOAD CONVERSATIONS
  ======================================================= */

  async function loadConversations() {
    try {
      const data =
        await fetchConversations(activeProjectId);

      setConversations(
        data,
      );
    } catch (err) {
      console.error(err);
    }
  }

  /* =======================================================
     LOAD DOCUMENTS
  ======================================================= */

  async function loadDocuments() {
    try {
      const data =
        await fetchDocuments();

      setDocuments(
        data,
      );
    } catch (err) {
      console.error(err);
    }
  }

  async function loadProjects() {
    try { setProjects(await fetchProjects()); } catch (err) { console.error(err); }
  }

  async function loadUserSettings() {
    try {
      const data = await fetchSettings();
      setSettings(data);
      setSelectedModel(data.model);
      applyTheme(data.theme);
    } catch (err) { console.error(err); }
  }

  function applyTheme(theme: string) {
    const root = document.documentElement;
    const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.dataset.theme = dark ? "dark" : "light";
  }

  useEffect(() => {
    loadConversations();
    loadDocuments();
    loadProjects();
    loadUserSettings();
  }, []);

  useEffect(() => { applyTheme(settings.theme); }, [settings.theme]);

  useEffect(() => {
    loadConversations();
  }, [activeProjectId]);

  /* =======================================================
     AUTO SCROLL
  ======================================================= */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      },
    );
  }, [
    messages,
    loading,
  ]);

  /* =======================================================
     NEW CHAT
  ======================================================= */

  function handleNewChat() {
    setMessages([]);

    setActiveConversationId(
      null,
    );

    setInput("");

    setSelectedDocumentIds([]);

    setError("");

    setReplyingTo(
      null,
    );

    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }

  /* =======================================================
     SELECT CONVERSATION
  ======================================================= */

  async function handleSelectConversation(
    id: number,
  ) {
    setLoadingHistory(
      true,
    );

    setError("");

    setActiveConversationId(
      id,
    );

    try {
      const data =
        await fetchConversationMessages(
          id,
        );

      setMessages(
        data,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load this conversation.",
      );
    } finally {
      setLoadingHistory(
        false,
      );
    }
  }

  /* =======================================================
     DELETE CONVERSATION
  ======================================================= */

  async function handleTogglePin(id: number) {
    try {
      const isPinned = await togglePinConversation(id);

      setConversations((previous) =>
        previous.map((item) =>
          item.id === id
            ? { ...item, is_pinned: isPinned }
            : item,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to pin chat.",
      );
    }
  }

  async function handleDeleteConversation(
    id: number,
  ) {
    const conversation =
      conversations.find(
        (item) =>
          item.id === id,
      );

    const confirmed =
      window.confirm(
        `Delete "${conversation?.title || "this chat"}"?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deleteConversation(
        id,
      );

      setConversations(
        (previous) =>
          previous.filter(
            (item) =>
              item.id !== id,
          ),
      );

      if (
        activeConversationId ===
        id
      ) {
        setActiveConversationId(
          null,
        );

        setMessages([]);

        setInput("");

        setReplyingTo(
          null,
        );

        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete chat.",
      );
    }
  }

  /* =======================================================
     UPLOAD PDF
  ======================================================= */

  async function handleUpload(
    file: File,
  ) {
    if (!file) {
      return;
    }

    const isPdf =
      file.type ===
        "application/pdf" ||
      file.name
        .toLowerCase()
        .endsWith(".pdf");

    if (!isPdf) {
      setError(
        "Only PDF files are supported.",
      );

      return;
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      setError(
        "PDF must be smaller than 10 MB.",
      );

      return;
    }

    setError("");

    setUploading(true);

    try {
      const document =
        await uploadDocument(
          file,
        );

      setDocuments(
        (previous) => [
          document,
          ...previous.filter(
            (item) =>
              item.id !==
              document.id,
          ),
        ],
      );

      // Automatically attach the newly
      // uploaded PDF to the composer.
      setSelectedDocumentIds(
        (previous) =>
          previous.includes(
            document.id,
          )
            ? previous
            : [
                ...previous,
                document.id,
              ],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload PDF.",
      );
    } finally {
      setUploading(false);
    }
  }

  /* =======================================================
     DELETE PDF
  ======================================================= */

  async function handleDeleteDocument(
    documentId: number,
  ) {
    const document =
      documents.find(
        (item) =>
          item.id ===
          documentId,
      );

    const confirmed =
      window.confirm(
        `Delete "${document?.filename || "this PDF"}"? Its document sources will no longer be available.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await deleteDocument(
        documentId,
      );

      setDocuments(
        (previous) =>
          previous.filter(
            (item) =>
              item.id !==
              documentId,
          ),
      );

      setSelectedDocumentIds(
        (previous) =>
          previous.filter(
            (id) =>
              id !==
              documentId,
          ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete PDF.",
      );
    }
  }

  /* =======================================================
     REMOVE PDF FROM CURRENT CHAT
  ======================================================= */

  function handleRemoveSelectedDocument(
    documentId: number,
  ) {
    setSelectedDocumentIds(
      (previous) =>
        previous.filter(
          (id) =>
            id !==
            documentId,
        ),
    );
  }

  /* =======================================================
     COPY MESSAGE
  ======================================================= */

  async function handleCopyMessage(
    content: string,
  ) {
    try {
      await navigator.clipboard.writeText(
        content,
      );
    } catch {
      setError(
        "Unable to copy this message.",
      );
    }
  }

  /* =======================================================
     REPLY
  ======================================================= */

  function handleReply(
    message: ChatMessage,
  ) {
    setReplyingTo(
      message,
    );

    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }

  /* =======================================================
     VIEW SOURCES
  ======================================================= */

  function handleViewSources(
    messageId:
      | number
      | undefined,
  ) {
    if (
      messageId ===
      undefined
    ) {
      return;
    }

    document
      .getElementById(
        `sources-${messageId}`,
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
  }

  async function handleCreateProject(
  name: string,
  description: string,
  instructions: string,
) {
  try {
    setError("");

    const project = await createProjectApi(
      name,
      description,
      instructions,
    );

    // Add the new project to the list
    setProjects((previous) => [
      project,
      ...previous,
    ]);

    // Make the new project active
    setActiveProjectId(project.id);

    // Start a completely new chat for this project
    setActiveConversationId(null);
    setMessages([]);
    setInput("");
    setSelectedDocumentIds([]);
    setReplyingTo(null);

    // Go directly to the chat screen
    setActiveView("chat");

    // Focus the composer
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Unable to create project.",
    );
  }
}

  async function handleUpdateProject(id: number, name: string, description: string, instructions: string) {
    const project = await updateProjectApi(id, name, description, instructions);
    setProjects(previous => previous.map(item => item.id === id ? project : item));
  }

  async function handleDeleteProject(id: number) {
    if (!window.confirm("Delete this project? Its chats and project links will be removed.")) return;
    await deleteProjectApi(id);
    setProjects(previous => previous.filter(item => item.id !== id));
    if (activeProjectId === id) { setActiveProjectId(null); setActiveView("chat"); }
    await loadConversations();
  }

  async function handleAttachProjectDocument(projectId: number, documentId: number) {
    await attachProjectDocument(projectId, documentId, false);
    await loadProjects();
  }

  async function handleDetachProjectDocument(projectId: number, documentId: number) {
    await attachProjectDocument(projectId, documentId, true);
    await loadProjects();
  }

  function handleOpenProject(projectId: number) {
    setActiveProjectId(projectId);
    setActiveView("projects");
  }

  function handleOpenProjectChat(conversationId: number) {
    setActiveView("chat");
    handleSelectConversation(conversationId);
  }

  function handleBackToNormalChats() {
    setActiveProjectId(null);
    setActiveConversationId(null);
    setMessages([]);
    setInput("");
    setSelectedDocumentIds([]);
    setReplyingTo(null);
    setActiveView("chat");
    setMobileOpen(false);

    window.setTimeout(
      () => inputRef.current?.focus(),
      50,
    );
  }

  async function handleSaveSettings() {
    const saved = await updateSettingsApi(settings);
    setSettings(saved);
    setSelectedModel(saved.model);
    applyTheme(saved.theme);
  }

  async function handleClearChats() {
    if (!window.confirm("Clear all chat history? This cannot be undone.")) return;
    await clearChatsApi();
    setConversations([]); setMessages([]); setActiveConversationId(null);
  }

  async function handleDeleteAllDocuments() {
    if (!window.confirm("Delete all uploaded PDFs?")) return;
    for (const document of documents) { await deleteDocument(document.id); }
    setDocuments([]); setSelectedDocumentIds([]); await loadProjects();
  }

  /* =======================================================
     SEND MESSAGE — STREAMING
  ======================================================= */

  async function handleSend(event?: FormEvent) {
    event?.preventDefault();
    let message = input.trim();
    if (!message || loading) return;
    const messageForDisplay = message;
    const documentIdsForMessage = [...selectedDocumentIds];
    if (replyingTo) {
      message = `Replying to this message:\n\n"${replyingTo.content}"\n\nUser's reply:\n${message}`;
    }
    setError(""); setInput(""); setReplyingTo(null);
    const temporaryUserMessage: ChatMessage = { id: Date.now(), role: "user", content: messageForDisplay };
    setMessages(previous => [...previous, temporaryUserMessage]);
    setLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let assistantId: number | undefined;
    try {
      await streamChatMessage(
        message, activeConversationId, selectedModel, documentIdsForMessage, activeProjectId, controller.signal,
        (data) => {
          assistantId = data.message_id;
          const assistant: ChatMessage = { id: data.message_id, role: "assistant", content: "", sources: data.sources || [] };
          setMessages(previous => [...previous, assistant]);
          if (!activeConversationId) setActiveConversationId(data.conversation_id);
        },
        (token) => {
          setMessages(previous => previous.map(item => item.id === assistantId ? { ...item, content: item.content + token } : item));
        },
        () => {},
      );
      await loadConversations();
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Unable to get a response.");
        setMessages(previous => previous.filter(item => item.id !== temporaryUserMessage.id && item.id !== assistantId));
      }
    } finally {
      setLoading(false); abortControllerRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleStopGeneration() {
    abortControllerRef.current?.abort();
    setLoading(false);
  }

  /* =======================================================
     ENTER / SHIFT + ENTER
  ======================================================= */

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      settings.enter_to_send
    ) {
      event.preventDefault();

      handleSend();
    }
  }

  const hasMessages =
    messages.length > 0;

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        conversations={
          conversations
        }
        activeConversationId={
          activeConversationId
        }
        onNewChat={
          handleNewChat
        }
        onSelectConversation={
          handleSelectConversation
        }
        onDeleteConversation={
          handleDeleteConversation
        }
        onTogglePin={
          handleTogglePin
        }
        onLogout={
          onLogout
        }
        mobileOpen={
          mobileOpen
        }
        setMobileOpen={
          setMobileOpen
        }
        activeView={activeView}
        onViewChange={(view) => {
          if (view === "chat") {
            handleBackToNormalChats();
          } else {
            setActiveView(view);
            setMobileOpen(false);
          }
        }}
      />

      <main className="chat-home">
        {activeView === "projects" ? (
          <ProjectPanel
            projects={projects}
            documents={documents}
            activeProjectId={activeProjectId}
            projectConversations={conversations}
            onSelect={(id) => {
              if (id === null) {
                handleBackToNormalChats();
                return;
              }
              handleOpenProject(id);
            }}
            onOpenChat={handleOpenProjectChat}
            onBackToChats={handleBackToNormalChats}
            onTogglePin={handleTogglePin}
            onCreate={handleCreateProject}
            onUpdate={handleUpdateProject}
            onDelete={handleDeleteProject}
            onAttach={handleAttachProjectDocument}
            onDetach={handleDetachProjectDocument}
          />
        ) : activeView === "settings" ? (
          <SettingsPanel settings={settings} onChange={setSettings} onSave={handleSaveSettings} onClearChats={handleClearChats} onDeleteDocuments={handleDeleteAllDocuments} />
        ) : (
        <>
        {/* =================================================
            HEADER
        ================================================= */}

        <header className="chat-header">
          <div className="header-left">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() =>
                setMobileOpen(
                  true,
                )
              }
            >
              ☰
            </button>

            <div className="header-title">
              <img
                src={logo}
                alt="AUREX"
              />

              <span>
                AUREX AI
              </span>
            </div>
          </div>

          <select
            className="model-selector"
            value={
              selectedModel
            }
            onChange={(event) => {
              setSelectedModel(event.target.value);
              setSettings(previous => ({ ...previous, model: event.target.value }));
            }}
          >
            <option value="openai/gpt-oss-20b">
              GPT-OSS 20B
            </option>
          </select>
        </header>

        {/* =================================================
            EMPTY CHAT
        ================================================= */}

        {!hasMessages &&
        !loadingHistory ? (
          <section className="empty-chat">
            <img
              className="welcome-logo"
              src={logo}
              alt="AUREX AI"
            />

            <h1>
              How can I help you
              today?
            </h1>

            <p>
              Ask AUREX anything.
              Get clear, useful
              and intelligent
              answers.
            </p>

            <div className="quick-actions">
              <button
                type="button"
                onClick={() =>
                  setInput(
                    "Explain FastAPI in simple terms",
                  )
                }
              >
                <span>
                  ✦
                </span>

                Explain FastAPI
              </button>

              <button
                type="button"
                onClick={() =>
                  setInput(
                    "Help me write a professional resume",
                  )
                }
              >
                <span>
                  ✎
                </span>

                Write a resume
              </button>

              <button
                type="button"
                onClick={() =>
                  setInput(
                    "Give me a Python project idea",
                  )
                }
              >
                <span>
                  ⌘
                </span>

                Project idea
              </button>
            </div>
          </section>
        ) : (
          /* =================================================
             MESSAGES
          ================================================= */

          <section className="messages-container">
            <div className="messages-inner">
              {loadingHistory && (
                <div className="history-loading">
                  Loading
                  conversation...
                </div>
              )}

              {messages.map(
                (message) => (
                  <div
                    key={
                      message.id
                    }
                    className={`message-row ${message.role}`}
                  >
                    {message.role ===
                      "assistant" && (
                      <div className="message-avatar">
                        <img
                          src={logo}
                          alt="AUREX"
                        />
                      </div>
                    )}

                    <div className="message-content-wrapper">
                      <div className="message-name">
                        {message.role ===
                        "assistant"
                          ? "AUREX AI"
                          : "You"}
                      </div>

                      <div className="message-bubble">
                        <MessageContent
                          content={
                             message.content.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "\n\n").replace(/<br\s*\/?>/gi, "\n")

                          }
                        />

                        {message.role ===
                          "assistant" &&
                          settings.show_sources &&
                          message.sources &&
                          message.sources
                            .length >
                            0 && (
                            <div
                              id={`sources-${message.id}`}
                            >
                              <SourcePanel
                                sources={
                                  message.sources
                                }
                              />
                            </div>
                          )}
                      </div>

                      {/* ===================================
                          ACTIONS BELOW EACH MESSAGE
                      =================================== */}

                      <div className="message-actions">
                        {/* COPY */}

                        <button
                          type="button"
                          title="Copy"
                          onClick={() =>
                            handleCopyMessage(
                              message.content,
                            )
                          }
                        >
                          <span className="action-icon">
                            ⧉
                          </span>

                          <span className="action-label">
                            Copy
                          </span>
                        </button>

                        {/* SOURCES */}

                        {message.role ===
                          "assistant" &&
                          settings.show_sources &&
                          message.sources &&
                          message.sources
                            .length >
                            0 && (
                            <button
                              type="button"
                              title="View sources"
                              onClick={() =>
                                handleViewSources(
                                  message.id,
                                )
                              }
                            >
                              <span className="action-icon">
                                ◈
                              </span>

                              <span className="action-label">
                                Sources
                              </span>
                            </button>
                          )}

                        {/* REPLY */}

                        <button
                          type="button"
                          title="Reply"
                          onClick={() =>
                            handleReply(
                              message,
                            )
                          }
                        >
                          <span className="action-icon">
                            ↩
                          </span>

                          <span className="action-label">
                            Reply
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ),
              )}

              {/* =================================================
                  LOADING
              ================================================= */}

              {loading && (
                <div className="message-row assistant">
                  <div className="message-avatar">
                    <img
                      src={logo}
                      alt="AUREX"
                    />
                  </div>

                  <div className="message-content-wrapper">
                    <div className="message-name">
                      AUREX AI
                    </div>

                    <div className="message-bubble typing-bubble">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              )}

              {/* =================================================
                  ERROR
              ================================================= */}

              {error && (
                <div className="chat-error">
                  {error}
                </div>
              )}

              <div
                ref={
                  messagesEndRef
                }
              />
            </div>
          </section>
        )}

        {/* =================================================
            COMPOSER
        ================================================= */}

        <div className="composer-area">
          <div className="composer-wrapper">
            {/* =================================================
                REPLY PREVIEW
            ================================================= */}

            {replyingTo && (
              <div className="reply-preview">
                <div className="reply-preview-content">
                  <div className="reply-preview-label">
                    Replying to{" "}
                    {replyingTo.role ===
                    "assistant"
                      ? "AUREX AI"
                      : "You"}
                  </div>

                  <div className="reply-preview-text">
                    {
                      replyingTo.content
                    }
                  </div>
                </div>

                <button
                  type="button"
                  className="reply-preview-close"
                  onClick={() =>
                    setReplyingTo(
                      null,
                    )
                  }
                  title="Cancel reply"
                >
                  ×
                </button>
              </div>
            )}

            {/* =================================================
                UPLOADED DOCUMENTS
            ================================================= */}

            {(selectedDocumentIds.length >
              0 ||
              uploading) && (
              <DocumentChips
                documents={
                  documents
                }
                selectedDocumentIds={
                  selectedDocumentIds
                }
                uploading={
                  uploading
                }
                onUpload={
                  handleUpload
                }
                onRemove={
                  handleRemoveSelectedDocument
                }
              />
            )}

            {/* =================================================
                MAIN COMPOSER
            ================================================= */}

            <form
              className="composer"
              onSubmit={
                handleSend
              }
            >
              {/* PDF ATTACHMENT */}

              <label
                className="attach-button"
                title="Upload PDF"
              >
                <span>
                  ＋
                </span>

                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  hidden
                  disabled={
                    uploading
                  }
                  onChange={async (
                    event,
                  ) => {
                    const file =
                      event.target
                        .files?.[0];

                    event.target.value =
                      "";

                    if (file) {
                      await handleUpload(
                        file,
                      );
                    }
                  }}
                />
              </label>

              {/* TEXT INPUT */}

              <textarea
                ref={
                  inputRef
                }
                value={input}
                onChange={(
                  event,
                ) =>
                  setInput(
                    event.target
                      .value,
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder={
                  selectedDocumentIds.length >
                  0
                    ? "Ask about your attached PDF or anything else..."
                    : "Message AUREX AI..."
                }
                disabled={
                  loading
                }
                rows={1}
              />

              {/* SEND */}

              {loading ? (
                <button
                  type="button"
                  className="send-button stop-button"
                  onClick={handleStopGeneration}
                  title="Stop generation"
                >
                  ■
                </button>
              ) : (
                <button
                  type="submit"
                  className="send-button"
                  disabled={!input.trim()}
                  title="Send message"
                >
                  ↑
                </button>
              )}
            </form>

            <p className="disclaimer">
              AUREX AI can make
              mistakes. Check
              important information.
            </p>
          </div>
        </div>
        </>
        )}
      </main>
    </div>
  );
}

/* =========================================================
   MAIN APP
========================================================= */

export default function App() {
  const [
    user,
    setUser,
  ] =
    useState<
      UserData | null
    >(null);

  const [
    authPage,
    setAuthPage,
  ] =
    useState<AuthPage>(
      "login",
    );

  const [
    checkingSession,
    setCheckingSession,
  ] =
    useState(true);

  /* =======================================================
     RESTORE SESSION
  ======================================================= */

  useEffect(() => {
    const savedToken =
      localStorage.getItem(
        "aurex_token",
      );

    const savedRefreshToken =
      localStorage.getItem(
        "aurex_refresh_token",
      );

    const savedUser =
      localStorage.getItem(
        "aurex_user",
      );

    if (
      savedToken &&
      savedRefreshToken &&
      savedUser
    ) {
      try {
        const parsedUser: UserData =
          JSON.parse(
            savedUser,
          );

        setUser(
          parsedUser,
        );
      } catch {
        clearAuthStorage();
      }
    }

    setCheckingSession(
      false,
    );
  }, []);

  /* =======================================================
     LOGIN
  ======================================================= */

  async function handleLogin(
    email: string,
    password: string,
  ) {
    const data =
      await loginUser(
        email,
        password,
      );

    localStorage.setItem(
      "aurex_token",
      data.access_token,
    );

    if (data.refresh_token) {
      localStorage.setItem(
        "aurex_refresh_token",
        data.refresh_token,
      );
    }

    localStorage.setItem(
      "aurex_user",
      JSON.stringify(
        data.user,
      ),
    );

    setUser(
      data.user,
    );
  }

  /* =======================================================
     REGISTER
  ======================================================= */

  async function handleRegister(
    name: string,
    email: string,
    password: string,
  ) {
    const data =
      await registerUser(
        name,
        email,
        password,
      );

    localStorage.setItem(
      "aurex_token",
      data.access_token,
    );

    if (data.refresh_token) {
      localStorage.setItem(
        "aurex_refresh_token",
        data.refresh_token,
      );
    }

    localStorage.setItem(
      "aurex_user",
      JSON.stringify(
        data.user,
      ),
    );

    setUser(
      data.user,
    );
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  function handleLogout() {
    clearAuthStorage();

    setUser(null);

    setAuthPage(
      "login",
    );
  }

  /* =======================================================
     SESSION LOADING
  ======================================================= */

  if (checkingSession) {
    return (
      <div className="app-loading">
        <img
          src={logo}
          alt="AUREX AI"
        />

        <p>
          Loading AUREX AI...
        </p>
      </div>
    );
  }

  /* =======================================================
     AUTH
  ======================================================= */

  if (!user) {
    return (
      <AuthScreen
        page={authPage}
        setPage={
          setAuthPage
        }
        onLogin={
          handleLogin
        }
        onRegister={
          handleRegister
        }
      />
    );
  }

  /* =======================================================
     APP
  ======================================================= */

  return (
    <ChatPage
      user={user}
      onLogout={
        handleLogout
      }
    />
  );
}