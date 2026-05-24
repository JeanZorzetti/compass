import { Resend } from "resend";
import type { AlertDecision } from "@/lib/alerts";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (_resend) return _resend;
  const key = process.env.AUTH_RESEND_KEY;
  if (!key) throw new Error("AUTH_RESEND_KEY não configurada");
  _resend = new Resend(key);
  return _resend;
}

const FROM = process.env.EMAIL_FROM ?? "Compass <auth@polarisia.com.br>";
const APP_URL = process.env.APP_URL ?? "https://compass.polarisia.com.br";

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export async function sendAlertEmail(
  to: string,
  title: string,
  decision: AlertDecision
): Promise<void> {
  const isHit = decision.type === "limit_hit";
  const accent = isHit ? "#dc2626" : "#6366f1";

  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
    <p style="font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #71717a; margin: 0 0 4px;">Polaris · Compass</p>
    <h1 style="font-size: 20px; color: #18181b; margin: 0 0 16px;">${title}</h1>

    <div style="background: #fafafa; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <div style="height: 8px; background: #e4e4e7; border-radius: 4px; overflow: hidden; margin-bottom: 12px;">
        <div style="height: 100%; width: ${Math.min(100, decision.pctOfPeak)}%; background: ${accent};"></div>
      </div>
      <p style="font-size: 14px; color: #3f3f46; margin: 0;">
        You've used <strong>${formatTokens(decision.currentWeekTokens)}</strong> tokens this week —
        that's <strong>${decision.pctOfPeak}%</strong> of your usual weekly peak
        (${formatTokens(decision.baselinePeakTokens)}).
      </p>
    </div>

    <p style="font-size: 14px; color: #3f3f46;">
      ${
        isHit
          ? "You're at or above your usual ceiling. If your plan throttles soon, now you know why."
          : "At this pace you may hit your plan's limit before the week resets."
      }
    </p>

    <a href="${APP_URL}/dashboard" style="display: inline-block; margin-top: 16px; background: #18181b; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500;">
      Open dashboard
    </a>

    <p style="font-size: 12px; color: #a1a1aa; margin-top: 32px;">
      You're receiving this because email alerts are on. Manage them in your Compass dashboard.
    </p>
  </div>
  `;

  await getResend().emails.send({
    from: FROM,
    to: [to],
    subject: title,
    html,
  });
}
