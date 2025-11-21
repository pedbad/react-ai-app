import Express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const client = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY,
});

const app = Express();
app.use(Express.json());
const PORT = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
   res.send('Hello, World!');
});

// Simple in-memory storage (use a database in production)
const conversations = new Map();

app.post('/api/chat', async (req: Request, res: Response) => {
   const { prompt, conversationId } = req.body;

   try {
      // Get or create conversation history
      let history = conversations.get(conversationId) || [];

      const messages = [
         { role: 'system', content: 'You are a helpful assistant.' },
         ...history,
         { role: 'user', content: prompt },
      ];

      const response = await client.chat.completions.create({
         model: 'gpt-4o-mini',
         messages: messages,
         temperature: 0.2,
         max_tokens: 100,
      });

      const assistantMessage =
         response.choices[0]?.message?.content || 'No response generated';

      // Save to history
      history.push({ role: 'user', content: prompt });
      history.push({ role: 'assistant', content: assistantMessage });
      conversations.set(conversationId, history);

      res.json({ message: assistantMessage, conversationId });
   } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Failed to generate response' });
   }
});

app.get('/api/hello', (req: Request, res: Response) => {
   res.json({ message: 'Hello from the API!' });
});

app.listen(PORT, () => {
   console.log(`Server is running on http://localhost:${PORT}`);
});
