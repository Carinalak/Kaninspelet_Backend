import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Kontrollera att miljövariablerna är definierade
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('Supabase URL or Supabase Key is not defined in .env file');
}

// Ladda miljövariabler från .env-filen
dotenv.config();

const app = express();
const port = 3000;

// Middleware för att tolka JSON
app.use(express.json()); 

// Definiera typ för användare
interface User {
  name: string;
  password: string;
}

// Konfigurera Supabase-klienten
const supabase = createClient(
  process.env.SUPABASE_URL!,  // Supabase URL från miljövariabler
  process.env.SUPABASE_KEY!   // Supabase API-nyckel från miljövariabler
);

// Skapa en användare
app.post('/users', async (req: Request, res: Response) => {
  const { name, password }: User = req.body;  // Använd User-typen för att definiera req.body

  if (!name || !password) {
    return res.status(400).json({ error: 'Name and password are required' });
  }

  try {
    // Skapa användaren i Supabase
    const { data, error } = await supabase
      .from('users')
      .insert([{ name, password }])
      .single();  // Returnera endast en användare

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Returnera den skapade användaren
    res.status(201).json({
      message: 'User created successfully',
      data: {
        name: data.name,
        password: data.password,  // VARNING: att returnera lösenord är osäkert i verkliga produktion
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating user' });
  }
});

// Starta servern
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
