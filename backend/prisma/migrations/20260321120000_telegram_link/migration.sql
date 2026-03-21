-- CreateTable
CREATE TABLE "telegram_links" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_links_customer_id_key" ON "telegram_links"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_links_token_key" ON "telegram_links"("token");

-- AddForeignKey
ALTER TABLE "telegram_links" ADD CONSTRAINT "telegram_links_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
