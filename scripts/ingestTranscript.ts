#!/usr/bin/env tsx

/**
 * Transcript Ingestion Script
 *
 * This script ingests a CRO keynote transcript and prepares it for RAG retrieval:
 * 1. Reads transcript from file
 * 2. Segments into themed chunks
 * 3. Generates embeddings using OpenAI
 * 4. Inserts into Supabase with pgvector
 *
 * Usage:
 *   npm run ingest-transcript -- --file ./data/keynote-transcript.txt
 *   npm run ingest-transcript -- --file ./data/transcript.txt --theme "Product Launch"
 */

import { readFileSync } from 'fs'
import { createServerSupabase } from '../src/lib/supabase/server'
import { createEmbedding, chunkText } from '../src/lib/providers/openai'
import { logger } from '../src/lib/utils/logger'

interface TranscriptChunk {
  theme: string
  content: string
  sequence: number
}

/**
 * Parse command-line arguments
 */
function parseArgs(): { filePath: string; defaultTheme: string } {
  const args = process.argv.slice(2)
  let filePath = ''
  let defaultTheme = 'General'

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      filePath = args[i + 1]
      i++
    } else if (args[i] === '--theme' && args[i + 1]) {
      defaultTheme = args[i + 1]
      i++
    }
  }

  if (!filePath) {
    console.error('Error: --file argument is required')
    console.log('Usage: npm run ingest-transcript -- --file ./data/transcript.txt')
    process.exit(1)
  }

  return { filePath, defaultTheme }
}

/**
 * Split transcript into themed segments
 * This is a simple heuristic-based approach. In production, use NLP for better segmentation.
 */
function segmentTranscript(text: string, defaultTheme: string): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = []

  // Look for theme markers (e.g., "## Theme: Product Innovation")
  const themePattern = /^##\s*Theme:\s*(.+)$/gm
  const sections = text.split(themePattern)

  if (sections.length === 1) {
    // No theme markers found, treat as single theme
    const contentChunks = chunkText(text, 1000) // ~1000 chars per chunk
    contentChunks.forEach((content, index) => {
      chunks.push({
        theme: defaultTheme,
        content: content.trim(),
        sequence: index + 1,
      })
    })
  } else {
    // Theme markers found
    for (let i = 1; i < sections.length; i += 2) {
      const theme = sections[i].trim()
      const content = sections[i + 1]?.trim() || ''

      if (content) {
        const contentChunks = chunkText(content, 1000)
        contentChunks.forEach((chunk, index) => {
          chunks.push({
            theme,
            content: chunk.trim(),
            sequence: chunks.length + 1,
          })
        })
      }
    }
  }

  return chunks.filter((chunk) => chunk.content.length > 50) // Filter out very short chunks
}

/**
 * Main ingestion function
 */
async function ingestTranscript() {
  const { filePath, defaultTheme } = parseArgs()

  console.log('🚀 Starting transcript ingestion...')
  console.log(`📄 File: ${filePath}`)
  console.log(`🏷️  Default Theme: ${defaultTheme}`)

  try {
    // 1. Read transcript file
    console.log('\n📖 Reading transcript file...')
    const transcriptText = readFileSync(filePath, 'utf-8')
    console.log(`✅ Read ${transcriptText.length} characters`)

    // 2. Insert full transcript into transcript table
    console.log('\n💾 Inserting full transcript...')
    const supabase = createServerSupabase()

    const { data: transcript, error: transcriptError } = await supabase
      .from('transcript')
      .insert({
        title: `CRO Keynote - ${new Date().toLocaleDateString()}`,
        content: transcriptText,
        source: filePath,
      })
      .select()
      .single()

    if (transcriptError || !transcript) {
      throw new Error(`Failed to insert transcript: ${transcriptError?.message}`)
    }

    console.log(`✅ Transcript inserted with ID: ${transcript.id}`)

    // 3. Segment into themed chunks
    console.log('\n🔪 Segmenting transcript into themed chunks...')
    const chunks = segmentTranscript(transcriptText, defaultTheme)
    console.log(`✅ Created ${chunks.length} chunks`)

    // 4. Generate embeddings and insert
    console.log('\n🧠 Generating embeddings and inserting chunks...')
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      try {
        console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.theme})...`)

        // Generate embedding
        const embedding = await createEmbedding(chunk.content)

        // Insert chunk with embedding
        const { error: chunkError } = await supabase.from('transcript_chunks').insert({
          transcript_id: transcript.id,
          theme: chunk.theme,
          content: chunk.content,
          sequence: chunk.sequence,
          embedding,
        })

        if (chunkError) {
          console.error(`❌ Failed to insert chunk ${i + 1}: ${chunkError.message}`)
          errorCount++
        } else {
          successCount++
        }

        // Rate limiting: wait 100ms between API calls
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`❌ Error processing chunk ${i + 1}:`, error)
        errorCount++
      }
    }

    console.log('\n✨ Ingestion complete!')
    console.log(`✅ Successfully inserted: ${successCount} chunks`)
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount} chunks`)
    }

    logger.info('Transcript ingestion complete', {
      transcript_id: transcript.id,
      total_chunks: chunks.length,
      success_count: successCount,
      error_count: errorCount,
    })
  } catch (error) {
    console.error('\n💥 Ingestion failed:', error)
    logger.error('Transcript ingestion error', { error })
    process.exit(1)
  }
}

// Run the script
ingestTranscript()
