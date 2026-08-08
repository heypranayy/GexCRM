-- Branch geofence settings + INR currency for GST invoicing

ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "officeLat" DECIMAL(10,7);
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "officeLng" DECIMAL(10,7);
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "geofenceRadiusMeters" INTEGER DEFAULT 200;

-- Default Mumbai HQ geofence for seeded branch
UPDATE "Branch"
SET "officeLat" = 19.0760, "officeLng" = 72.8777, "geofenceRadiusMeters" = 200
WHERE "id" = '00000000-0000-0000-0000-000000000001'
  AND "officeLat" IS NULL;

-- INR currency for Indian GST invoicing
INSERT INTO "Currency" ("code", "name", "symbol", "isEnabled", "isDefault", "createdAt", "updatedAt")
VALUES ('INR', 'Indian Rupee', '₹', true, false, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;
