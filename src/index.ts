import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcrypt';

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

// Hämta alla användare
app.get('/users', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw new Error(error.message);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users from Supabase' });
  }
});

// Skapa användare
app.post('/users/register', async (req: Request, res: Response) => {
  const { name, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('users').insert([
      { name, password: hashedPassword },
    ]);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json({ message: 'Användare registrerad!', data });
  } catch (err) {
    res.status(500).json({ error: 'Kunde inte registrera användaren.' });
  }
});



// Logga in användare
app.post('/auth/login', async (req: Request, res: Response): Promise<void> => {
  const { name, password } = req.body;

  try {
    // Hämta användaren från databasen baserat på namnet
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('name', name)
      .single();

    if (error || !data) {
      res.status(401).json({ error: 'Fel användarnamn eller lösenord.' });
      return; // Avsluta funktionen
    }

    // Verifiera lösenordet med bcrypt
    const isPasswordValid = await bcrypt.compare(password, data.password);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Fel användarnamn eller lösenord.' });
      return;
    }

    // Inloggning lyckades
    res.status(200).json({ message: 'Inloggning lyckades', user: { id: data.id, name: data.name } });
  } catch (err) {
    res.status(500).json({ error: 'Serverfel vid inloggning.' });
  }
});


/** GAME RESULTS ROUTES */

// Hämta alla game results
app.get('/game_results', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('game_results').select('*');
    if (error) {
      throw new Error(error.message);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game results from Supabase' });
  }
});

// Lägg till ett nytt spelresultat
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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
