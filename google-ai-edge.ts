// =============================================
// Google AI Edge Function for Interview Helper
// Replaces Lovable dependency with direct Gemini API
// =============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }), 
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse and validate request body
    let question: string;
    try {
      const body = await req.json();
      question = body.question;
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }), 
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Input validation
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Valid question is required" }), 
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get API key from environment with fallback
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "AIzaSyBMzmkMkHDsbbCUzAvI7GwpHMi7ayyJaBU";
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    // Call Google Gemini API directly
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an expert interview coach. When given an interview question, provide a clear, concise, and compelling response that:
1. Directly answers the question
2. Uses the STAR method (Situation, Task, Action, Result) when applicable
3. Highlights key achievements and skills
4. Keeps the response between 1-2 minutes when spoken
5. Sounds natural and conversational

Provide only the suggested response without any additional commentary or explanation.

Interview question: ${question}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      }),
    });

    // Handle API response errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Google AI Error:', response.status, errorData);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error" }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse successful response
    const data = await response.json();
    
    // Enhanced response validation
    if (!data.candidates || 
        !data.candidates[0] || 
        !data.candidates[0].content || 
        !data.candidates[0].content.parts || 
        !data.candidates[0].content.parts[0] ||
        !data.candidates[0].content.parts[0].text) {
      console.error('Invalid response structure:', data);
      throw new Error("Invalid response format from Google AI");
    }
    
    const suggestion = data.candidates[0].content.parts[0].text;

    // Return successful response
    return new Response(
      JSON.stringify({ suggestion }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    // Global error handling
    console.error("Google AI edge function error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});