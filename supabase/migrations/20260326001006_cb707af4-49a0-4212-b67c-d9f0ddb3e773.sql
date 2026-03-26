
-- Make payment-proofs bucket public so admin can view proof images
UPDATE storage.buckets SET public = true WHERE id = 'payment-proofs';

-- Add RLS policy for authenticated users to upload payment proofs
CREATE POLICY "Authenticated users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

-- Add RLS policy for anyone to read payment proofs (public bucket)
CREATE POLICY "Anyone can view payment proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs');
