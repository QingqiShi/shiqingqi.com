CREATE TABLE "assistant_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"trip_id" uuid,
	"asker_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"ops" jsonb,
	"inverse_ops" jsonb,
	"revision" integer,
	"card" jsonb,
	"parent_id" uuid,
	"action_key" text,
	"tool_call_id" text,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"trip_id" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"summary" text,
	"summary_at" timestamp with time zone,
	"turn_id" uuid,
	"turn_expires_at" timestamp with time zone,
	CONSTRAINT "assistant_conversations_summary_size" CHECK (char_length("assistant_conversations"."summary") <= 8000)
);
--> statement-breakpoint
CREATE TABLE "assistant_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid,
	"user_id" uuid,
	"path" text NOT NULL,
	"content" text NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assistant_memories_one_scope" CHECK (("assistant_memories"."trip_id" is null) <> ("assistant_memories"."user_id" is null)),
	CONSTRAINT "assistant_memories_path_shape" CHECK (char_length("assistant_memories"."path") <= 200 and "assistant_memories"."path" ~ '^[A-Za-z0-9_-][A-Za-z0-9._-]*(/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$'),
	CONSTRAINT "assistant_memories_content_size" CHECK (octet_length("assistant_memories"."content") <= 16384)
);
--> statement-breakpoint
CREATE TABLE "assistant_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"kind" text NOT NULL,
	"message" jsonb NOT NULL,
	"attachments" jsonb,
	"turn_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assistant_messages_conversation_seq_key" UNIQUE("conversation_id","seq")
);
--> statement-breakpoint
ALTER TABLE "assistant_changes" ADD CONSTRAINT "assistant_changes_conversation_id_assistant_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."assistant_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_changes" ADD CONSTRAINT "assistant_changes_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_changes" ADD CONSTRAINT "assistant_changes_asker_id_users_id_fk" FOREIGN KEY ("asker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_changes" ADD CONSTRAINT "assistant_changes_parent_id_assistant_changes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."assistant_changes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_changes" ADD CONSTRAINT "assistant_changes_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_changes" ADD CONSTRAINT "assistant_changes_member_fk" FOREIGN KEY ("trip_id","asker_id") REFERENCES "public"."trip_members"("trip_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_conversations" ADD CONSTRAINT "assistant_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_conversations" ADD CONSTRAINT "assistant_conversations_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_conversations" ADD CONSTRAINT "assistant_conversations_member_fk" FOREIGN KEY ("trip_id","user_id") REFERENCES "public"."trip_members"("trip_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_memories" ADD CONSTRAINT "assistant_memories_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_memories" ADD CONSTRAINT "assistant_memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_memories" ADD CONSTRAINT "assistant_memories_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_conversation_id_assistant_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."assistant_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assistant_changes_conversation_idx" ON "assistant_changes" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "assistant_changes_asker_trip_idx" ON "assistant_changes" USING btree ("asker_id","trip_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_changes_action_key" ON "assistant_changes" USING btree ("parent_id","action_key");--> statement-breakpoint
CREATE INDEX "assistant_conversations_user_trip_idx" ON "assistant_conversations" USING btree ("user_id","trip_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_conversations_open_key" ON "assistant_conversations" USING btree ("user_id","trip_id") WHERE "assistant_conversations"."ended_at" is null and "assistant_conversations"."trip_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_memories_trip_path_key" ON "assistant_memories" USING btree ("trip_id","path") WHERE "assistant_memories"."trip_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "assistant_memories_user_path_key" ON "assistant_memories" USING btree ("user_id","path") WHERE "assistant_memories"."user_id" is not null;--> statement-breakpoint
-- This migration only adds tables and functions, and replaces
-- `trips_forget_user` with a version that does more. It does not change or
-- lock a row of an older table.
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_kind" CHECK ("kind" IN ('model', 'event'));--> statement-breakpoint
ALTER TABLE "assistant_changes" ADD CONSTRAINT "assistant_changes_kind" CHECK ("kind" IN ('applied', 'proposal', 'research'));--> statement-breakpoint
ALTER TABLE "assistant_changes" ADD CONSTRAINT "assistant_changes_status" CHECK ("status" IN ('applied', 'pending', 'accepted', 'skipped', 'undone', 'refused'));--> statement-breakpoint
-- `trips_app` can only select from the four tables, and row-level security
-- shows it only the rows of the viewer: a conversation, its messages and
-- its changes to the user who had it, a personal memory to its user, and a
-- trip memory to the members of the trip. The functions below are the only
-- way for it to write. They run as the owner of the tables, so each one
-- makes its own check of the viewer.
GRANT SELECT ON "assistant_conversations", "assistant_messages", "assistant_changes", "assistant_memories" TO "trips_app";--> statement-breakpoint
ALTER TABLE "assistant_conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assistant_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assistant_changes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assistant_memories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "own_conversation" ON "assistant_conversations" AS PERMISSIVE FOR SELECT TO "trips_app" USING ("user_id" = public.trips_viewer_id());--> statement-breakpoint
CREATE POLICY "own_conversation" ON "assistant_messages" AS PERMISSIVE FOR SELECT TO "trips_app" USING (EXISTS (SELECT 1 FROM "assistant_conversations" WHERE "assistant_conversations"."id" = "assistant_messages"."conversation_id" AND "assistant_conversations"."user_id" = public.trips_viewer_id()));--> statement-breakpoint
CREATE POLICY "own_change" ON "assistant_changes" AS PERMISSIVE FOR SELECT TO "trips_app" USING ("asker_id" = public.trips_viewer_id());--> statement-breakpoint
CREATE POLICY "own_or_member_memory" ON "assistant_memories" AS PERMISSIVE FOR SELECT TO "trips_app" USING ("user_id" = public.trips_viewer_id() OR EXISTS (SELECT 1 FROM "trip_members" WHERE "trip_members"."trip_id" = "assistant_memories"."trip_id" AND "trip_members"."user_id" = public.trips_viewer_id()));--> statement-breakpoint
-- True when the viewer can change the trip: an owner or an editor.
CREATE FUNCTION "public"."assistant_viewer_edits"("trip" uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM "public"."trip_members" AS "member" WHERE "member"."trip_id" = "assistant_viewer_edits"."trip" AND "member"."user_id" = public.trips_viewer_id() AND "member"."role" IN ('owner', 'editor')) $$;--> statement-breakpoint
-- Makes calls that open or end the segments of one user in one trip run one
-- after the other until the transaction ends, so that the second sees the
-- segment of the first and does not break `assistant_conversations_open_key`.
CREATE FUNCTION "public"."assistant_lock_segments"("person" uuid, "trip" uuid) RETURNS void
LANGUAGE sql SET search_path = ''
AS $$ SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('assistant_segments:' || "assistant_lock_segments"."person"::text || ':' || "assistant_lock_segments"."trip"::text, 0)) $$;--> statement-breakpoint
-- The open segment of the viewer in a trip that the viewer can change; it
-- makes one when there is none. NULL for any other trip.
CREATE FUNCTION "public"."assistant_current_conversation"("trip" uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  the_viewer uuid := public.trips_viewer_id();
  the_conversation uuid;
BEGIN
  IF the_viewer IS NULL OR NOT public.assistant_viewer_edits("assistant_current_conversation"."trip") THEN
    RETURN NULL;
  END IF;
  PERFORM public.assistant_lock_segments(the_viewer, "assistant_current_conversation"."trip");
  SELECT "row"."id" INTO the_conversation FROM "public"."assistant_conversations" AS "row"
  WHERE "row"."user_id" = the_viewer AND "row"."trip_id" = "assistant_current_conversation"."trip" AND "row"."ended_at" IS NULL;
  IF FOUND THEN
    RETURN the_conversation;
  END IF;
  INSERT INTO "public"."assistant_conversations" ("user_id", "trip_id", "started_at")
  VALUES (the_viewer, "assistant_current_conversation"."trip", pg_catalog.clock_timestamp())
  ON CONFLICT ("user_id", "trip_id") WHERE "ended_at" IS NULL AND "trip_id" IS NOT NULL DO NOTHING
  RETURNING "id" INTO the_conversation;
  IF the_conversation IS NULL THEN
    SELECT "row"."id" INTO the_conversation FROM "public"."assistant_conversations" AS "row"
    WHERE "row"."user_id" = the_viewer AND "row"."trip_id" = "assistant_current_conversation"."trip" AND "row"."ended_at" IS NULL;
  END IF;
  RETURN the_conversation;
END
$$;--> statement-breakpoint
-- Ends the open segment of the viewer in the trip, if any, and starts a new
-- one. With no trip, it starts a conversation for a trip that is not made
-- yet. NULL for a trip that the viewer cannot change.
CREATE FUNCTION "public"."assistant_start_conversation"("trip" uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  the_viewer uuid := public.trips_viewer_id();
  the_conversation uuid;
BEGIN
  IF the_viewer IS NULL OR ("assistant_start_conversation"."trip" IS NOT NULL AND NOT public.assistant_viewer_edits("assistant_start_conversation"."trip")) THEN
    RETURN NULL;
  END IF;
  IF "assistant_start_conversation"."trip" IS NOT NULL THEN
    PERFORM public.assistant_lock_segments(the_viewer, "assistant_start_conversation"."trip");
    UPDATE "public"."assistant_conversations" AS "row" SET "ended_at" = pg_catalog.clock_timestamp()
    WHERE "row"."user_id" = the_viewer AND "row"."trip_id" = "assistant_start_conversation"."trip" AND "row"."ended_at" IS NULL;
  END IF;
  INSERT INTO "public"."assistant_conversations" ("user_id", "trip_id", "started_at")
  VALUES (the_viewer, "assistant_start_conversation"."trip", pg_catalog.clock_timestamp())
  RETURNING "id" INTO the_conversation;
  RETURN the_conversation;
END
$$;--> statement-breakpoint
-- Ends a segment of the viewer. False when it is not open.
CREATE FUNCTION "public"."assistant_end_conversation"("conversation" uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$ WITH "ended" AS (UPDATE "public"."assistant_conversations" AS "row" SET "ended_at" = pg_catalog.clock_timestamp() WHERE "row"."id" = "assistant_end_conversation"."conversation" AND "row"."user_id" = public.trips_viewer_id() AND "row"."ended_at" IS NULL RETURNING 1) SELECT EXISTS (SELECT 1 FROM "ended") $$;--> statement-breakpoint
-- Opens an ended segment of the viewer again, to go on with it, and ends
-- the segment that was open in the same trip. The summary stays until the
-- app writes a new one.
CREATE FUNCTION "public"."assistant_reopen_conversation"("conversation" uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  the_viewer uuid := public.trips_viewer_id();
  the_row record;
BEGIN
  SELECT "row"."id", "row"."trip_id" INTO the_row FROM "public"."assistant_conversations" AS "row"
  WHERE "row"."id" = "assistant_reopen_conversation"."conversation" AND "row"."user_id" = the_viewer;
  IF NOT FOUND OR (the_row.trip_id IS NOT NULL AND NOT public.assistant_viewer_edits(the_row.trip_id)) THEN
    RETURN false;
  END IF;
  IF the_row.trip_id IS NOT NULL THEN
    PERFORM public.assistant_lock_segments(the_viewer, the_row.trip_id);
  END IF;
  PERFORM 1 FROM "public"."assistant_conversations" AS "row" WHERE "row"."id" = the_row.id FOR UPDATE;
  IF the_row.trip_id IS NOT NULL THEN
    UPDATE "public"."assistant_conversations" AS "row" SET "ended_at" = pg_catalog.clock_timestamp()
    WHERE "row"."user_id" = the_viewer AND "row"."trip_id" = the_row.trip_id AND "row"."ended_at" IS NULL AND "row"."id" <> the_row.id;
  END IF;
  UPDATE "public"."assistant_conversations" AS "row" SET "ended_at" = NULL WHERE "row"."id" = the_row.id;
  RETURN true;
END
$$;--> statement-breakpoint
-- Writes the summary of a segment of the viewer, in place of any before.
CREATE FUNCTION "public"."assistant_save_summary"("conversation" uuid, "summary" text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$ WITH "saved" AS (UPDATE "public"."assistant_conversations" AS "row" SET "summary" = "assistant_save_summary"."summary", "summary_at" = pg_catalog.clock_timestamp() WHERE "row"."id" = "assistant_save_summary"."conversation" AND "row"."user_id" = public.trips_viewer_id() RETURNING 1) SELECT EXISTS (SELECT 1 FROM "saved") $$;--> statement-breakpoint
-- Adds messages to the end of a segment of the viewer, in the order of the
-- array, and gives the `seq` of the first. Each element is
-- `{ "kind", "message", "attachments" }`. NULL when another turn holds the
-- segment (the turn that holds it passes its id), and for a `model` message
-- in an ended segment that no running turn holds.
CREATE FUNCTION "public"."assistant_append_messages"("conversation" uuid, "turn" uuid, "messages" jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  the_viewer uuid := public.trips_viewer_id();
  the_row record;
  holds_turn boolean;
  first_seq integer;
BEGIN
  IF pg_catalog.jsonb_typeof("assistant_append_messages"."messages") IS DISTINCT FROM 'array' OR pg_catalog.jsonb_array_length("assistant_append_messages"."messages") = 0 THEN
    RETURN NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_array_elements("assistant_append_messages"."messages") AS "element"("value")
    WHERE "element"."value"->'message' IS NULL OR pg_catalog.octet_length("element"."value"::text) > 1048576
  ) THEN
    RAISE EXCEPTION 'A message is missing or larger than 1 MiB.' USING ERRCODE = 'check_violation';
  END IF;
  SELECT "row"."id", "row"."trip_id", "row"."ended_at", "row"."turn_id", "row"."turn_expires_at" INTO the_row
  FROM "public"."assistant_conversations" AS "row"
  WHERE "row"."id" = "assistant_append_messages"."conversation" AND "row"."user_id" = the_viewer
  FOR UPDATE;
  IF NOT FOUND OR (the_row.trip_id IS NOT NULL AND NOT public.assistant_viewer_edits(the_row.trip_id)) THEN
    RETURN NULL;
  END IF;
  -- A turn whose time ended, after another turn took the segment, adds
  -- nothing more.
  IF "assistant_append_messages"."turn" IS NOT NULL AND the_row.turn_id IS DISTINCT FROM "assistant_append_messages"."turn" THEN
    RETURN NULL;
  END IF;
  holds_turn := COALESCE(the_row.turn_expires_at > pg_catalog.clock_timestamp() AND the_row.turn_id = "assistant_append_messages"."turn", false);
  IF the_row.turn_expires_at > pg_catalog.clock_timestamp() AND NOT holds_turn THEN
    RETURN NULL;
  END IF;
  -- A turn that runs while its segment ends, and an event of a change in
  -- an older segment, still add their rows.
  IF the_row.ended_at IS NOT NULL AND NOT holds_turn AND EXISTS (
    SELECT 1 FROM pg_catalog.jsonb_array_elements("assistant_append_messages"."messages") AS "element"("value")
    WHERE "element"."value"->>'kind' IS DISTINCT FROM 'event'
  ) THEN
    RETURN NULL;
  END IF;
  SELECT COALESCE(pg_catalog.max("message"."seq"), 0) + 1 INTO first_seq
  FROM "public"."assistant_messages" AS "message"
  WHERE "message"."conversation_id" = the_row.id;
  INSERT INTO "public"."assistant_messages" ("conversation_id", "seq", "kind", "message", "attachments", "turn_id")
  SELECT the_row.id, first_seq + "element"."position"::integer - 1, "element"."value"->>'kind', "element"."value"->'message', NULLIF("element"."value"->'attachments', 'null'::jsonb), "assistant_append_messages"."turn"
  FROM pg_catalog.jsonb_array_elements("assistant_append_messages"."messages") WITH ORDINALITY AS "element"("value", "position");
  IF EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements("assistant_append_messages"."messages") AS "element"("value") WHERE "element"."value"->>'kind' = 'model') THEN
    UPDATE "public"."assistant_conversations" AS "row" SET "last_message_at" = pg_catalog.clock_timestamp() WHERE "row"."id" = the_row.id;
  END IF;
  RETURN first_seq;
END
$$;--> statement-breakpoint
-- Takes the turn of the viewer in the trip of an open segment, for
-- `seconds`, and gives the id of the turn. One user runs one turn per trip
-- at a time, across all of that user's segments in the trip; a turn that
-- is not released frees itself when its time ends. NULL when another turn
-- holds it.
CREATE FUNCTION "public"."assistant_take_turn"("conversation" uuid, "seconds" integer) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  the_viewer uuid := public.trips_viewer_id();
  the_row record;
  the_turn uuid;
BEGIN
  IF "assistant_take_turn"."seconds" IS NULL OR "assistant_take_turn"."seconds" NOT BETWEEN 1 AND 3600 THEN
    RETURN NULL;
  END IF;
  SELECT "row"."id", "row"."trip_id" INTO the_row FROM "public"."assistant_conversations" AS "row"
  WHERE "row"."id" = "assistant_take_turn"."conversation" AND "row"."user_id" = the_viewer AND "row"."ended_at" IS NULL;
  IF NOT FOUND OR (the_row.trip_id IS NOT NULL AND NOT public.assistant_viewer_edits(the_row.trip_id)) THEN
    RETURN NULL;
  END IF;
  -- The locks make two requests for a turn in one trip run one after the
  -- other, so that the second sees the turn of the first.
  PERFORM 1 FROM "public"."assistant_conversations" AS "row"
  WHERE "row"."user_id" = the_viewer AND ("row"."id" = the_row.id OR "row"."trip_id" = the_row.trip_id)
  ORDER BY "row"."id"
  FOR UPDATE;
  IF EXISTS (
    SELECT 1 FROM "public"."assistant_conversations" AS "row"
    WHERE "row"."user_id" = the_viewer AND ("row"."id" = the_row.id OR "row"."trip_id" = the_row.trip_id)
      AND "row"."turn_expires_at" > pg_catalog.clock_timestamp()
  ) THEN
    RETURN NULL;
  END IF;
  the_turn := pg_catalog.gen_random_uuid();
  UPDATE "public"."assistant_conversations" AS "row"
  SET "turn_id" = the_turn, "turn_expires_at" = pg_catalog.clock_timestamp() + pg_catalog.make_interval(secs => "assistant_take_turn"."seconds")
  WHERE "row"."id" = the_row.id;
  RETURN the_turn;
END
$$;--> statement-breakpoint
-- Ends a turn of the viewer. False when that turn does not hold the segment.
CREATE FUNCTION "public"."assistant_release_turn"("conversation" uuid, "turn" uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$ WITH "released" AS (UPDATE "public"."assistant_conversations" AS "row" SET "turn_id" = NULL, "turn_expires_at" = NULL WHERE "row"."id" = "assistant_release_turn"."conversation" AND "row"."user_id" = public.trips_viewer_id() AND "row"."turn_id" = "assistant_release_turn"."turn" RETURNING 1) SELECT EXISTS (SELECT 1 FROM "released") $$;--> statement-breakpoint
-- Records what the assistant changed or offered in a segment of the viewer,
-- and gives its id. The first status of each kind: `applied` is `applied`
-- or `refused`; `proposal` and `research` are `pending`. An action of a
-- research card names the card in `parent` and the action in `action_key`;
-- the same action of the same card is recorded once, and the second call
-- gets NULL. NULL also for a conversation that is not the viewer's, and for
-- a trip that the viewer cannot change.
CREATE FUNCTION "public"."assistant_record_change"("conversation" uuid, "kind" text, "status" text, "ops" jsonb, "inverse_ops" jsonb, "revision" integer, "card" jsonb, "parent" uuid, "action_key" text, "tool_call_id" text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  the_viewer uuid := public.trips_viewer_id();
  the_trip uuid;
  the_change uuid;
BEGIN
  SELECT "row"."trip_id" INTO the_trip FROM "public"."assistant_conversations" AS "row"
  WHERE "row"."id" = "assistant_record_change"."conversation" AND "row"."user_id" = the_viewer;
  IF NOT FOUND OR (the_trip IS NOT NULL AND NOT public.assistant_viewer_edits(the_trip)) THEN
    RETURN NULL;
  END IF;
  IF NOT (
    ("assistant_record_change"."kind" = 'applied' AND "assistant_record_change"."status" IN ('applied', 'refused') AND the_trip IS NOT NULL AND "assistant_record_change"."ops" IS NOT NULL)
    OR ("assistant_record_change"."kind" = 'proposal' AND "assistant_record_change"."status" = 'pending' AND the_trip IS NOT NULL AND "assistant_record_change"."ops" IS NOT NULL)
    OR ("assistant_record_change"."kind" = 'research' AND "assistant_record_change"."status" = 'pending' AND "assistant_record_change"."parent" IS NULL)
  ) THEN
    RAISE EXCEPTION 'This kind of change cannot start with this status.' USING ERRCODE = 'check_violation';
  END IF;
  IF ("assistant_record_change"."parent" IS NULL) <> ("assistant_record_change"."action_key" IS NULL) THEN
    RAISE EXCEPTION 'An action of a card needs both the card and the action.' USING ERRCODE = 'check_violation';
  END IF;
  IF "assistant_record_change"."parent" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "public"."assistant_changes" AS "research"
    WHERE "research"."id" = "assistant_record_change"."parent" AND "research"."conversation_id" = "assistant_record_change"."conversation"
      AND "research"."kind" = 'research' AND "research"."status" = 'pending'
  ) THEN
    RETURN NULL;
  END IF;
  INSERT INTO "public"."assistant_changes" ("conversation_id", "trip_id", "asker_id", "kind", "status", "ops", "inverse_ops", "revision", "card", "parent_id", "action_key", "tool_call_id")
  VALUES ("assistant_record_change"."conversation", the_trip, the_viewer, "assistant_record_change"."kind", "assistant_record_change"."status", "assistant_record_change"."ops", "assistant_record_change"."inverse_ops", "assistant_record_change"."revision", "assistant_record_change"."card", "assistant_record_change"."parent", "assistant_record_change"."action_key", "assistant_record_change"."tool_call_id")
  ON CONFLICT ("parent_id", "action_key") DO NOTHING
  RETURNING "id" INTO the_change;
  RETURN the_change;
END
$$;--> statement-breakpoint
-- Moves a change of the viewer to its next status, and gives
-- `{ status, tripId, ops, inverseOps }` for the app to apply. The row lock
-- makes a second request for the same change wait and then find the status
-- moved, so a card that is accepted twice takes effect once: the second
-- request gets NULL. The moves:
--   accept: a pending proposal becomes accepted.
--   skip:   a pending proposal or research card becomes skipped.
--   refuse: a pending proposal becomes refused, when its ops no longer apply.
--   undo:   an applied change or an accepted proposal with inverse ops becomes undone.
CREATE FUNCTION "public"."assistant_decide_change"("change" uuid, "decision" text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  the_viewer uuid := public.trips_viewer_id();
  the_row record;
  next_status text;
BEGIN
  SELECT "row"."id", "row"."trip_id", "row"."kind", "row"."status", "row"."ops", "row"."inverse_ops" INTO the_row
  FROM "public"."assistant_changes" AS "row"
  WHERE "row"."id" = "assistant_decide_change"."change" AND "row"."asker_id" = the_viewer
  FOR UPDATE;
  IF NOT FOUND OR (the_row.trip_id IS NOT NULL AND NOT public.assistant_viewer_edits(the_row.trip_id)) THEN
    RETURN NULL;
  END IF;
  next_status := CASE
    WHEN "assistant_decide_change"."decision" = 'accept' AND the_row.kind = 'proposal' AND the_row.status = 'pending' THEN 'accepted'
    WHEN "assistant_decide_change"."decision" = 'skip' AND the_row.kind IN ('proposal', 'research') AND the_row.status = 'pending' THEN 'skipped'
    WHEN "assistant_decide_change"."decision" = 'refuse' AND the_row.kind = 'proposal' AND the_row.status = 'pending' THEN 'refused'
    WHEN "assistant_decide_change"."decision" = 'undo' AND the_row.status IN ('applied', 'accepted') AND the_row.inverse_ops IS NOT NULL THEN 'undone'
  END;
  IF next_status IS NULL THEN
    RETURN NULL;
  END IF;
  UPDATE "public"."assistant_changes" AS "row"
  SET "status" = next_status, "decided_by" = the_viewer, "decided_at" = pg_catalog.clock_timestamp()
  WHERE "row"."id" = the_row.id;
  RETURN pg_catalog.jsonb_build_object('status', next_status, 'tripId', the_row.trip_id, 'ops', the_row.ops, 'inverseOps', the_row.inverse_ops);
END
$$;--> statement-breakpoint
-- Stores the revision and the inverse ops of an applied change or an
-- accepted proposal of the viewer, once.
CREATE FUNCTION "public"."assistant_set_change_result"("change" uuid, "revision" integer, "inverse_ops" jsonb) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$ WITH "set" AS (UPDATE "public"."assistant_changes" AS "row" SET "revision" = "assistant_set_change_result"."revision", "inverse_ops" = "assistant_set_change_result"."inverse_ops" WHERE "row"."id" = "assistant_set_change_result"."change" AND "row"."asker_id" = public.trips_viewer_id() AND "row"."status" IN ('applied', 'accepted') AND "row"."revision" IS NULL RETURNING 1) SELECT EXISTS (SELECT 1 FROM "set") $$;--> statement-breakpoint
-- Puts a conversation of the viewer that has no trip in a trip that the
-- viewer can change, with its changes, as the open segment of the viewer in
-- that trip. False while another segment of the viewer in that trip runs a
-- turn, because a user runs one turn per trip at a time.
CREATE FUNCTION "public"."assistant_attach_conversation"("conversation" uuid, "trip" uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  the_viewer uuid := public.trips_viewer_id();
BEGIN
  IF the_viewer IS NULL OR NOT public.assistant_viewer_edits("assistant_attach_conversation"."trip") THEN
    RETURN false;
  END IF;
  PERFORM public.assistant_lock_segments(the_viewer, "assistant_attach_conversation"."trip");
  PERFORM 1 FROM "public"."assistant_conversations" AS "row"
  WHERE "row"."user_id" = the_viewer AND ("row"."id" = "assistant_attach_conversation"."conversation" OR "row"."trip_id" = "assistant_attach_conversation"."trip")
  ORDER BY "row"."id"
  FOR UPDATE;
  IF NOT EXISTS (
    SELECT 1 FROM "public"."assistant_conversations" AS "row"
    WHERE "row"."id" = "assistant_attach_conversation"."conversation" AND "row"."user_id" = the_viewer AND "row"."trip_id" IS NULL
  ) OR EXISTS (
    SELECT 1 FROM "public"."assistant_conversations" AS "row"
    WHERE "row"."user_id" = the_viewer AND "row"."trip_id" = "assistant_attach_conversation"."trip"
      AND "row"."turn_expires_at" > pg_catalog.clock_timestamp()
  ) THEN
    RETURN false;
  END IF;
  UPDATE "public"."assistant_conversations" AS "row" SET "ended_at" = pg_catalog.clock_timestamp()
  WHERE "row"."user_id" = the_viewer AND "row"."trip_id" = "assistant_attach_conversation"."trip" AND "row"."ended_at" IS NULL;
  UPDATE "public"."assistant_conversations" AS "row" SET "trip_id" = "assistant_attach_conversation"."trip", "ended_at" = NULL
  WHERE "row"."id" = "assistant_attach_conversation"."conversation";
  UPDATE "public"."assistant_changes" AS "row" SET "trip_id" = "assistant_attach_conversation"."trip"
  WHERE "row"."conversation_id" = "assistant_attach_conversation"."conversation";
  RETURN true;
END
$$;--> statement-breakpoint
-- The memory functions take a trip for the memory of that trip, which an
-- owner or an editor of it can change, or NULL for the viewer's own memory.
-- A path is like `notes/food.md`. A scope holds at most 100 files.
CREATE FUNCTION "public"."assistant_memory_path_ok"("path" text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$ SELECT "assistant_memory_path_ok"."path" IS NOT NULL AND pg_catalog.char_length("assistant_memory_path_ok"."path") <= 200 AND "assistant_memory_path_ok"."path" OPERATOR(pg_catalog.~) '^[A-Za-z0-9_-][A-Za-z0-9._-]*(/[A-Za-z0-9_-][A-Za-z0-9._-]*)*$' $$;--> statement-breakpoint
-- Writes a file of memory in place of any file at its path. Gives
-- `written`, or `forbidden`, `invalid` (path or size) or `full`.
CREATE FUNCTION "public"."assistant_write_memory"("trip" uuid, "path" text, "content" text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  the_viewer uuid := public.trips_viewer_id();
  the_count integer;
BEGIN
  IF the_viewer IS NULL OR ("assistant_write_memory"."trip" IS NOT NULL AND NOT public.assistant_viewer_edits("assistant_write_memory"."trip")) THEN
    RETURN 'forbidden';
  END IF;
  IF NOT public.assistant_memory_path_ok("assistant_write_memory"."path") OR "assistant_write_memory"."content" IS NULL OR pg_catalog.octet_length("assistant_write_memory"."content") > 16384 THEN
    RETURN 'invalid';
  END IF;
  IF "assistant_write_memory"."trip" IS NOT NULL THEN
    SELECT pg_catalog.count(*) INTO the_count FROM "public"."assistant_memories" AS "row"
    WHERE "row"."trip_id" = "assistant_write_memory"."trip" AND "row"."path" <> "assistant_write_memory"."path";
    IF the_count >= 100 THEN
      RETURN 'full';
    END IF;
    INSERT INTO "public"."assistant_memories" ("trip_id", "path", "content", "updated_by")
    VALUES ("assistant_write_memory"."trip", "assistant_write_memory"."path", "assistant_write_memory"."content", the_viewer)
    ON CONFLICT ("trip_id", "path") WHERE "trip_id" IS NOT NULL
    DO UPDATE SET "content" = EXCLUDED."content", "updated_by" = EXCLUDED."updated_by", "updated_at" = pg_catalog.clock_timestamp();
  ELSE
    SELECT pg_catalog.count(*) INTO the_count FROM "public"."assistant_memories" AS "row"
    WHERE "row"."user_id" = the_viewer AND "row"."path" <> "assistant_write_memory"."path";
    IF the_count >= 100 THEN
      RETURN 'full';
    END IF;
    INSERT INTO "public"."assistant_memories" ("user_id", "path", "content", "updated_by")
    VALUES (the_viewer, "assistant_write_memory"."path", "assistant_write_memory"."content", the_viewer)
    ON CONFLICT ("user_id", "path") WHERE "user_id" IS NOT NULL
    DO UPDATE SET "content" = EXCLUDED."content", "updated_by" = EXCLUDED."updated_by", "updated_at" = pg_catalog.clock_timestamp();
  END IF;
  RETURN 'written';
END
$$;--> statement-breakpoint
-- Deletes the file at a path, or every file under it as a directory, and
-- gives how many went. NULL when the viewer cannot change the scope.
CREATE FUNCTION "public"."assistant_delete_memory"("trip" uuid, "path" text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  the_viewer uuid := public.trips_viewer_id();
  the_count integer;
BEGIN
  IF the_viewer IS NULL OR ("assistant_delete_memory"."trip" IS NOT NULL AND NOT public.assistant_viewer_edits("assistant_delete_memory"."trip")) THEN
    RETURN NULL;
  END IF;
  DELETE FROM "public"."assistant_memories" AS "row"
  WHERE (CASE WHEN "assistant_delete_memory"."trip" IS NULL THEN "row"."user_id" = the_viewer ELSE "row"."trip_id" = "assistant_delete_memory"."trip" END)
    AND ("row"."path" = "assistant_delete_memory"."path" OR pg_catalog.starts_with("row"."path", "assistant_delete_memory"."path" || '/'));
  GET DIAGNOSTICS the_count = ROW_COUNT;
  RETURN the_count;
END
$$;--> statement-breakpoint
-- Moves the file at a path, or every file under it as a directory, to a new
-- path. Gives `renamed`, or `forbidden`, `invalid`, `missing` or `exists`.
CREATE FUNCTION "public"."assistant_rename_memory"("trip" uuid, "from_path" text, "to_path" text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  the_viewer uuid := public.trips_viewer_id();
  old_path text := "assistant_rename_memory"."from_path";
  new_path text := "assistant_rename_memory"."to_path";
BEGIN
  IF the_viewer IS NULL OR ("assistant_rename_memory"."trip" IS NOT NULL AND NOT public.assistant_viewer_edits("assistant_rename_memory"."trip")) THEN
    RETURN 'forbidden';
  END IF;
  IF NOT public.assistant_memory_path_ok(old_path) OR NOT public.assistant_memory_path_ok(new_path)
    OR new_path = old_path OR pg_catalog.starts_with(new_path, old_path || '/') THEN
    RETURN 'invalid';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "public"."assistant_memories" AS "row"
    WHERE (CASE WHEN "assistant_rename_memory"."trip" IS NULL THEN "row"."user_id" = the_viewer ELSE "row"."trip_id" = "assistant_rename_memory"."trip" END)
      AND ("row"."path" = old_path OR pg_catalog.starts_with("row"."path", old_path || '/'))
  ) THEN
    RETURN 'missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "public"."assistant_memories" AS "row"
    WHERE (CASE WHEN "assistant_rename_memory"."trip" IS NULL THEN "row"."user_id" = the_viewer ELSE "row"."trip_id" = "assistant_rename_memory"."trip" END)
      AND ("row"."path" = new_path OR pg_catalog.starts_with("row"."path", new_path || '/') OR pg_catalog.starts_with(new_path, "row"."path" || '/'))
  ) THEN
    RETURN 'exists';
  END IF;
  IF EXISTS (
    SELECT 1 FROM "public"."assistant_memories" AS "row"
    WHERE (CASE WHEN "assistant_rename_memory"."trip" IS NULL THEN "row"."user_id" = the_viewer ELSE "row"."trip_id" = "assistant_rename_memory"."trip" END)
      AND pg_catalog.starts_with("row"."path", old_path || '/')
      AND pg_catalog.char_length(new_path) + pg_catalog.char_length("row"."path") - pg_catalog.char_length(old_path) > 200
  ) THEN
    RETURN 'invalid';
  END IF;
  UPDATE "public"."assistant_memories" AS "row"
  SET "path" = new_path || pg_catalog.substr("row"."path", pg_catalog.char_length(old_path) + 1), "updated_by" = the_viewer, "updated_at" = pg_catalog.clock_timestamp()
  WHERE (CASE WHEN "assistant_rename_memory"."trip" IS NULL THEN "row"."user_id" = the_viewer ELSE "row"."trip_id" = "assistant_rename_memory"."trip" END)
    AND ("row"."path" = old_path OR pg_catalog.starts_with("row"."path", old_path || '/'));
  RETURN 'renamed';
END
$$;--> statement-breakpoint
-- `trips_forget_user` of `0004_delete_account.sql`, which now also deletes
-- every conversation of the user, with its messages and changes, and the
-- user's own memory. A trip memory that the user wrote stays with the trip.
CREATE OR REPLACE FUNCTION "public"."trips_forget_user"("person" uuid) RETURNS void
LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  -- When two owners of one trip delete their accounts at the same time, the
  -- lock makes the second wait. It then finds no other owner and deletes the
  -- trip, so that no trip stays without an owner.
  PERFORM 1 FROM "public"."trips" AS "trip"
  WHERE "trip"."id" IN (SELECT "member"."trip_id" FROM "public"."trip_members" AS "member" WHERE "member"."user_id" = "trips_forget_user"."person" AND "member"."role" = 'owner')
  ORDER BY "trip"."id"
  FOR UPDATE;
  DELETE FROM "public"."assistant_conversations" AS "conversation" WHERE "conversation"."user_id" = "trips_forget_user"."person";
  DELETE FROM "public"."assistant_memories" AS "memory" WHERE "memory"."user_id" = "trips_forget_user"."person";
  DELETE FROM "public"."trips" AS "trip" WHERE "trip"."id" IN (SELECT public.trips_owned_only_by("trips_forget_user"."person"));
  DELETE FROM "public"."trip_members" AS "member" WHERE "member"."user_id" = "trips_forget_user"."person";
  DELETE FROM "public"."trip_invites" AS "invite" WHERE "invite"."created_by" = "trips_forget_user"."person";
END
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."assistant_viewer_edits"(uuid), "public"."assistant_lock_segments"(uuid, uuid),"public"."assistant_current_conversation"(uuid), "public"."assistant_start_conversation"(uuid), "public"."assistant_end_conversation"(uuid), "public"."assistant_reopen_conversation"(uuid), "public"."assistant_save_summary"(uuid, text), "public"."assistant_append_messages"(uuid, uuid, jsonb), "public"."assistant_take_turn"(uuid, integer), "public"."assistant_release_turn"(uuid, uuid), "public"."assistant_record_change"(uuid, text, text, jsonb, jsonb, integer, jsonb, uuid, text, text), "public"."assistant_decide_change"(uuid, text), "public"."assistant_set_change_result"(uuid, integer, jsonb), "public"."assistant_attach_conversation"(uuid, uuid), "public"."assistant_memory_path_ok"(text), "public"."assistant_write_memory"(uuid, text, text), "public"."assistant_delete_memory"(uuid, text), "public"."assistant_rename_memory"(uuid, text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "public"."assistant_current_conversation"(uuid), "public"."assistant_start_conversation"(uuid), "public"."assistant_end_conversation"(uuid), "public"."assistant_reopen_conversation"(uuid), "public"."assistant_save_summary"(uuid, text), "public"."assistant_append_messages"(uuid, uuid, jsonb), "public"."assistant_take_turn"(uuid, integer), "public"."assistant_release_turn"(uuid, uuid), "public"."assistant_record_change"(uuid, text, text, jsonb, jsonb, integer, jsonb, uuid, text, text), "public"."assistant_decide_change"(uuid, text), "public"."assistant_set_change_result"(uuid, integer, jsonb), "public"."assistant_attach_conversation"(uuid, uuid), "public"."assistant_write_memory"(uuid, text, text), "public"."assistant_delete_memory"(uuid, text), "public"."assistant_rename_memory"(uuid, text, text) TO "trips_app";