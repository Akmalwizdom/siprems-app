import os
import google.generativeai as genai

class ChatService:
    """Business logic layer for AI chat operations"""
    
    def __init__(self, config):
        """Initialize chat service with configuration"""
        self.config = config
        self.model = None
        self.chat = None
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize Gemini AI model"""
        try:
            api_key = self.config.GEMINI_API_KEY
            if not api_key:
                print("WARNING: GEMINI_API_KEY not found. Chat functionality will not work.")
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
            
            self.chat = self.model.start_chat(history=[])
            print("Gemini AI model successfully initialized.")
            return True
            
        except Exception as e:
            print(f"Error initializing Gemini AI: {e}")
            return False
    
    def is_available(self):
        """Check if chat service is available"""
        return self.model is not None and self.chat is not None
    
    def send_message(self, message):
        """
        Send a message to Gemini AI and get response.
        
        Args:
            message: User message string
        
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
        
        try:
            response = self.chat.send_message(message)
            return response.text
        except Exception as e:
            raise Exception(f"Error calling Gemini API: {str(e)}")
