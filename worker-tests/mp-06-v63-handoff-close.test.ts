import {
  createExecutionContext,
  runInDurableObject,
  waitOnExecutionContext,
} from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../worker/index.js";
import type { ProcessEventInput } from "../worker/durable-objects.js";
import {
  mp06PilotLimitsFromEnvironment,
  MP06_PILOT_CONTROL_OBJECT_NAME,
} from "../worker/mp-06-pilot-control.js";

const closeEndpoint =
  "https://malispang-lineoa-test.eakkachai-dev.workers.dev/admin/handoff/close";
const now = Date.parse("2026-10-05T01:00:00Z");
const ref = (n: number) => n.toString(16).padStart(64, "0");
const limits = mp06PilotLimitsFromEnvironment(env)!;
const coordinator = () =>
  env.CONVERSATION_STATE.getByName(MP06_PILOT_CONTROL_OBJECT_NAME);
const registry = () => env.HANDOFF_REGISTRY.getByName("test-active-handoffs");

const handoffInput = (eventRef: string): ProcessEventInput => ({
  eventRef,
  decision: {
    replyKind: "HANDOFF_ACK",
    reasonCode: "MP06_MANDATORY_DETERMINISTIC_PRECEDENCE",
    handoff: true,
    allowDuringHandoff: false,
  },
  now,
  processedRetentionSeconds: 86_400,
  auditRetentionSeconds: 604_800,
});

/** Fresh storage: one tester, one delivered handoff, pilot left in `pilotState`. */
async function freshFixture(
  label: number,
  pilotState: "STOPPED" | "ACTIVE" = "STOPPED",
  testerRefs?: readonly string[],
) {
  const owner = ref(0x6300 + label);
  await coordinator().stopMp06Pilot(now, "OPERATOR_STOP");
  const activated = await coordinator().activateMp06Pilot({
    sessionRef: ref(0x6400 + label),
    testerRefs: testerRefs ?? [owner],
    // Past any earlier fixture's window so each case starts its own session.
    now: now + label * 3_700_000,
    limits,
  });
  expect(activated).toMatchObject({ activated: true });
  if (pilotState === "STOPPED")
    await coordinator().stopMp06Pilot(
      now + label * 3_700_000 + 1,
      "OPERATOR_STOP",
    );
  const conversation = env.CONVERSATION_STATE.getByName(owner);
  const handoff = await conversation.processEvent(
    handoffInput(ref(0x6500 + label)),
  );
  if (handoff.status !== "RESPOND") throw Error("EXPECTED_HANDOFF");
  expect(
    await conversation.markDelivered(
      ref(0x6500 + label),
      handoff.deliveryClaim,
    ),
  ).toBe("ACKNOWLEDGED");
  const generation = (await conversation.handoffObservation())!.generation;
  await registry().activate(owner, now, generation);
  return { owner, conversation, generation };
}

