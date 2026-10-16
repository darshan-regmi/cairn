import { once } from "node:events";
import net from "node:net";
import tls from "node:tls";

// A deliberately small SMTP client, so self-host mode can send verification and
// reset mail without pulling in a dependency. It speaks the subset a normal mail
// relay needs: EHLO, optional STARTTLS or implicit TLS, optional AUTH LOGIN, and
// one base64 text body (base64 means there is no dot-stuffing to get wrong).
//
// When SMTP_* is unset we log the message instead and return `false`; callers
// use that to hand the link to the person directly.

const CONNECT_TIMEOUT_MS = 10_000;

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  pass: string | null;
  from: string;
};

export function smtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  if (!host || !from) return null;
  return {
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1",
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null,
    from,
  };
}

export function isEmailConfigured(): boolean {
  return smtpConfig() !== null;
}

/** Header values must never carry a newline, or they could smuggle headers. */
function header(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeSubject(subject: string): string {
  return /^[\x20-\x7e]*$/.test(subject)
    ? subject
    : `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

/** The full RFC 5322 message. Body is base64 so no line can look like the end. */
export function buildMessage(input: {
  from: string;
  to: string;
  subject: string;
  text: string;
  date?: Date;
}): string {
  const body = (
    Buffer.from(input.text, "utf8").toString("base64").match(/.{1,76}/g) ?? []
  ).join("\r\n");

  return [
    `Date: ${(input.date ?? new Date()).toUTCString()}`,
    `From: ${header(input.from)}`,
    `To: ${header(input.to)}`,
    `Subject: ${encodeSubject(header(input.subject))}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    body,
  ].join("\r\n");
}

type Reply = { code: number; lines: string[] };

/** Reads CRLF-delimited lines off a socket, one at a time. */
class Reader {
  private queue: string[] = [];
  private waiting: ((line: string) => void) | null = null;
  private failure: Error | null = null;
  private readonly onData: (chunk: string) => void;
  private readonly onError: (error: Error) => void;
  private readonly onClose: () => void;

  constructor(private readonly socket: net.Socket) {
    let buffer = "";
    this.onData = (chunk) => {
      buffer += chunk;
      for (
        let end = buffer.indexOf("\r\n");
        end !== -1;
        end = buffer.indexOf("\r\n")
      ) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        const waiting = this.waiting;
        this.waiting = null;
        if (waiting) waiting(line);
        else this.queue.push(line);
      }
    };
    this.onError = (error) => this.fail(error);
    this.onClose = () => this.fail(new Error("SMTP connection closed early."));

    socket.setEncoding("utf8");
    socket.on("data", this.onData);
    socket.on("error", this.onError);
    socket.on("close", this.onClose);
  }

  /** Stops listening, so the socket can be wrapped in TLS. */
  detach(): void {
    this.socket.off("data", this.onData);
    this.socket.off("error", this.onError);
    this.socket.off("close", this.onClose);
  }

  private fail(error: Error): void {
    this.failure ??= error;
    const waiting = this.waiting;
    this.waiting = null;
    if (waiting) waiting("");
  }

  line(): Promise<string> {
    const queued = this.queue.shift();
    if (queued !== undefined) return Promise.resolve(queued);
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve) => {
      this.waiting = resolve;
    });
  }

  /** Reads a whole reply: `250-first` continues, `250 last` ends it. */
  async reply(): Promise<Reply> {
    const lines: string[] = [];
    for (;;) {
      const line = await this.line();
      if (line === "") throw this.failure ?? new Error("SMTP read failed.");
      lines.push(line);
      const match = /^(\d{3})([ -]?)/.exec(line);
      if (!match) throw new Error(`Unexpected SMTP reply: ${line}`);
      if (match[2] !== "-") return { code: Number(match[1]), lines };
    }
  }
}

class Connection {
  private constructor(
    private socket: net.Socket,
    private reader: Reader,
    private readonly host: string,
  ) {}

