import { MigrationInterface, QueryRunner } from 'typeorm';

export class V8InboxTables1749700000000 implements MigrationInterface {
  name = 'V8InboxTables1749700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "inbox_channel_enum" AS ENUM ('facebook','telegram','web_chat','zalo')
    `);
    await queryRunner.query(`
      CREATE TYPE "conversation_status_enum" AS ENUM ('open','assigned','resolved','closed')
    `);
    await queryRunner.query(`
      CREATE TYPE "message_direction_enum" AS ENUM ('inbound','outbound')
    `);
    await queryRunner.query(`
      CREATE TYPE "message_status_enum" AS ENUM ('received','read','replied','failed')
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inbox_conversations" (
        "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "channel"        "inbox_channel_enum"       NOT NULL,
        "externalId"     varchar                    NOT NULL,
        "customerId"     varchar,
        "customerName"   varchar,
        "customerPhone"  varchar,
        "customerAvatar" varchar,
        "status"         "conversation_status_enum" NOT NULL DEFAULT 'open',
        "assignedTo"     varchar,
        "lastMessage"    text,
        "lastMessageAt"  timestamptz,
        "unreadCount"    integer NOT NULL DEFAULT 0,
        "meta"           jsonb,
        "createdAt"      timestamptz NOT NULL DEFAULT now(),
        "updatedAt"      timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_inbox_conv_channel_external" UNIQUE ("channel","externalId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inbox_messages" (
        "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversationId" uuid        NOT NULL,
        "direction"      "message_direction_enum" NOT NULL,
        "content"        text        NOT NULL,
        "senderId"       varchar,
        "senderName"     varchar,
        "externalId"     varchar,
        "attachmentUrl"  varchar,
        "attachmentType" varchar,
        "status"         "message_status_enum" NOT NULL DEFAULT 'received',
        "meta"           jsonb,
        "createdAt"      timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_inbox_conv_status_last" ON "inbox_conversations" ("status","lastMessageAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_inbox_conv_customer" ON "inbox_conversations" ("customerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_inbox_msg_conv_created" ON "inbox_messages" ("conversationId","createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "inbox_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inbox_conversations"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "message_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "message_direction_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "conversation_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "inbox_channel_enum"`);
  }
}
