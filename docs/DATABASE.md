# Database Schema Documentation

Complete documentation of the Supabase PostgreSQL database schema, relationships, policies, and data management for the Bunny Tamagotchi application.

## 🗄️ Database Overview

The application uses **Supabase PostgreSQL** with **Row Level Security (RLS)** for secure, multi-tenant data isolation. Each user can only access their own bunny data through database-level security policies.

### Connection Details
- **Database**: PostgreSQL 15+ on Supabase
- **Authentication**: Supabase Auth with JWT tokens
- **Security**: Row Level Security (RLS) policies
- **Extensions**: UUID generation, timestamp utilities

---

## 📊 Core Schema

### 1. Users & Authentication

#### `auth.users` (Managed by Supabase Auth)
Supabase-managed authentication table. Contains user accounts and authentication details.

```sql
-- Managed by Supabase Auth - not directly modified
-- Contains: id, email, encrypted_password, created_at, etc.
```

### 2. Bunny Management

#### `bunnies`
Core table storing bunny entities and their properties.

```sql
CREATE TABLE bunnies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    personality_traits JSONB DEFAULT '{
        "humor": 0.5,
        "energy": 0.5, 
        "friendliness": 0.5
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bunnies_user_id ON bunnies(user_id);
CREATE INDEX idx_bunnies_created_at ON bunnies(created_at);

-- Constraints
ALTER TABLE bunnies ADD CONSTRAINT name_length CHECK (length(name) >= 1 AND length(name) <= 100);
```

**Key Fields:**
- `id`: Unique bunny identifier
- `user_id`: Owner reference (FK to auth.users)
- `name`: User-assigned bunny name
- `personality_traits`: JSON object with humor, energy, friendliness (0.0-1.0)
- `created_at`/`updated_at`: Audit timestamps

### 3. Item System

#### `items`
Master catalog of all available clothing items and accessories.

```sql
CREATE TABLE items (
    id VARCHAR(50) PRIMARY KEY,  -- e.g., 'wizard_hat', 'ballet_slippers'
    name VARCHAR(100) NOT NULL,  -- Display name
    slot VARCHAR(20) NOT NULL,   -- head, face, upper_body, lower_body, feet, accessory
    rarity VARCHAR(20) DEFAULT 'common',  -- common, uncommon, rare, epic, legendary
    cost INTEGER DEFAULT 0,     -- Purchase cost in bunny coins
    image_url TEXT,             -- Item reference image URL
    description TEXT,           -- Item description
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_items_slot ON items(slot);
CREATE INDEX idx_items_rarity ON items(rarity);
CREATE INDEX idx_items_cost ON items(cost);

-- Constraints
ALTER TABLE items ADD CONSTRAINT valid_slot CHECK (
    slot IN ('head', 'face', 'upper_body', 'lower_body', 'feet', 'accessory')
);
ALTER TABLE items ADD CONSTRAINT valid_rarity CHECK (
    rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')
);
ALTER TABLE items ADD CONSTRAINT positive_cost CHECK (cost >= 0);
```

**Slot Types:**
- `head`: Hats, helmets, crowns
- `face`: Glasses, masks, eye patches
- `upper_body`: Shirts, jackets, dresses (upper portion)
- `lower_body`: Pants, skirts, dresses (lower portion)  
- `feet`: Shoes, boots, slippers
- `accessory`: Backpacks, jewelry, toys

**Rarity System:**
- `common`: Basic items, low cost
- `uncommon`: Slightly special items
- `rare`: Unique designs, higher cost
- `epic`: Very special items, rare drops
- `legendary`: Premium items, highest cost

### 4. Inventory Management

#### `bunny_inventory`
Tracks which items each bunny owns and their quantities.

```sql
CREATE TABLE bunny_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bunny_id UUID REFERENCES bunnies(id) ON DELETE CASCADE,
    item_id VARCHAR(50) REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique bunny-item pairs
    UNIQUE(bunny_id, item_id)
);

-- Indexes
CREATE INDEX idx_bunny_inventory_bunny_id ON bunny_inventory(bunny_id);
CREATE INDEX idx_bunny_inventory_item_id ON bunny_inventory(item_id);
CREATE INDEX idx_bunny_inventory_acquired_at ON bunny_inventory(acquired_at);

-- Constraints
ALTER TABLE bunny_inventory ADD CONSTRAINT positive_quantity CHECK (quantity > 0);
```

