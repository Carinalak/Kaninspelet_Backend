import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

// Kontrollera att miljövariablerna är definierade
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('Supabase URL or Supabase Key is not defined in .env file');
  process.exit(1);
}

const app = express();
const port = 3000;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

app.use(express.json());
app.use(cors());

/** USERS ROUTES */

const getUsersFromSupabase = async (): Promise<any> => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw new Error(error.message);
  return data;
};

// Hämta alla användare
app.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await getUsersFromSupabase();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users from Supabase' });
  }
});

// Skapa en ny användare
app.post('/users', async (req: Request, res: Response) => {
  const { name, password } = req.body;

  const { data, error } = await supabase.from('users').insert([
    { name: name, password: password }
  ]);

  if (error) {
    res.status(500).json({ error: error.message });
  } else {
    res.status(201).json({ message: 'User created successfully', data });
  }
});

/** GAME RESULTS ROUTES */



// Hämta alla game results
app.get('/game_results', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('game_results').select('*'); // Korrekt tabellnamn
    if (error) {
      throw new Error(error.message);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game results from Supabase' });
  }
});

// Funktion för att lägga till ett spelresultat
app.post('/game_results', async (req: Request, res: Response) => {
  const { user_id, score, game_time } = req.body;

  const { data, error } = await supabase.from('game_results').insert([
    {
      user_id: user_id,
      score: score,
      game_time: game_time,
    },
  ]);

  if (error) {
    res.status(500).json({ error: error.message });
  } else {
    res.status(201).json({ message: 'Game result saved successfully', data });
  }
});

// Hämta alla spelresultat
app.get('/game_results', async (req: Request, res: Response) => {
  const { data, error } = await supabase.from('game_results').select('*');

  if (error) {
    res.status(500).json({ error: error.message });
  } else {
    res.json(data);
  }
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
