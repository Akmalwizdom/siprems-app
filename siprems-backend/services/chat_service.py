import os
import google.generativeai as genai
import json
import logging
from datetime import datetime, timedelta
from utils.cache_service import get_cache_service

logger = logging.getLogger(__name__)

class ChatService:
    """Stateless chat service with Redis-backed conversation history"""
    
    def __init__(self, config):
        """Initialize chat service with configuration"""
        self.config = config
        self.model = None
        self._initialize_model()
        self.cache_service = get_cache_service()
    
    def _initialize_model(self):
        """Initialize Gemini AI model"""
        try:
            api_key = self.config.GEMINI_API_KEY
            if not api_key:
                logger.warning("GEMINI_API_KEY not found. Chat functionality will not work.")
                return False
            
            genai.configure(api_key=api_key)
            
            system_instruction = (
                "Anda adalah StockPredict AI, asisten inventaris AI yang ramah dan membantu. "
                "Tugas Anda adalah menjawab pertanyaan pengguna tentang data inventaris, "
                "prediksi stok, dan tren penjualan. Gunakan bahasa yang jelas dan profesional. "
                "Jangan menjawab pertanyaan di luar topik manajemen inventaris."
            )
            
            generation_config = genai.GenerationConfig(temperature=0.7)
            
            self.model = genai.GenerativeModel(
                'gemini-2.5-flash',
                generation_config=generation_config,
                system_instruction=system_instruction
            )
            
            logger.info("Gemini AI model successfully initialized.")
            return True
            
        except Exception as e:
            logger.error(f"Error initializing Gemini AI: {e}")
            return False
    
    def is_available(self):
        """Check if chat service is available"""
        return self.model is not None
    
    def _get_conversation_key(self, user_id: str, session_id: str) -> str:
        """Generate Redis key for conversation history"""
        return f"chat_history:{user_id}:{session_id}"
    
    def _get_conversation_history(self, user_id: str, session_id: str) -> list:
        """
        Get conversation history from Redis.
        
        Args:
            user_id: User identifier
            session_id: Chat session identifier
            
        Returns:
            List of conversation turns with role and content
        """
        key = self._get_conversation_key(user_id, session_id)
        history = self.cache_service.get(key)
        return history or []
    
    def _save_conversation_history(self, user_id: str, session_id: str, history: list):
        """
        Save conversation history to Redis.
        
        Args:
            user_id: User identifier
            session_id: Chat session identifier
            history: List of conversation turns
        """
        key = self._get_conversation_key(user_id, session_id)
        # Store with 24-hour TTL
        self.cache_service.set(key, history, ttl=86400)
    
    def send_message(self, message: str, user_id: str = None, session_id: str = None) -> str:
        """
        Send a message and get response, managing conversation history in Redis.
        
        Args:
            message: User message string
            user_id: User identifier (for conversation isolation)
            session_id: Chat session identifier (allows multiple conversations per user)
        
        Returns:
            Response text from AI
        
        Raises:
            ValueError: If message is empty or service not available
            Exception: If API call fails
        """
        if not message or not message.strip():
            raise ValueError("Message cannot be empty")
        
        if not self.is_available():
            raise ValueError("Chat service is not properly configured")
        
        # Use default values if not provided
        user_id = user_id or "anonymous"
        session_id = session_id or "default"
        
        try:
            # Load conversation history from Redis
            history = self._get_conversation_history(user_id, session_id)
            
            # Create chat session with history
            chat = self.model.start_chat(history=history)
            
            # Send message and get response
            response = chat.send_message(message)
            response_text = response.text
            
            # Add user message and response to history
            updated_history = history + [
                {"role": "user", "parts": [message]},
                {"role": "model", "parts": [response_text]}
            ]
            
            # Store updated history in Redis (non-blocking)
            self._save_conversation_history(user_id, session_id, updated_history)
            
            return response_text
            
        except Exception as e:
            logger.error(f"Error in chat service: {str(e)}")
            raise Exception(f"Error calling Gemini API: {str(e)}")
    
    def get_conversation_history(self, user_id: str, session_id: str) -> list:
        """
        Get conversation history for a session.
        
        Args:
            user_id: User identifier
            session_id: Chat session identifier
            
        Returns:
            List of messages in conversation
        """
        return self._get_conversation_history(user_id, session_id)
    
    def clear_session(self, user_id: str, session_id: str) -> bool:
        """
        Clear conversation history for a session.
        
        Args:
            user_id: User identifier
            session_id: Chat session identifier
            
        Returns:
            True if successful, False otherwise
        """
        try:
            key = self._get_conversation_key(user_id, session_id)
            self.cache_service.delete(key)
            logger.info(f"Cleared chat session for user {user_id}, session {session_id}")
            return True
        except Exception as e:
            logger.error(f"Error clearing chat session: {e}")
            return False