**Key Features:**
- Unique bunny-item combinations prevent duplicates
- Quantity tracking for stackable items
- Acquisition timestamp for purchase history
- Cascading deletes maintain referential integrity

#### `bunny_equipment`
Tracks which items each bunny currently has equipped.

```sql
CREATE TABLE bunny_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bunny_id UUID REFERENCES bunnies(id) ON DELETE CASCADE,
    item_id VARCHAR(50) REFERENCES items(id) ON DELETE CASCADE,
    slot VARCHAR(20) NOT NULL,
    equipped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique bunny-slot pairs (except accessories)
    UNIQUE(bunny_id, slot, item_id)
);

-- Indexes
CREATE INDEX idx_bunny_equipment_bunny_id ON bunny_equipment(bunny_id);
CREATE INDEX idx_bunny_equipment_slot ON bunny_equipment(slot);
CREATE INDEX idx_bunny_equipment_equipped_at ON bunny_equipment(equipped_at);

-- Constraints
ALTER TABLE bunny_equipment ADD CONSTRAINT valid_equipment_slot CHECK (
    slot IN ('head', 'face', 'upper_body', 'lower_body', 'feet', 'accessory')
);
```

**Equipment Rules:**
- One item per slot (except accessories which can stack)
- Must own item before equipping (referential integrity)
- Slot validation ensures proper item placement
- Equipment history tracked via timestamps

### 5. Outfit System

#### `outfits`
Stores saved outfit combinations for quick switching.

```sql
CREATE TABLE outfits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bunny_id UUID REFERENCES bunnies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    outfit_key VARCHAR(200) UNIQUE,  -- Generated cache key
    equipped_items JSONB NOT NULL,   -- Array of equipped item details
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_outfits_bunny_id ON outfits(bunny_id);
CREATE INDEX idx_outfits_outfit_key ON outfits(outfit_key);
CREATE INDEX idx_outfits_is_favorite ON outfits(is_favorite);
CREATE INDEX idx_outfits_created_at ON outfits(created_at);

-- Constraints
ALTER TABLE outfits ADD CONSTRAINT name_length CHECK (length(name) >= 1 AND length(name) <= 100);
```

**Equipped Items JSON Structure:**
```json
[
  {
    "item_id": "wizard_hat",
    "slot": "head",
    "name": "Mystical Wizard Hat",
    "image_url": "/items/wizard_hat.png"
  },
  {
    "item_id": "ballet_slippers", 
    "slot": "feet",
    "name": "Pink Ballet Slippers",
    "image_url": "/items/ballet_slippers.png"
  }
]
```

### 6. Scene System

#### `scenes`
Available background scenes for outfit composition.

```sql
CREATE TABLE scenes (
    id VARCHAR(50) PRIMARY KEY,  -- e.g., 'meadow', 'forest', 'beach'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scenes_is_active ON scenes(is_active);
CREATE INDEX idx_scenes_created_at ON scenes(created_at);
```

#### `bunny_scenes`
Tracks which scene each bunny is currently using.

```sql
CREATE TABLE bunny_scenes (
    bunny_id UUID REFERENCES bunnies(id) ON DELETE CASCADE,
    scene_id VARCHAR(50) REFERENCES scenes(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    set_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (bunny_id, scene_id)
);

-- Indexes
CREATE INDEX idx_bunny_scenes_bunny_id ON bunny_scenes(bunny_id);
CREATE INDEX idx_bunny_scenes_active ON bunny_scenes(is_active);
```

### 7. Chat History

#### `chat_messages`
Stores conversation history between users and their bunnies.

