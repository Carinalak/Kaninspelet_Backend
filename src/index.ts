import express, { NextFunction, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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
//app.use(cors());

app.use(
  cors({
    origin: ['https://kaninspelet.onrender.com', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
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

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      res.status(403).json({ error: 'Ogiltig token' });
      return;
    }
    req.body.user = user;
    next();
  });
};


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
      console.error("Användaren hittades inte eller annat fel:", error);
      res.status(401).json({ error: 'Fel användarnamn eller lösenord.' });
      return;
    }

    // Verifiera lösenordet med bcrypt
    const isPasswordValid = await bcrypt.compare(password, data.password);

    if (!isPasswordValid) {
      console.error("Lösenordet stämmer inte.");
      res.status(401).json({ error: 'Fel användarnamn eller lösenord.' });
      return;
    }

    
    // Skapa JWT-token
    const token = jwt.sign(
      { id: data.user_id, name: data.name },
      process.env.JWT_SECRET!
    );

    res.status(200).json({ message: 'Inloggning lyckades', token });
  } catch (err) {
    res.status(500).json({ error: 'Serverfel vid inloggning.' });
  }
});
/*
    // Inloggning lyckades
    res.status(200).json({ message: 'Inloggning lyckades', user: { id: data.user_id, name: data.name } });
  } catch (err) {
    console.error("Oväntat serverfel:", err);
    res.status(500).json({ error: 'Serverfel vid inloggning.' });
  }
});*/

// Ta bort en användare
app.delete('/user/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('user_id', id);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ message: 'Användare borttagen.', data });
  } catch (err) {
    res.status(500).json({ error: 'Kunde inte ta bort användaren.' });
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

app.post('/game_results', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  const { user_id, total_score } = req.body;

  try {
    const { data, error } = await supabase.from('game_results').insert([
      { user_id, total_score }
    ]);

    if (error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(201).json({ message: 'Game result saved successfully', data });
    }
  } catch (err) {
    res.status(500).json({ error: 'Kunde inte spara spelets resultat.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