async function close(body: Record<string, unknown>) {
  const ctx = createExecutionContext();
  const response = await worker.fetch(
    new Request(closeEndpoint, {
      method: "POST",
      headers: {
        authorization: "Bearer " + env.TEST_ADMIN_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }),
    env,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return response;
}

const closeBody = (generation: number, operation = 0x6600) => ({
  operationRef: ref(operation),
  expectedGeneration: generation,
  staffId: "OWNER_TEST",
});

describe("v63 fresh-storage handoff close", () => {
  it("closes the sole stopped-pilot tester's handoff and replays idempotently", async () => {
    const f = await freshFixture(1);
    // Mirror the Owner UAT state: T-C01 was used earlier in this conversation.
    await runInDurableObject(f.conversation, (_i, state) => {
      state.storage.sql.exec(
        "UPDATE mp06_conversation_state SET clarification_used = 1 WHERE id = 1",
      );
    });
    expect(await f.conversation.state()).toBe("HUMAN_HANDOFF");
    expect(await coordinator().ownerUatPilotObservation()).toBeNull();

    const first = await close(closeBody(f.generation));
    expect(first.status).toBe(200);
    const receipt: unknown = await first.json();
    expect(receipt).toMatchObject({
      closed: true,
      receipt: { generation: f.generation, result: "CLOSED" },
    });
    expect(await f.conversation.conversationObservation()).toMatchObject({
      mode: "BOT_ACTIVE",
      clarificationUsed: false,
      pendingTemplate: null,
    });
    expect(await f.conversation.handoffObservation()).toMatchObject({
      closeState: "COMPLETE",
      pendingClose: false,
    });
    expect(
      (await registry().listActive()).some(
        (h) => h.conversationRef === f.owner,
      ),
    ).toBe(false);

    // Same operation replays to the same receipt without a second mutation.
    const replay = await close(closeBody(f.generation));
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual(receipt);
    // A different operation for the consumed close slot is refused.
    expect((await close(closeBody(f.generation, 0x6601))).status).toBe(409);
    expect(await f.conversation.state()).toBe("BOT_ACTIVE");
  });

  it("refuses while the pilot is still ACTIVE", async () => {
    const f = await freshFixture(2, "ACTIVE");
    const response = await close(closeBody(f.generation));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      code: "HANDOFF_CLOSE_READINESS_UNAVAILABLE",
    });
    expect(await f.conversation.state()).toBe("HUMAN_HANDOFF");
    await coordinator().stopMp06Pilot(now + 2 * 3_700_000 + 1, "OPERATOR_STOP");
  });

  it("refuses when the session has more than one tester", async () => {
    const f = await freshFixture(3, "STOPPED", [ref(0x6303), ref(0x6399)]);
    expect((await close(closeBody(f.generation))).status).toBe(409);
    expect(await f.conversation.state()).toBe("HUMAN_HANDOFF");
  });

  it("refuses while the conversation has undelivered outbound work", async () => {
    const f = await freshFixture(4);
    await runInDurableObject(f.conversation, (_i, state) => {
      state.storage.sql.exec(
        "UPDATE processed_events SET delivered = 0 WHERE event_ref = ?",
        ref(0x6504),
      );
    });
    expect((await close(closeBody(f.generation))).status).toBe(409);
    expect(await f.conversation.state()).toBe("HUMAN_HANDOFF");
  });

  it("refuses when pilot work is reserved or in flight", async () => {
    const f = await freshFixture(5);
    await runInDurableObject(coordinator(), (_i, state) => {
      state.storage.sql.exec(
        "UPDATE mp06_pilot_session SET in_flight = 1 WHERE id = 1",
      );
    });
    expect((await close(closeBody(f.generation))).status).toBe(409);
    expect(await f.conversation.state()).toBe("HUMAN_HANDOFF");
    await runInDurableObject(coordinator(), (_i, state) => {
      state.storage.sql.exec(
        "UPDATE mp06_pilot_session SET in_flight = 0 WHERE id = 1",
      );
    });
  });

  it("refuses a stale expected generation without mutating the handoff", async () => {
    const f = await freshFixture(6);
    expect((await close(closeBody(f.generation + 1))).status).toBe(409);
    expect(await f.conversation.state()).toBe("HUMAN_HANDOFF");
  });

  it("never takes the fresh path when retired WP8F lineage exists", async () => {
    const f = await freshFixture(7);
    await runInDurableObject(coordinator(), (_i, state) => {
      state.storage.sql.exec(
        "CREATE TABLE mp06_wp8f_activation (id INTEGER PRIMARY KEY)",
      );
    });
    expect(await coordinator().freshHandoffCloseTarget()).toBeNull();
    expect((await close(closeBody(f.generation))).status).toBe(409);
    expect(await f.conversation.state()).toBe("HUMAN_HANDOFF");
    await runInDurableObject(coordinator(), (_i, state) => {
      state.storage.sql.exec("DROP TABLE mp06_wp8f_activation");
    });
  });
});
