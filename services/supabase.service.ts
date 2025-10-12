// ============================================================================
// Supabase Service (Mock Implementation)
// Mock implementation for demo purposes
// ============================================================================

// Mock Supabase client interface for demo
interface MockSupabaseClient {
  from: (table: string) => {
    select: (columns?: string) => {
      eq: (column: string, value: any) => {
        single: () => Promise<{ data: any; error: any }>;
      };
    };
    insert: (data: any) => Promise<{ data: any; error: any }>;
    update: (data: any) => Promise<{ data: any; error: any }>;
    delete: () => Promise<{ data: any; error: any }>;
  };
  rpc: (functionName: string, params?: any) => Promise<{ data: any; error: any }>;
}

// Mock implementation
const mockSupabase: MockSupabaseClient = {
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        single: async () => ({ data: null, error: new Error('Mock implementation') })
      })
    }),
    insert: async (data: any) => ({ data: null, error: new Error('Mock implementation') }),
    update: async (data: any) => ({ data: null, error: new Error('Mock implementation') }),
    delete: async () => ({ data: null, error: new Error('Mock implementation') })
  }),
  rpc: async (functionName: string, params?: any) => ({ 
    data: functionName === 'generate_family_encryption_key' ? 'mock_key' : true, 
    error: null 
  })
};

// Export mock client
export const supabase = mockSupabase;