import express, { NextFunction, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

dotenv.config();

// Kontrollera att miljövariablerna är definierade
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY || !process.env.JWT_SECRET) {
  console.error('Nödvändiga miljövariabler saknas i .env-filen');
  process.exit(1);
}

const app = express();
const port = 3000;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: ['https://kaninspelet.onrender.com', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

app.options('*', cors());

// Middleware för att verifiera JWT-token
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'Ingen token tillhandahållen' });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
    if (err) {
      res.status(403).json({ error: 'Ogiltig token' });
      return;
    }
    req.body.user = decoded; // Detta inkluderar `user_id` från token-payload
    next();
  });
};

/** USERS ROUTES */

// Hämta den inloggade användaren baserat på token
app.get('/users', authenticateToken, async (req: Request, res: Response) => {
  const userId = req.body.user.id;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Användaren hittades inte.' });
      return;
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Serverfel vid hämtning av användaren.' });
  }
});

// Skapa användare
app.post('/users/register', async (req: Request, res: Response) => {
  const { name, password } = req.body;
  const passwordValidationRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;


  if (!passwordValidationRegex.test(password)) {
    return res.status(400).json({ error: "Lösenordet måste vara minst 8 tecken, innehålla minst en stor och en liten bokstav, en siffra och ett specialtecken." });
  }

  try {
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('name', name)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Namnet är redan upptaget. Välj ett annat namn.' });
    }

    // Hasha lösenordet
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase.from('users').insert([
      { name, password: hashedPassword },
    ]);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ message: 'Användare registrerad!', data });
  } catch (err) {
    res.status(500).json({ error: 'Kunde inte registrera användaren.' });
  }
});


// Logga in användare
const SECRET_KEY = process.env.JWT_SECRET || 'fallback_secret_key';

app.post('/auth/login', async (req: Request, res: Response): Promise<void> => {
  const { name, password } = req.body;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('name', name)
      .single();

    if (error || !data) {
      res.status(401).json({ error: 'Fel användarnamn eller lösenord.' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, data.password);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Fel användarnamn eller lösenord.' });
      return;
    }

    const token = jwt.sign(
      { id: data.user_id, name: data.name },
      SECRET_KEY,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Inloggning lyckades',
      token,
      user: {
        id: data.user_id,
        name: data.name,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Serverfel vid inloggning.' });
  }
});

/** GAME RESULTS ROUTES */

// Hämta alla spelresultat med användarnamn
app.get('/game_results', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('game_results')
      .select('*, users(name)')
      .order('total_score', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game results from Supabase' });
  }
});

// Lägg till ett nytt spelresultat
app.post('/game_results', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { user_id, total_score, game_date, golden_rabbits } = req.body;
  const tokenUserId = req.body.user.id;

  if (user_id !== tokenUserId) {
    res.status(403).json({ error: 'User ID does not match token' });
    return;
  }

  const gameDateToInsert = game_date || new Date().toISOString();

  try {
    const { data, error } = await supabase.from('game_results').insert([
      { user_id: tokenUserId, total_score, game_date: gameDateToInsert, golden_rabbits },
    ]);

    if (error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(201).json({ message: 'Game result saved successfully', data });
    }
  } catch (err) {
    res.status(500).json({ error: 'Could not save game result.' });
  }
});


// Hämta alla spelresultat från specifik användare:
app.get('/game_results/:user_id', async (req: Request, res: Response): Promise<void> => {
  const { user_id } = req.params;

  try {
    const { data, error } = await supabase
      .from('game_results')
      .select('*')
      .eq('user_id', user_id);

    if (error) {
      res.status(500).json({ error: error.message });
    } else if (!data || data.length === 0) {
      res.status(404).json({ message: 'Inga spelresultat hittades för användaren.' });
    } else {
      res.status(200).json({ results: data });
    }
  } catch (err) {
    res.status(500).json({ error: 'Kunde inte hämta spelresultat.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
