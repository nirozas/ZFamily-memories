import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, 'user_layouts_raw.txt');
const OUTPUT_FILE = path.join(__dirname, '../supabase/migrations/20260108_add_album_layouts.sql');

function processLayouts() {
    const rawContent = fs.readFileSync(INPUT_FILE, 'utf-8');
    const equations = rawContent.split('\n');

    const layouts = [];

    // Regex for: INSERT INTO album_layouts (image_count, name, category, aspect_ratio, config)
    // Values: (2, 'The Balanced Horizon', 'Symmetric', '1:1', '[...]')
    const regexFull = /\((\d+),\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'(\[.*\])'\)/;

    // Regex for: INSERT INTO album_layouts (image_count,name,is_spread,config)
    // Values: (1,'Single Centered',false,'[...]')
    const regexShort = /\((\d+),\s*'([^']+)',\s*(true|false),\s*'(\[.*\])'\)/;

    // Helper to escape single quotes in JSON string if needed, but they seem correctly escaped in input
    // The input has ' for SQL string delimiters.

    for (const line of equations) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('INSERT') || trimmed.startsWith('CREATE') || trimmed.startsWith('COMMIT') || trimmed.startsWith('BEGIN')) continue;

        // Try full matcher first
        let match = trimmed.match(regexFull);
        if (match) {
            layouts.push({
                image_count: parseInt(match[1]),
                name: match[2],
                category: match[3],
                aspect_ratio: match[4],
                is_spread: false, // Default since full schema usually implies single page in top list
                config: match[5]
            });
            continue;
        }

        // Try short matcher
        match = trimmed.match(regexShort);
        if (match) {
            const isSpread = match[3] === 'true';
            // Infer category based on name or defaults
            let category = 'Symmetric';
            const nameLower = match[2].toLowerCase();
            if (nameLower.includes('hero')) category = 'Asymmetric';
            if (nameLower.includes('asym')) category = 'Asymmetric';
            if (nameLower.includes('editorial')) category = 'Editorial'; // Special category? or map to Asymmetric?
            if (nameLower.includes('scrapbook')) category = 'Scrapbook';
            if (nameLower.includes('golden')) category = 'Symmetric';

            // Infer aspect ratio
            let aspectRatio = '1:1';
            // Start basic

            layouts.push({
                image_count: parseInt(match[1]),
                name: match[2],
                category: category,
                aspect_ratio: aspectRatio,
                is_spread: isSpread,
                config: match[4]
            });
            continue;
        }
    }

    // Generate SQL
    let sql = `
-- ============================================================================
-- ALBUM LAYOUTS & TEMPLATES
-- Combined User Definitions
-- ============================================================================

-- Drop old table if exists to ensure schema update
DROP TABLE IF EXISTS album_layouts CASCADE;

CREATE TABLE IF NOT EXISTS album_layouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Symmetric',
  image_count INTEGER NOT NULL,
  aspect_ratio TEXT DEFAULT 'square', 
  is_spread BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  score INTEGER DEFAULT 0,
  config JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE album_layouts ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read layouts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'album_layouts' AND policyname = 'Everyone can read layouts'
    ) THEN
        CREATE POLICY "Everyone can read layouts" ON album_layouts FOR SELECT USING (true);
    END IF;
END
$$;

INSERT INTO album_layouts (image_count, name, category, aspect_ratio, is_spread, config) VALUES
`;

    const values = layouts.map(l => {
        return `(${l.image_count}, '${l.name}', '${l.category}', '${l.aspect_ratio}', ${l.is_spread}, '${l.config}')`;
    });

    sql += values.join(',\n');
    sql += ';\n';

    fs.writeFileSync(OUTPUT_FILE, sql);
    console.log(`Generated ${values.length} layouts to ${OUTPUT_FILE}`);
}

processLayouts();
