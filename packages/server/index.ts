import Express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

// Initialize OpenAI client with API key from environment variables
const client = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Express application
const app = Express();
app.use(Express.json()); // Middleware to parse JSON request bodies
const PORT = process.env.PORT || 3000;

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for validating incoming chat requests
 * - prompt: Required string between 1-2000 characters
 * - conversationId: Optional UUID for continuing existing conversations
 */
const chatRequestSchema = z.object({
   prompt: z
      .string()
      .trim()
      .min(1, 'Prompt cannot be empty')
      .max(2000, 'Prompt too long'),
   conversationId: z
      .string()
      .trim()
      .regex(
         /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
         'Must be a valid UUID'
      )
      .optional(),
});

/**
 * Schema for validating message structure
 * Used to ensure conversation history maintains correct format
 */
const messageSchema = z.object({
   role: z.enum(['user', 'assistant', 'system']),
   content: z.string(),
});

// ============================================================================
// DATA STORAGE
// ============================================================================

/**
 * In-memory storage for conversation histories
 * Key: conversationId (UUID string)
 * Value: Array of messages with role and content
 *
 * NOTE: This is for development only. In production, use a database like:
 * - PostgreSQL with a conversations table
 * - MongoDB for document-based storage
 * - Redis for fast, ephemeral storage
 */
const conversations = new Map<string, z.infer<typeof messageSchema>[]>();

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Health check endpoint
 * Returns a simple greeting to verify server is running
 */
app.get('/', (req: Request, res: Response) => {
   res.send('Hello, World!');
});

/**
 * Main chat endpoint
 * Handles conversational AI requests with context persistence
 *
 * Request body:
 * - prompt: User's message/question
 * - conversationId: (Optional) UUID to continue existing conversation
 *
 * Response:
 * - message: AI assistant's response
 * - conversationId: UUID for this conversation (use in subsequent requests)
 *
 * Flow:
 * 1. Validate request data
 * 2. Retrieve or create conversation history
 * 3. Send full context to OpenAI API
 * 4. Save new messages to history
 * 5. Return response to client
 */
app.post('/api/chat', async (req: Request, res: Response) => {
   try {
      // Validate incoming request data against schema
      const validatedData = chatRequestSchema.parse(req.body);
      const { prompt, conversationId } = validatedData;

      // Generate a new conversation ID if one wasn't provided
      // This allows starting new conversations without client-side UUID generation
      const currentConversationId = conversationId || crypto.randomUUID();

      // Retrieve existing conversation history or initialize empty array
      let history = conversations.get(currentConversationId) || [];

      // Construct messages array for OpenAI API
      // System message sets the assistant's behavior
      // History provides context from previous messages
      // New user prompt is added at the end
      const messages = [
         { role: 'system' as const, content: 'You are a helpful assistant.' },
         ...history,
         { role: 'user' as const, content: prompt },
      ];

      // Call OpenAI Chat Completions API
      // - model: Specifies which AI model to use
      // - messages: Full conversation context
      // - temperature: Controls randomness (0.2 = more focused/deterministic)
      // - max_tokens: Limits response length to control costs
      const response = await client.chat.completions.create({
         model: 'gpt-4o-mini',
         messages: messages,
         temperature: 0.2,
         max_tokens: 100,
      });

      // Extract the assistant's message from the response
      // Use optional chaining and fallback to handle edge cases
      const assistantMessage =
         response.choices[0]?.message?.content || 'No response generated';

      // Update conversation history with both user and assistant messages
      // This maintains context for future requests
      history.push({ role: 'user', content: prompt });
      history.push({ role: 'assistant', content: assistantMessage });
      conversations.set(currentConversationId, history);

      // Return successful response with message and conversation ID
      res.json({
         message: assistantMessage,
         conversationId: currentConversationId,
      });
   } catch (error) {
      // Handle validation errors separately from server errors
      if (error instanceof z.ZodError) {
         // Return 400 Bad Request for invalid input
         res.status(400).json({
            error: 'Validation error',
            details: error.issues, // Changed from error.errors to error.issues
         });
      } else {
         // Log unexpected errors for debugging
         console.error('Error:', error);
         // Return 500 Internal Server Error for API or system failures
         res.status(500).json({ error: 'Failed to generate response' });
      }
   }
});

/**
 * Simple test endpoint
 * Returns a JSON message to verify API is responding
 */
app.get('/api/hello', (req: Request, res: Response) => {
   res.json({ message: 'Hello from the API!' });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

/**
 * Start the Express server
 * Listens on port specified in environment variable or defaults to 3000
 */
app.listen(PORT, () => {
   console.log(`Server is running on http://localhost:${PORT}`);
});
