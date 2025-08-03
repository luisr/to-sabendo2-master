// supabase/functions/create-user/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle preflight request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, name, role } = await req.json();

    // Input validation
    if (!email || !password || !name || !role) {
      return new Response(JSON.stringify({ error: 'Email, password, name, and role are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Create the user in the authentication system
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { name: name }
    });

    if (authError) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: `Authentication error: ${authError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!authData.user) {
        throw new Error("User creation in auth did not return a user object.");
    }
    
    // 2. CORREÇÃO: Inserir o perfil completo na tabela `public.users`.
    // A lógica foi alterada de `update` para `insert`.
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        name: name,
        role: role
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Se a criação do perfil falhar, é crucial excluir o usuário da autenticação
      // para evitar usuários órfãos.
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return new Response(JSON.stringify({ error: `Failed to create user profile: ${profileError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }
    
    return new Response(JSON.stringify({ message: "User created successfully" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // 201 Created
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
