import { afterEach, describe, expect, it } from "vitest";
import { buildMessage, isEmailConfigured, smtpConfig } from "@/lib/smtp";

const KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
] as const;
const original = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of KEYS) {
    const value = original[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("smtpConfig", () => {
  it("is off until a host and a sender are both set", () => {
    expect(smtpConfig()).toBeNull();
    process.env.SMTP_HOST = "smtp.example.com";
    expect(smtpConfig()).toBeNull();
  });

  it("defaults to STARTTLS on port 587 with no login", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_FROM = "Cairn <cairn@example.com>";
    expect(smtpConfig()).toEqual({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      user: null,
      pass: null,
      from: "Cairn <cairn@example.com>",
    });
    expect(isEmailConfigured()).toBe(true);
  });

  it("reads the port, implicit TLS and credentials", () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_FROM = "cairn@example.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_SECURE = "true";
    process.env.SMTP_USER = "cairn";
    process.env.SMTP_PASS = "hunter2";

    expect(smtpConfig()).toMatchObject({
      port: 465,
      secure: true,
      user: "cairn",
      pass: "hunter2",
    });
  });

  it("is off when only the sender is set", () => {
    process.env.SMTP_FROM = "cairn@example.com";
    expect(smtpConfig()).toBeNull();
    expect(isEmailConfigured()).toBe(false);
  });
});

describe("buildMessage", () => {
  const message = buildMessage({
    from: "Cairn <cairn@example.com>",
    to: "ada@example.com",
    subject: "Verify your email",
    text: "Open https://example.com/verify/abc",
    date: new Date("2026-01-02T03:04:05.000Z"),
  });

  it("writes the headers a mail server needs", () => {
    expect(message).toContain("From: Cairn <cairn@example.com>");
    expect(message).toContain("To: ada@example.com");
    expect(message).toContain("Subject: Verify your email");
    expect(message).toContain("MIME-Version: 1.0");
    expect(message).toContain("Content-Transfer-Encoding: base64");
  });

  it("base64-encodes the body, so no line can be dot-stuffed", () => {
    const body = message.split("\r\n\r\n")[1].replace(/\r\n/g, "");
    expect(Buffer.from(body, "base64").toString("utf8")).toBe(
      "Open https://example.com/verify/abc",
    );
  });

  it("refuses to let a newline in a header inject another one", () => {
    const injected = buildMessage({
      from: "cairn@example.com",
      to: "ada@example.com",
      subject: "Hello\r\nBcc: attacker@example.com",
      text: "hi",
    });
    const lines = injected.split("\r\n");
    expect(lines).toContain("Subject: Hello Bcc: attacker@example.com");
    expect(lines).not.toContain("Bcc: attacker@example.com");
  });
});
