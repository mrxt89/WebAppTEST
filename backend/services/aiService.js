const axios = require('axios');
const sql = require('mssql');
const config = require('../config');

/**
 * Servizio per gestire tutte le operazioni di intelligenza artificiale
 */
const aiService = {
  /**
   * Genera un riepilogo automatico della conversazione
   * @param {string} conversationText - Testo della conversazione
   * @param {number} notificationId - ID della notifica
   * @param {number} userId - ID dell'utente
   * @returns {Promise<Array>} - Array con i punti salienti generati
   */
  async summarizeConversation(conversationText, notificationId, userId) {
    try {
      // Ottieni la strategia di fallback dalla configurazione
      const fallbackStrategy = config.ai?.fallbackStrategy || 'openai-only';
      console.log('Current AI fallback strategy:', fallbackStrategy);
      
      let summaryPoints = [];
      
      // Strategia basata sulla configurazione
      if (fallbackStrategy === 'claude-only') {
        try {
          // Prova solo Claude
          summaryPoints = await this.callClaudeAPI(conversationText);
          console.log('Claude API response:', summaryPoints);
        } catch (claudeError) {
          console.error('Error calling Claude API:', claudeError);
          throw claudeError; // In claude-only, fallisci se Claude non funziona
        }
      } else if (fallbackStrategy === 'claude-then-openai') {
        try {
          // Prova prima Claude
          summaryPoints = await this.callClaudeAPI(conversationText);
          console.log('Claude API response:', summaryPoints);
        } catch (claudeError) {
          console.error('Error calling Claude API:', claudeError);
          
          try {
            // Fallback a OpenAI se Claude fallisce
            console.log('Falling back to OpenAI API');
            summaryPoints = await this.callChatGPTAPI(conversationText);
            console.log('OpenAI API response:', summaryPoints);
          } catch (openaiError) {
            console.error('Error calling OpenAI API:', openaiError);
            throw openaiError;
          }
        }
      } else {
        // Se la strategia è 'openai-only' o qualsiasi altro valore non riconosciuto, usa OpenAI
        console.log('Using OpenAI API directly');
        try {
          summaryPoints = await this.callChatGPTAPI(conversationText);
          console.log('OpenAI API response:', summaryPoints);
        } catch (openaiError) {
          console.error('Error calling OpenAI API:', openaiError);
          throw openaiError;
        }
      }
      
      // Se siamo arrivati qui con dei punti salienti, salvali nel database
      if (summaryPoints && summaryPoints.length > 0) {
        await this.saveHighlightsToDatabase(summaryPoints.map(p => p.text || p), notificationId, userId);
        return summaryPoints; // Restituisci i punti generati
      } else {
        // Se ancora non abbiamo punti, genera un riepilogo di fallback
        const fallbackSummary = await this.generateFallbackSummary(conversationText, notificationId, userId);
        return fallbackSummary.map(text => ({type: 'summary', text})); // Restituisci i punti generati dal fallback
      }
    } catch (error) {
      console.error('Error in summarizeConversation:', error);
      // Se tutte le API falliscono, genera un riepilogo semplice dai messaggi più lunghi
      const fallbackSummary = await this.generateFallbackSummary(conversationText, notificationId, userId);
      return fallbackSummary.map(text => ({type: 'summary', text})); // Restituisci i punti generati dal fallback
    }
  },
  
  /**
   * Chiama l'API di Claude per generare un riepilogo
   * @param {string} text - Testo della conversazione
   * @returns {Promise<Array>} - Array con i punti salienti generati
   */
  async callClaudeAPI(text) {
    try {
      // Usa i parametri dalla configurazione
      const { apiKey, model, apiVersion } = config.ai.claude;
      const maxTextLength = config.summaryOptions.maxTextLength;
      const maxPoints = Math.max(config.summaryOptions.maxPoints, 10); // Assicura un minimo di 10 punti
      
      if (!apiKey) {
        throw new Error('Claude API key non configurata');
      }
      
      // Limita il testo alla lunghezza configurata
      const trimmedText = text.slice(0, maxTextLength);
      
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: model,
          max_tokens: 1500, // Aumentato per permettere risposte più complete
          messages: [
            {
              role: "system",
              content: `Sei un consulente aziendale specializzato nell'analisi di conversazioni professionali.
                Il tuo compito è comprendere la situazione ed offrire consigli pratici e soluzioni.
                Mantieni un tono professionale e orientato alle soluzioni.
                Nelle tue risposte, usa la struttura:
                
                # Commento e proposte di miglioramento
                (suggerimenti pratici per risolvere i problemi emersi nella conversazione)
                
                Usa elenchi puntati (-) per i tuoi suggerimenti.
                Ogni punto deve essere concreto, specifico e attuabile.
                Non riepilogare la conversazione o ripetere le informazioni già dette.
                Concentrati esclusivamente sul fornire consigli utili.`
            },
            {
              role: "user",
              content: `Analizza la seguente conversazione di lavoro e fornisci solamente consigli pratici:

Conversazione:
${trimmedText}

Rispondi con:

# Commento e proposte di miglioramento
(fornisci 3-5 suggerimenti concreti e specifici per gestire meglio la situazione)

Non riepilogare la conversazione, concentrati solo sui consigli utili.`
            }
          ]
        },
        { 
          headers: { 
            'Content-Type': 'application/json',
            'anthropic-version': apiVersion,
            'x-api-key': apiKey
          },
          timeout: 30000 // 30 secondi di timeout
        }
      );
      
      if (!response.data || !response.data.content || !response.data.content[0] || !response.data.content[0].text) {
        throw new Error('Risposta API Claude non valida');
      }
      
      // Estrai i punti dal testo della risposta
      const content = response.data.content[0].text;
      
      // Estrai solo i commenti e suggerimenti
      const sections = content.split(/#+\s+/);
      let commentPoints = [];
      
      // Cerca la sezione commenti e proposte
      sections.forEach(section => {
        if (section.toLowerCase().includes('commento') || section.toLowerCase().includes('proposte') || section.toLowerCase().includes('suggeriment')) {
          // Estrai punti dai commenti
          const points = section
            .split('\n')
            .filter(line => line.trim().length > config.summaryOptions.minPointLength && /^(\d+\.|-|\*|•)\s+/.test(line.trim()))
            .map(line => line.replace(/^(\d+\.|-|\*|•)\s+/, '').trim());
          commentPoints = [...commentPoints, ...points];
        }
      });
      
      // Crea array di punti tutti di tipo "comment"
      const allPoints = commentPoints.map(point => ({ type: 'comment', text: point }));
      
      // Se non è stato possibile estrarre punti strutturati, dividi per nuova riga
      if (allPoints.length === 0) {
        return content
          .split('\n')
          .filter(line => line.trim().length > config.summaryOptions.minPointLength)
          .map(line => ({ type: 'summary', text: line.trim() }))
          .slice(0, maxPoints);
      }
      
      return allPoints.slice(0, maxPoints);
    } catch (error) {
      console.error('Error calling Claude API:', error);
      throw error;
    }
  },
  
  /**
   * Chiama l'API di ChatGPT per generare un riepilogo
   * @param {string} text - Testo della conversazione
   * @returns {Promise<Array>} - Array con i punti salienti generati
   */
  async callChatGPTAPI(text) {
    try {
      // Usa i parametri dalla configurazione
      const { apiKey, model } = config.ai.openai;
      const maxTextLength = config.summaryOptions.maxTextLength;
      const maxPoints = Math.max(config.summaryOptions.maxPoints, 10); // Assicura un minimo di 10 punti
      
      console.log('Starting OpenAI API call');
      
      if (!apiKey) {
        console.error('OpenAI API key non configurata');
        throw new Error('OpenAI API key non configurata');
      }
      
      console.log('Using OpenAI model:', model);
      
      // Limita il testo alla lunghezza configurata
      const trimmedText = text.slice(0, Math.min(maxTextLength, 8000));
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: model,
          messages: [
            {
              role: "system",
              content: `Sei un consulente aziendale specializzato nell'analisi di conversazioni professionali.
                Il tuo compito è comprendere la situazione ed offrire consigli pratici e soluzioni.
                Mantieni un tono professionale e orientato alle soluzioni.
                Nelle tue risposte, usa la struttura:
                
                # Commento e proposte di miglioramento
                (suggerimenti pratici per risolvere i problemi emersi nella conversazione)
                
                Usa elenchi puntati (-) per i tuoi suggerimenti.
                Ogni punto deve essere concreto, specifico e attuabile.
                Non riepilogare la conversazione o ripetere le informazioni già dette.
                Concentrati esclusivamente sul fornire consigli utili.`
            },
            {
              role: "user",
              content: `Analizza la seguente conversazione di lavoro e fornisci solamente consigli pratici:

Conversazione:
${trimmedText}

Rispondi con:

# Commento e proposte di miglioramento
(fornisci 3-5 suggerimenti concreti e specifici per gestire meglio la situazione)

Non riepilogare la conversazione, concentrati solo sui consigli utili.`
            }
          ],
          temperature: 0.7, // Un po' più di creatività per i suggerimenti
          max_tokens: 500   // Aumentato per permettere risposte più complete
        },
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 25000 // 25 secondi di timeout, aumentato per risposta più completa
        }
      );
      
      console.log('OpenAI API response received');
      
      if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
        throw new Error('Risposta API OpenAI non valida');
      }
      
      const summaryText = response.data.choices[0].message.content;
      
      // Estrai solo i commenti e suggerimenti
      const sections = summaryText.split(/#+\s+/);
      let commentPoints = [];
      
      // Cerca la sezione commenti e proposte
      sections.forEach(section => {
        if (section.toLowerCase().includes('commento') || section.toLowerCase().includes('proposte') || section.toLowerCase().includes('suggeriment')) {
          // Estrai punti dai commenti
          const points = section
            .split('\n')
            .filter(line => line.trim().length > config.summaryOptions.minPointLength && /^(\d+\.|-|\*|•)\s+/.test(line.trim()))
            .map(line => line.replace(/^(\d+\.|-|\*|•)\s+/, '').trim());
          commentPoints = [...commentPoints, ...points];
        }
      });
      
      // Crea array di punti tutti di tipo "comment"
      const allPoints = commentPoints.map(point => ({ type: 'comment', text: point }));
      
      // Se non è stato possibile estrarre punti strutturati, dividi per nuova riga
      if (allPoints.length === 0) {
        return summaryText
          .split('\n')
          .filter(line => line.trim().length > config.summaryOptions.minPointLength)
          .map(line => ({ type: 'summary', text: line.trim() }))
          .slice(0, maxPoints);
      }
      
      return allPoints.slice(0, maxPoints);
    } catch (error) {
      console.error('Error calling ChatGPT API:', error);
      // Registra ulteriori dettagli sull'errore
      if (error.response) {
        console.error('OpenAI API error details:', {
          status: error.response.status,
          headers: error.response.headers,
          data: error.response.data
        });
      }
      throw error;
    }
  },
  
  /**
   * Genera un riepilogo di fallback quando le API esterne non sono disponibili
   * @param {string} text - Testo della conversazione
   * @param {number} notificationId - ID della notifica
   * @param {number} userId - ID dell'utente
   * @returns {Promise<Array>} - Array con i punti salienti generati
   */
  async generateFallbackSummary(text, notificationId, userId) {
    try {
      console.log('Generating fallback summary');
      // Estrai le informazioni dalle righe della conversazione
      const lines = text.split('\n').filter(line => line.trim().length > config.summaryOptions.minPointLength);
      
      // Estrai i nomi degli utenti dalla conversazione
      const userPattern = /^([^:]+):/;
      const users = new Set();
      lines.forEach(line => {
        const match = line.match(userPattern);
        if (match && match[1]) {
          users.add(match[1].trim());
        }
      });
      
      // Crea un riepilogo che includa gli utenti coinvolti
      const userSummary = `Conversazione tra ${Array.from(users).join(', ')}.`;
      
      // Estrai le frasi più significative (basate sulla lunghezza)
      const significantLines = lines
        .map(line => {
          const match = line.match(userPattern);
          if (match && match[1]) {
            return {
              user: match[1].trim(),
              message: line.substring(match[0].length).trim(),
              length: line.length
            };
          }
          return { user: 'Unknown', message: line.trim(), length: line.length };
        })
        .sort((a, b) => b.length - a.length)
        .slice(0, Math.max(config.summaryOptions.maxPoints - 1, 9))
        .map(({ user, message }) => `${user} ha discusso di: ${message}`);
      
      // Aggiungi il riepilogo degli utenti all'inizio
      const results = [userSummary, ...significantLines];
      
      // Salva i risultati nel database
      await this.saveHighlightsToDatabase(results, notificationId, userId);
      return results;
    } catch (error) {
      console.error('Error generating fallback summary:', error);
      // In caso di errore grave, restituisci un array con almeno un elemento
      return ['Non è stato possibile generare un riepilogo automatico.'];
    }
  },
  
  /**
   * Salva i punti salienti generati nel database
   * @param {Array} highlights - Array di stringhe con i punti salienti
   * @param {number} notificationId - ID della notifica
   * @param {number} userId - ID dell'utente
   */
  async saveHighlightsToDatabase(highlights, notificationId, userId) {
    try {
      let pool = await sql.connect(config.database);
      
      // Prima elimina i punti generati automaticamente esistenti
      await pool.request()
        .input('NotificationID', sql.Int, notificationId)
        .input('UserID', sql.Int, userId)
        .query('DELETE FROM AR_ConversationHighlights WHERE NotificationID = @NotificationID AND UserID = @UserID AND IsAutoGenerated = 1');
      
      // Poi inserisci i nuovi punti
      console.log('Saving highlights to database:', highlights);
      for (const text of highlights) {
        // Gestisce sia il formato oggetto che il formato stringa
        const highlightText = typeof text === 'object' ? text.text : text;
        
        if (highlightText && highlightText.trim().length > 0) {
          await pool.request()
            .input('NotificationID', sql.Int, notificationId)
            .input('UserID', sql.Int, userId)
            .input('HighlightText', sql.NVarChar(500), highlightText)
            .input('IsAutoGenerated', sql.Bit, 1)
            .query('INSERT INTO AR_ConversationHighlights (NotificationID, UserID, HighlightText, IsAutoGenerated) VALUES (@NotificationID, @UserID, @HighlightText, @IsAutoGenerated)');
        }
      }
    } catch (error) {
      console.error('Error saving highlights to database:', error);
      throw error;
    }
  },
  
  /**
   * Analizza il sentiment di un testo
   * @param {string} text - Testo da analizzare
   * @returns {Promise<Object>} - Oggetto con il sentiment e il punteggio
   */
  async analyzeSentiment(text) {
    try {
      // Usa i parametri dalla configurazione
      const { apiKey, model, apiVersion } = config.ai.claude;
      
      if (!apiKey) {
        throw new Error('Claude API key non configurata');
      }
      
      // Chiama l'API di Claude per l'analisi del sentiment
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: model,
          max_tokens: 100,
          messages: [
            {
              role: "user",
              content: `Analizza il sentiment del seguente testo e rispondi SOLO con una di queste parole: "POSITIVO", "NEGATIVO", "NEUTRO".

Testo: "${text}"

Risposta:`
            }
          ]
        },
        { 
          headers: { 
            'Content-Type': 'application/json',
            'anthropic-version': apiVersion,
            'x-api-key': apiKey
          },
          timeout: 15000 // 15 secondi di timeout
        }
      );
      
      if (!response.data || !response.data.content || !response.data.content[0] || !response.data.content[0].text) {
        throw new Error('Risposta API non valida');
      }
      
      // Estrai la risposta
      const result = response.data.content[0].text.trim().toUpperCase();
      
      // Calcola un punteggio basato sul risultato
      let score = 0.5; // Default neutro
      
      if (result.includes('POSITIVO')) {
        score = 0.8;
      } else if (result.includes('NEGATIVO')) {
        score = 0.2;
      }
      
      return {
        sentiment: result.includes('POSITIVO') ? 'POSITIVO' : 
                   result.includes('NEGATIVO') ? 'NEGATIVO' : 'NEUTRO',
        score,
        isPositive: result.includes('POSITIVO'),
        isNegative: result.includes('NEGATIVO')
      };
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      // In caso di errore, restituisci un sentiment neutro
      return {
        sentiment: 'NEUTRO',
        score: 0.5,
        isPositive: false,
        isNegative: false
      };
    }
  },
  
  /**
   * Suggerisce una risposta in base al contesto della conversazione
   * @param {number} notificationId - ID della notifica
   * @param {string} lastMessage - Ultimo messaggio ricevuto
   * @returns {Promise<string>} - Testo della risposta suggerita
   */
  async suggestReply(notificationId, lastMessage) {
    try {
      // Usa i parametri dalla configurazione
      const { apiKey, model, apiVersion } = config.ai.claude;
      
      if (!apiKey) {
        throw new Error('Claude API key non configurata');
      }
      
      // Recupera gli ultimi messaggi della conversazione per fornire contesto
      let pool = await sql.connect(config.database);
      const result = await pool.request()
        .input('NotificationID', sql.Int, notificationId)
        .query(`
          SELECT TOP 5
            nd.Message,
            u.FirstName + ' ' + u.LastName AS SenderName
          FROM 
            AR_NotificationDetails nd
          JOIN
            AR_Users u ON nd.SenderId = u.UserID
          WHERE
            nd.NotificationID = @NotificationID
            AND nd.cancelled = 0
          ORDER BY
            nd.tbCreated DESC
        `);
      
      // Componi il contesto della conversazione
      const conversationContext = result.recordset
        .reverse()
        .map(msg => `${msg.SenderName}: ${msg.Message}`)
        .join('\n');
      
      // Chiama l'API di Claude per generare una risposta suggerita
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: model,
          max_tokens: 250, // Aumentato per risposta più completa
          messages: [
            {
              role: "system",
              content: `Sei un assistente professionale italiano che aiuta a comporre risposte in un contesto aziendale.
                Le tue risposte sono concise, professionali ma cordiali, e mirate a risolvere problemi specifici.
                Rispondi sempre in prima persona come se fossi la persona che sta scrivendo.
                Non usare formule troppo formali o burocratiche.`
            },
            {
              role: "user",
              content: `Questa è una conversazione in un ambiente di lavoro italiano:
${conversationContext}

L'ultimo messaggio è: "${lastMessage}"

Suggerisci una risposta professionale, concisa e in italiano. La risposta deve essere in prima persona e deve avere un tono professionale ma amichevole.`
            }
          ]
        },
        { 
          headers: { 
            'Content-Type': 'application/json',
            'anthropic-version': apiVersion,
            'x-api-key': apiKey
          },
          timeout: 20000 // Aumentato a 20 secondi
        }
      );
      
      if (!response.data || !response.data.content || !response.data.content[0] || !response.data.content[0].text) {
        throw new Error('Risposta API non valida');
      }
      
      return response.data.content[0].text.trim();
    } catch (error) {
      console.error('Error suggesting reply:', error);
      // In caso di errore, restituisci una risposta generica
      return 'Mi dispiace, non sono in grado di suggerire una risposta in questo momento.';
    }
  }
};

module.exports = aiService;