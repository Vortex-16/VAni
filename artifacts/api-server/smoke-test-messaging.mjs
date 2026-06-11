/**
 * End-to-end smoke test for the real-time chat (family ↔ patient ↔ caregiver).
 *
 * It cannot run in this sandbox (no DB / running server), so run it where the
 * API + Postgres are up:
 *
 *   1. node artifacts/api-server/apply-messages-schema.mjs   # create the table
 *   2. start the api-server                                  # pnpm --filter @workspace/api-server dev
 *   3. BASE_URL=http://localhost:3000 \
 *      SENDER_EMAIL=caregiver@example.com  SENDER_PASS=secret \
 *      RECEIVER_EMAIL=patient@example.com  RECEIVER_PASS=secret \
 *      [PATIENT_CONTEXT_ID=<uuid>] \
 *      node artifacts/api-server/smoke-test-messaging.mjs
 *
 * The two accounts must be linked (care_links / linkedPatientId) for the same
 * patient. PATIENT_CONTEXT_ID defaults to the sender's linkedPatientId.
 *
 * What it asserts:
 *   • POST /api/chat/send persists and returns a message
 *   • the RECEIVER's open SSE stream gets the message in real time (< 5s)
 *   • GET /api/chat/history returns the message for both parties
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const { SENDER_EMAIL, SENDER_PASS, RECEIVER_EMAIL, RECEIVER_PASS } = process.env;

if (!SENDER_EMAIL || !SENDER_PASS || !RECEIVER_EMAIL || !RECEIVER_PASS) {
  console.error("Set SENDER_EMAIL, SENDER_PASS, RECEIVER_EMAIL, RECEIVER_PASS env vars.");
  process.exit(2);
}

const login = async (email, password) => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`login ${email} failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const token = data.token || data.accessToken;
  const user = data.user || data;
  if (!token) throw new Error(`no token for ${email}`);
  return { token, user };
};

// Read an SSE stream via fetch's ReadableStream until `onEvent` returns true or timeout.
const openStream = async (token, onEvent, signal) => {
  const res = await fetch(`${BASE_URL}/api/chat/stream`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`stream failed: ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += decoder.decode(value, { stream: true });
    const frames = buf.split("\n\n");
    buf = frames.pop() || "";
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      try {
        if (onEvent(JSON.parse(line.slice(5).trim()))) return;
      } catch {
        /* ignore non-JSON (heartbeat comments) */
      }
    }
  }
};

const run = async () => {
  console.log(`→ Base: ${BASE_URL}`);
  const sender = await login(SENDER_EMAIL, SENDER_PASS);
  const receiver = await login(RECEIVER_EMAIL, RECEIVER_PASS);
  console.log(`✓ Logged in: sender=${sender.user.id} receiver=${receiver.user.id}`);

  const patientContextId =
    process.env.PATIENT_CONTEXT_ID || sender.user.linkedPatientId || receiver.user.linkedPatientId;
  if (!patientContextId) throw new Error("No PATIENT_CONTEXT_ID and neither user has linkedPatientId.");

  const marker = `smoke-${Date.now()}`;
  const ac = new AbortController();
  let received = null;

  // Start the receiver's stream first so the message is delivered live.
  const streamDone = openStream(
    receiver.token,
    (evt) => {
      if (evt.type === "message" && evt.data?.text === marker) {
        received = evt.data;
        return true;
      }
      return false;
    },
    ac.signal,
  ).catch((e) => {
    if (e.name !== "AbortError") throw e;
  });

  await new Promise((r) => setTimeout(r, 750)); // let SSE register in the clients map

  const sendRes = await fetch(`${BASE_URL}/api/chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${sender.token}` },
    body: JSON.stringify({ patientContextId, receiverId: receiver.user.id, text: marker }),
  });
  if (!sendRes.ok) throw new Error(`send failed: ${sendRes.status} ${await sendRes.text()}`);
  console.log(`✓ Sent message "${marker}"`);

  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("SSE timeout (5s)")), 5000));
  try {
    await Promise.race([streamDone, timeout]);
  } finally {
    ac.abort();
  }

  if (!received) throw new Error("FAIL: message did not arrive over SSE");
  console.log(`✓ Real-time SSE delivery OK (id=${received.id})`);

  const histRes = await fetch(
    `${BASE_URL}/api/chat/history/${patientContextId}?withUserId=${sender.user.id}`,
    { headers: { Authorization: `Bearer ${receiver.token}` } },
  );
  const history = await histRes.json();
  if (!Array.isArray(history) || !history.find((m) => m.text === marker)) {
    throw new Error("FAIL: message not found in receiver history");
  }
  console.log(`✓ History persisted (${history.length} msgs)`);
  console.log("\nALL CHECKS PASSED ✅");
};

run().catch((e) => {
  console.error(`\n❌ ${e.message}`);
  process.exit(1);
});