```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bunny_id UUID REFERENCES bunnies(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    bunny_response TEXT NOT NULL,
    context_data JSONB,  -- Outfit, personality, etc. at time of message
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes  
CREATE INDEX idx_chat_messages_bunny_id ON chat_messages(bunny_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Constraints
ALTER TABLE chat_messages ADD CONSTRAINT message_length CHECK (
    length(user_message) >= 1 AND length(user_message) <= 1000 AND
    length(bunny_response) >= 1 AND length(bunny_response) <= 2000
);
```

**Context Data Structure:**
```json
{
  "outfit": ["wizard_hat", "ballet_slippers"],
  "personality": {
    "humor": 0.8,
    "energy": 0.6, 
    "friendliness": 0.9
  },
  "scene": "meadow",
  "timestamp": "2025-09-04T12:00:00Z"
}
```

---

## 🔒 Row Level Security (RLS) Policies

### Authentication Setup
```sql
-- Enable RLS on all tables
ALTER TABLE bunnies ENABLE ROW LEVEL SECURITY;
ALTER TABLE bunny_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE bunny_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE bunny_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
```

### Core RLS Policies

#### 1. Bunny Access Control
```sql
-- Users can only access their own bunnies
CREATE POLICY bunny_owner_access ON bunnies
    FOR ALL USING (auth.uid() = user_id);

-- Policy breakdown:
-- SELECT: Users can view their bunnies
-- INSERT: Users can create bunnies for themselves
-- UPDATE: Users can modify their bunnies
-- DELETE: Users can delete their bunnies
```

#### 2. Inventory Access Control
```sql
-- Users can only access inventory of their own bunnies
CREATE POLICY inventory_owner_access ON bunny_inventory
    FOR ALL USING (
        bunny_id IN (
            SELECT id FROM bunnies WHERE user_id = auth.uid()
        )
    );
```

#### 3. Equipment Access Control
```sql
-- Users can only access equipment of their own bunnies
CREATE POLICY equipment_owner_access ON bunny_equipment
    FOR ALL USING (
        bunny_id IN (
            SELECT id FROM bunnies WHERE user_id = auth.uid()
        )
    );
```

#### 4. Outfit Access Control
```sql
-- Users can only access outfits of their own bunnies
CREATE POLICY outfit_owner_access ON outfits
    FOR ALL USING (
        bunny_id IN (
            SELECT id FROM bunnies WHERE user_id = auth.uid()
        )
    );
```

#### 5. Chat History Access Control
```sql
-- Users can only access chat history of their own bunnies
CREATE POLICY chat_owner_access ON chat_messages
    FOR ALL USING (
        bunny_id IN (
            SELECT id FROM bunnies WHERE user_id = auth.uid()
        )
    );
```

#### 6. Public Read Access
```sql
-- Items and scenes are publicly readable
CREATE POLICY public_read_items ON items FOR SELECT USING (true);
CREATE POLICY public_read_scenes ON scenes FOR SELECT USING (true);
```

### Service Role Bypass
Some administrative operations require bypassing RLS using the service role:

```typescript
// Admin operations (debug, maintenance)
const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Bypasses RLS for administrative tasks like:
// - Debug inventory population
// - Data cleanup operations
// - System maintenance
```

---

## 🔍 Database Views & Functions

### Commonly Used Views

#### `bunny_with_equipment`
Simplified view joining bunnies with their currently equipped items.

```sql
CREATE VIEW bunny_with_equipment AS
SELECT 
    b.id as bunny_id,
    b.name as bunny_name,
    b.user_id,
    be.item_id,
    be.slot,
    i.name as item_name,
    i.image_url as item_image_url,
    i.rarity
FROM bunnies b
LEFT JOIN bunny_equipment be ON b.id = be.bunny_id
LEFT JOIN items i ON be.item_id = i.id
ORDER BY b.id, be.slot;
```

#### `inventory_summary`
Aggregated view of bunny inventories with item details.

```sql
CREATE VIEW inventory_summary AS
SELECT 
    bi.bunny_id,
    bi.item_id,
    i.name as item_name,
    i.slot,
    i.rarity,
    i.cost,
    bi.quantity,
    bi.acquired_at,
    CASE WHEN be.item_id IS NOT NULL THEN true ELSE false END as is_equipped
FROM bunny_inventory bi
JOIN items i ON bi.item_id = i.id
LEFT JOIN bunny_equipment be ON bi.bunny_id = be.bunny_id AND bi.item_id = be.item_id
ORDER BY bi.bunny_id, i.slot, i.name;
```

