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

app.post('/api/chat', async (req: Request, res: Response) => {
   const { prompt } = req.body;

   console.log('API Key exists:', !!process.env.OPENAI_API_KEY);
   console.log('Prompt received:', prompt);

   const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 100,
   });

   res.json({ message: response.choices[0].message.content });
});

app.get('/api/hello', (req: Request, res: Response) => {
   res.json({ message: 'Hello from the API!' });
});

app.listen(PORT, () => {
   console.log(`Server is running on http://localhost:${PORT}`);
});
