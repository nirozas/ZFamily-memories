import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// import { migrateEventImages } from './utils/migrateImages';
import './index.css';
import App from './App';

// Migration disabled - run manually from Media Library instead
// const hasRunMigration = localStorage.getItem('event_images_migrated');
// if (!hasRunMigration) {
//   console.log('🚀 Running event image migration...');
//   migrateEventImages().then(result => {
//     if (result.success) {
//       console.log('✅ Migration complete:', result);
//       localStorage.setItem('event_images_migrated', 'true');
//     } else {
//       console.error('❌ Migration failed:', result.error);
//     }
//   });
// }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