### Utility Functions

#### `generate_outfit_key`
Creates consistent cache keys for outfit combinations.

```sql
CREATE OR REPLACE FUNCTION generate_outfit_key(
    base_bunny TEXT,
    equipped_items TEXT[]
) RETURNS TEXT AS $$
BEGIN
    RETURN base_bunny || '_' || array_to_string(
        (SELECT array_agg(item_id ORDER BY item_id) FROM unnest(equipped_items) as item_id),
        ','
    );
END;
$$ LANGUAGE plpgsql;
```

#### `update_bunny_updated_at`
Trigger function to automatically update the `updated_at` timestamp.

```sql
CREATE OR REPLACE FUNCTION update_bunny_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
CREATE TRIGGER update_bunnies_updated_at
    BEFORE UPDATE ON bunnies
    FOR EACH ROW EXECUTE FUNCTION update_bunny_updated_at();

CREATE TRIGGER update_outfits_updated_at
    BEFORE UPDATE ON outfits
    FOR EACH ROW EXECUTE FUNCTION update_bunny_updated_at();
```

---

## 📈 Database Performance

### Indexing Strategy

#### Primary Indexes (Automatic)
- All `id` fields (UUIDs) have automatic primary key indexes
- Foreign key constraints create automatic indexes

#### Custom Indexes
```sql
-- User data access patterns
CREATE INDEX idx_bunnies_user_created ON bunnies(user_id, created_at);
CREATE INDEX idx_inventory_bunny_acquired ON bunny_inventory(bunny_id, acquired_at);

-- Equipment queries
CREATE INDEX idx_equipment_bunny_slot ON bunny_equipment(bunny_id, slot);

-- Chat history pagination
CREATE INDEX idx_chat_bunny_created ON chat_messages(bunny_id, created_at DESC);

-- Item catalog searches
CREATE INDEX idx_items_slot_rarity ON items(slot, rarity);
```

#### Query Optimization
- **Composite Indexes**: Multi-column indexes for common query patterns
- **Partial Indexes**: For filtered queries (e.g., active scenes only)
- **Expression Indexes**: For JSON queries on personality traits
- **Foreign Key Indexes**: Ensure efficient joins

### Connection Management
```typescript
// Supabase handles connection pooling automatically
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  }
);
```

---

## 🔄 Database Migrations

### Migration Management
Database schema changes are managed through structured migration files:

```bash
# Migration file structure
/scripts/migrations/
├── 001_initial_schema.sql      # Core tables and RLS setup
├── 002_add_personality.sql     # Personality traits system
├── 003_outfit_system.sql       # Outfit saving functionality
└── 004_chat_history.sql        # Chat message storage
```

### Migration Commands
```bash
# Run all pending migrations
npm run migrate

# Show migration status
npm run migrate:show

# Manual migration execution
npm run migrate:manual
```

### Sample Migration File
```sql
-- 003_outfit_system.sql
-- Add outfit saving functionality

BEGIN;

-- Create outfits table
CREATE TABLE outfits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bunny_id UUID REFERENCES bunnies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    outfit_key VARCHAR(200) UNIQUE,
    equipped_items JSONB NOT NULL,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_outfits_bunny_id ON outfits(bunny_id);
CREATE INDEX idx_outfits_outfit_key ON outfits(outfit_key);

-- Enable RLS
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

-- Add RLS policy
CREATE POLICY outfit_owner_access ON outfits
    FOR ALL USING (
        bunny_id IN (
            SELECT id FROM bunnies WHERE user_id = auth.uid()
        )
    );

-- Update version tracking
INSERT INTO schema_versions (version, applied_at) VALUES ('003', NOW());

COMMIT;
```

---

## 📊 Sample Data