  static async connect(config: SmtpConfig): Promise<Connection> {
    const socket = config.secure
      ? tls.connect({
          host: config.host,
          port: config.port,
          servername: config.host,
        })
      : net.connect({ host: config.host, port: config.port });

    const reader = new Reader(socket);
    await settle(
      socket,
      config.secure ? "secureConnect" : "connect",
      "SMTP connect timed out.",
    );
    return new Connection(socket, reader, config.host);
  }

  greeting(): Promise<Reply> {
    return this.reader.reply();
  }

  async command(line: string, expected: number[]): Promise<Reply> {
    this.socket.write(`${line}\r\n`);
    return this.check(line.split(" ")[0], await this.reader.reply(), expected);
  }

  write(data: string): void {
    this.socket.write(data);
  }

  /** Reads the reply to a raw write (DATA's body). */
  async accept(what: string, expected: number[]): Promise<void> {
    this.check(what, await this.reader.reply(), expected);
  }

  private check(what: string, reply: Reply, expected: number[]): Reply {
    if (!expected.includes(reply.code)) {
      throw new Error(`SMTP ${what} failed: ${reply.lines.join(" ")}`);
    }
    return reply;
  }

  async startTls(): Promise<void> {
    const raw = this.socket;
    this.reader.detach();
    const secured = tls.connect({ socket: raw, servername: this.host });
    this.socket = secured;
    this.reader = new Reader(secured);
    await settle(secured, "secureConnect", "SMTP TLS handshake timed out.");
  }

  close(): void {
    this.socket.destroy();
  }
}

/** Waits for a socket event, failing fast instead of hanging forever. */
async function settle(
  socket: net.Socket,
  event: "connect" | "secureConnect",
  message: string,
): Promise<void> {
  const timer = setTimeout(() => socket.destroy(new Error(message)), CONNECT_TIMEOUT_MS);
  try {
    await once(socket, event);
  } finally {
    clearTimeout(timer);
  }
}

function ehloName(config: SmtpConfig): string {
  return config.from.split("@")[1] || "localhost";
}

/**
 * Sends one plain-text message. Returns false when SMTP is not configured (the
 * message is logged instead), true once the server accepted it, and throws if a
 * configured server rejects it.
 */
export async function sendMail(message: {
  to: string;
  subject: string;
  text: string;
}): Promise<boolean> {
  const config = smtpConfig();
  if (!config) {
    console.warn(
      "[cairn] SMTP is not configured (set SMTP_HOST and SMTP_FROM to send " +
        "mail). The message below was NOT delivered.\n" +
        `  To: ${message.to}\n  Subject: ${message.subject}\n${message.text}`,
    );
    return false;
  }

  const data = buildMessage({ from: config.from, ...message });
  const connection = await Connection.connect(config);

  try {
    const greeting = await connection.greeting();
    if (greeting.code >= 400) {
      throw new Error(`SMTP refused the connection: ${greeting.lines.join(" ")}`);
    }

    let ehlo = await connection.command(`EHLO ${ehloName(config)}`, [250]);

    if (!config.secure && ehlo.lines.some((line) => /STARTTLS/i.test(line))) {
      await connection.command("STARTTLS", [220]);
      await connection.startTls();
      ehlo = await connection.command(`EHLO ${ehloName(config)}`, [250]);
    }

    if (config.user) {
      if (!ehlo.lines.some((line) => /AUTH/i.test(line))) {
        throw new Error("SMTP server does not offer AUTH.");
      }
      await connection.command("AUTH LOGIN", [334]);
      await connection.command(Buffer.from(config.user).toString("base64"), [334]);
      await connection.command(
        Buffer.from(config.pass ?? "").toString("base64"),
        [235],
      );
    }

    await connection.command(`MAIL FROM:<${config.from}>`, [250]);
    await connection.command(`RCPT TO:<${message.to}>`, [250, 251]);
    await connection.command("DATA", [354]);
    connection.write(`${data}\r\n.\r\n`);
    await connection.accept("message", [250]);
    await connection.command("QUIT", [221]).catch(() => undefined);
    return true;
  } finally {
    connection.close();
  }
}
