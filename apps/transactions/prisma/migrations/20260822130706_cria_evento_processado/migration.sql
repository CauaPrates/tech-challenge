-- CreateTable
CREATE TABLE "processed_event" (
    "consumer" VARCHAR(100) NOT NULL,
    "event_id" UUID NOT NULL,
    "event_name" VARCHAR(100) NOT NULL,
    "processed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_event_pkey" PRIMARY KEY ("consumer","event_id")
);