### Default Items Seed Data
```sql
-- Common head items
INSERT INTO items (id, name, slot, rarity, cost, description) VALUES
('wizard_hat', 'Mystical Wizard Hat', 'head', 'rare', 150, 'A starry blue hat with magical properties'),
('cowboy_hat', 'Classic Cowboy Hat', 'head', 'common', 50, 'A traditional brown cowboy hat'),
('winter_hat', 'Warm Winter Hat', 'head', 'common', 30, 'A cozy knit hat for cold days');

-- Face accessories
INSERT INTO items (id, name, slot, rarity, cost, description) VALUES
('aviator_sunglasses', 'Cool Aviator Sunglasses', 'face', 'uncommon', 75, 'Classic aviator-style sunglasses'),
('masquerade_mask', 'Elegant Masquerade Mask', 'face', 'epic', 200, 'An ornate mask for formal occasions');

-- Clothing items
INSERT INTO items (id, name, slot, rarity, cost, description) VALUES
('striped_tee', 'Classic Striped Tee', 'upper_body', 'common', 25, 'A casual striped t-shirt'),
('tutu', 'Ballet Tutu', 'lower_body', 'uncommon', 80, 'A pink tulle ballet skirt');

-- Footwear
INSERT INTO items (id, name, slot, rarity, cost, description) VALUES
('ballet_slippers', 'Pink Ballet Slippers', 'feet', 'uncommon', 60, 'Soft pink ballet shoes'),
('sneakers', 'Comfortable Sneakers', 'feet', 'common', 40, 'Everyday athletic shoes');
```

### Default Scenes
```sql
INSERT INTO scenes (id, name, description, image_url) VALUES
('meadow', 'Peaceful Meadow', 'A serene meadow with wildflowers and gentle breeze', '/scenes/meadow.jpg'),
('forest', 'Enchanted Forest', 'A mystical forest with towering trees and dappled sunlight', '/scenes/forest.jpg'),
('beach', 'Sunny Beach', 'A tropical beach with palm trees and azure waters', '/scenes/beach.jpg');
```

---

## 🛠️ Database Maintenance

### Regular Maintenance Tasks

#### 1. Cleanup Old Chat History
```sql
-- Delete chat messages older than 30 days
DELETE FROM chat_messages 
WHERE created_at < NOW() - INTERVAL '30 days';
```

#### 2. Vacuum and Analyze
```sql
-- Optimize database performance
VACUUM ANALYZE bunnies;
VACUUM ANALYZE bunny_inventory;
VACUUM ANALYZE chat_messages;
```

#### 3. Index Maintenance
```sql
-- Reindex tables periodically
REINDEX TABLE bunny_inventory;
REINDEX TABLE chat_messages;
```

### Backup Strategy
- **Automated Backups**: Supabase provides automated daily backups
- **Point-in-Time Recovery**: 7-day recovery window
- **Manual Exports**: Periodic full database exports for disaster recovery
- **Schema Versioning**: All migrations tracked and reversible

---

## 🚨 Troubleshooting

### Common Issues

#### 1. RLS Policy Violations
```sql
-- Error: "new row violates row-level security policy"
-- Solution: Verify user authentication and bunny ownership

-- Debug query to check bunny ownership
SELECT b.id, b.user_id, auth.uid()
FROM bunnies b
WHERE b.id = 'your-bunny-id';
```

#### 2. Foreign Key Violations
```sql
-- Error: "violates foreign key constraint"
-- Solution: Ensure referenced records exist

-- Check if bunny exists before adding inventory
SELECT EXISTS(SELECT 1 FROM bunnies WHERE id = 'bunny-id');
```

#### 3. Unique Constraint Violations
```sql
-- Error: "duplicate key value violates unique constraint"
-- Solution: Use UPSERT operations

-- Safe inventory addition
INSERT INTO bunny_inventory (bunny_id, item_id, quantity)
VALUES ('bunny-id', 'item-id', 1)
ON CONFLICT (bunny_id, item_id) 
DO UPDATE SET quantity = bunny_inventory.quantity + 1;
```

### Performance Troubleshooting
```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC LIMIT 10;

-- Check index usage
SELECT tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

*Last updated: September 2025*