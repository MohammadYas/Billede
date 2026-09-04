-- iPhones shoot HEIC; when the file input names image/heic, iOS hands over the original instead of a JPEG.
-- The pipeline converts HEIC server-side; the bucket must simply accept it. Run once on the project (also applied via the Supabase MCP on 2026-09-04).
update storage.buckets
set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif'], file_size_limit = 26214400
where id = 'genfundet-private';
