// frontend/src/config/agent.js
export const AGENT_CONFIG = {
    url: 'http://localhost:7865',
    timeout: 5000,
    retryAttempts: 3,
    endpoints: {
      status: '/status',
      openFile: '/open-file',
      sessions: '/sessions',
      closeSession: '/close-session'
    }
  };