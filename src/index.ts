import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js'; // Importera Supabase-klienten
import { Pool } from 'pg'; // PostgreSQL-klient för din lokala databas
import dotenv from 'dotenv';

// Ladda miljövariabler från .env-filen
dotenv.config();

const app = express();
const port = 3000;

// Konfigurera Supabase-klienten
const supabase = createClient(
  process.env.SUPABASE_URL!,  // Supabase URL från miljövariabler
  process.env.SUPABASE_KEY!   // Supabase API-nyckel från miljövariabler
);

// PostgreSQL-klient via pg-modulen (om du använder en lokal databas eller Supabase PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // PostgreSQL URL (den kan vara från Supabase eller lokal databas)
});

// Skapa en separat asynkron funktion för att hämta användare från Supabase
const getUsersFromSupabase = async (): Promise<any> => {
  const { data, error } = await supabase
    .from('users') // Hämta från tabellen 'users'
    .select('*');  // Hämta alla kolumner

  if (error) {
    throw new Error(error.message); // Kasta ett fel om det uppstår
  }

  return data; // Returnera datan om ingen fel uppstår
};

// Express-rutt för att hämta användare från Supabase
app.get('/users', async (req: Request, res: Response) => {
  try {
    const users = await getUsersFromSupabase(); // Hämta användare från Supabase
    res.json(users); // Skicka tillbaka användarna som JSON
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users from Supabase' }); // Hantera fel
  }
});

// Skapa en PostgreSQL-rutt för att hämta användare från din lokala PostgreSQL-databas
app.get('/local-users', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM users'); // Hämta användare från lokal databas
    res.json(result.rows); // Skicka tillbaka användarna från PostgreSQL som JSON
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users from local DB' });
  }
});

// Starta servern
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
