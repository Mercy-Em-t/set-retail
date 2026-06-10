import { createClient } from '@supabase/supabase-js';

// Since this is a brand new environment for testing the UI, 
// we'll point it to a mock URL or the user's local instance.
// If you want to connect to your real live database, replace these.
const supabaseUrl = 'https://mock.supabase.co';
const supabaseKey = 'mock-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// OVERRIDE functions.invoke for testing the Dashboard UI without a running edge function server
supabase.functions.invoke = async (functionName, options) => {
  if (functionName === 'logic-auditor') {
    // Simulate a network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return mock engine data so the UI can render
    return {
      data: {
        structuralSafety: "SECURE",
        stochasticRiskProbabilities: [
          { item: "Burger Combos", probabilityOfDecay: 0.85 },
          { item: "Fries Large", probabilityOfDecay: 0.42 },
        ],
        tautologyViolations: [],
        humanLogicFallacies: []
      },
      error: null
    };
  }
  return { data: null, error: new Error('Function not found') };
};
