import { createServiceRoleClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { MediaRenderError } from '@/lib/utils/errors'

const BUCKET_NAME = 'generations'

/**
 * Upload file buffer to Supabase Storage
 */
export async function uploadBuffer(
  buffer: Buffer,
  options: {
    path: string
    contentType: string
    bucket?: string
  }
): Promise<string> {
  const { path, contentType, bucket = BUCKET_NAME } = options

  logger.info('Uploading buffer to Supabase Storage', {
    path,
    contentType,
    size: buffer.length,
  })

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      upsert: true,
    })

  if (error) {
    logger.error('Failed to upload buffer to storage', error)
    throw new MediaRenderError(
      `Failed to upload file: ${error.message}`,
      'storage',
      { path, error }
    )
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path)

  logger.info('Buffer uploaded successfully', {
    path: data.path,
    public_url: publicUrl,
  })

  return publicUrl
}

/**
 * Upload file from URL to Supabase Storage
 * Useful for copying media from external providers
 */
export async function uploadFromUrl(
  url: string,
  options: {
    path: string
    bucket?: string
  }
): Promise<string> {
  const { path, bucket = BUCKET_NAME } = options

  logger.info('Uploading from URL to Supabase Storage', {
    source_url: url,
    path,
  })

  try {
    // Fetch the file
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get('content-type') || 'application/octet-stream'

    // Upload to Supabase
    return await uploadBuffer(buffer, { path, contentType, bucket })
  } catch (error) {
    logger.error('Failed to upload from URL', error as Error)
    throw new MediaRenderError(
      `Failed to upload from URL: ${(error as Error).message}`,
      'storage',
      { url, path }
    )
  }
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFile(path: string, bucket: string = BUCKET_NAME): Promise<void> {
  logger.info('Deleting file from Supabase Storage', { path })

  const supabase = createServiceRoleClient()

  const { error } = await supabase.storage.from(bucket).remove([path])

  if (error) {
    logger.error('Failed to delete file from storage', error)
    throw new MediaRenderError(
      `Failed to delete file: ${error.message}`,
      'storage',
      { path, error }
    )
  }

  logger.info('File deleted successfully', { path })
}

/**
 * Get public URL for a file in Supabase Storage
 */
export function getPublicUrl(path: string, bucket: string = BUCKET_NAME): string {
  const supabase = createServiceRoleClient()

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path)

  return publicUrl
}

/**
 * Generate unique file path with timestamp
 */
export function generateFilePath(format: 'video' | 'podcast' | 'slides', extension: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  return `${format}/${timestamp}-${random}.${extension}`
}
