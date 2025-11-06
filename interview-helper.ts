// =============================================
// Enhanced Interview Helper Component
// Features: Speech Recognition, Local Storage, History Management
// =============================================

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Copy, Check, Trash2, Download, History } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Type definition for interview history
interface InterviewHistoryItem {
  id: number;
  question: string;
  suggestion: string;
  timestamp: string;
}

const InterviewHelper = () => {
  // State management
  const [isListening, setIsListening] = useState(false);
  const [question, setQuestion] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [interviewHistory, setInterviewHistory] = useState<InterviewHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const recognitionRef = useRef<any>(null);

  // =============================================
  // LOCAL STORAGE MANAGEMENT
  // =============================================

  // Load history from localStorage on component mount
  useEffect(() => {
    const loadHistory = () => {
      try {
        const savedHistory = localStorage.getItem('interviewHistory');
        if (savedHistory) {
          const parsed = JSON.parse(savedHistory);
          // Validate it's an array before setting state
          if (Array.isArray(parsed)) {
            setInterviewHistory(parsed);
          }
        }
      } catch (error) {
        console.error('Error loading interview history:', error);
        // Clear corrupted data
        localStorage.removeItem('interviewHistory');
      }
    };

    loadHistory();
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    const saveHistory = () => {
      if (interviewHistory.length > 0) {
        try {
          localStorage.setItem('interviewHistory', JSON.stringify(interviewHistory));
        } catch (error) {
          console.error('Error saving interview history:', error);
        }
      }
    };

    saveHistory();
  }, [interviewHistory]);

  // =============================================
  // SPEECH RECOGNITION SETUP
  // =============================================

  useEffect(() => {
    // Check browser support for speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Browser Not Supported",
        description: "Speech recognition is not supported in your browser. Please use Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    // Handle speech recognition results
    recognitionRef.current.onresult = async (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');

      setQuestion(transcript);

      // Trigger AI suggestion when final result is detected
      if (event.results && event.results.length > 0 && event.results[event.results.length - 1].isFinal) {
        await getAISuggestion(transcript);
      }
    };

    // Handle speech recognition errors
    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      toast({
        title: "Speech Recognition Error",
        description: `Error: ${event.error}. Please try again.`,
        variant: "destructive",
      });
      setIsListening(false);
    };

    // Handle when recognition ends automatically
    recognitionRef.current.onend = () => {
      setIsListening(false);
    };
  }, []);

  // =============================================
  // MICROPHONE CONTROL FUNCTIONS
  // =============================================

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Error",
        description: "Speech recognition not initialized.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      // Stop listening
      recognitionRef.current.stop();
      setIsListening(false);
      toast({
        title: "Stopped",
        description: "Microphone turned off",
      });
    } else {
      // Start listening
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setQuestion(""); // Clear previous question
        setSuggestion(""); // Clear previous suggestion
        toast({
          title: "Listening",
          description: "Microphone is active and listening for questions...",
        });
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        toast({
          title: "Microphone Error",
          description: "Failed to start microphone. Please check permissions.",
          variant: "destructive",
        });
      }
    }
  };

  // =============================================
  // AI SUGGESTION FUNCTIONS
  // =============================================

  const getAISuggestion = async (interviewQuestion: string) => {
    // Input validation
    if (!interviewQuestion || !interviewQuestion.trim()) {
      toast({
        title: "No Question",
        description: "Please speak a question first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setSuggestion(""); // Clear previous suggestion
    
    try {
      // Use environment variable for API URL with fallback
      // Use environment variable for API URL with fallback
      const API_URL = import.meta.env.VITE_API_URL || 'https://large-mole-76.reala540.deno.net/';
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: interviewQuestion.trim() })
      });

      // Handle non-JSON responses
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError, responseText);
        throw new Error('Invalid response from AI service');
      }

      // Handle API errors
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      // Validate response structure
      if (!data.suggestion) {
        throw new Error('No suggestion received from AI service');
      }

      // Update UI with new suggestion
      setSuggestion(data.suggestion);
      
      // Save to history with error handling
      try {
        const newHistoryItem: InterviewHistoryItem = {
          id: Date.now(),
          question: interviewQuestion,
          suggestion: data.suggestion,
          timestamp: new Date().toLocaleString()
        };
        
        const updatedHistory = [newHistoryItem, ...interviewHistory].slice(0, 50); // Keep last 50
        setInterviewHistory(updatedHistory);
      } catch (historyError) {
        console.error('Error saving to history:', historyError);
        // Don't throw - history save failure shouldn't break the main flow
      }

    } catch (error) {
      console.error('Error getting AI suggestion:', error);
      toast({
        title: "AI Service Error",
        description: error instanceof Error ? error.message : "Failed to get AI suggestion. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================

  const copyToClipboard = () => {
    if (!suggestion) {
      toast({
        title: "No Text",
        description: "No suggestion to copy",
        variant: "destructive",
      });
      return;
    }

    navigator.clipboard.writeText(suggestion).then(() => {
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Response copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => {
      console.error('Failed to copy text: ', err);
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    });
  };

  const clearHistory = () => {
    setInterviewHistory([]);
    try {
      localStorage.removeItem('interviewHistory');
      toast({
        title: "History Cleared",
        description: "Interview history cleared successfully",
      });
    } catch (error) {
      console.error('Error clearing history:', error);
      toast({
        title: "Clear Error",
        description: "Failed to clear history",
        variant: "destructive",
      });
    }
  };

  const exportHistory = () => {
    if (interviewHistory.length === 0) {
      toast({
        title: "No Data",
        description: "No interview history to export",
      });
      return;
    }

    try {
      const dataStr = JSON.stringify(interviewHistory, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `interview-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Interview history downloaded as JSON",
      });
    } catch (error) {
      console.error('Error exporting history:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export history",
        variant: "destructive",
      });
    }
  };

  // =============================================
  // COMPONENT RENDER
  // =============================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card/30">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Live Interview Helper
          </h1>
          <p className="text-muted-foreground">
            Get real-time AI-powered suggestions during your interviews
          </p>
        </div>

        {/* History Management Controls */}
        <div className="flex justify-end mb-4">
          <div className="flex gap-2">
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <History className="h-4 w-4" />
              {showHistory ? "Hide History" : "Show History"}
            </Button>
            {interviewHistory.length > 0 && (
              <>
                <Button
                  onClick={exportHistory}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button
                  onClick={clearHistory}
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Interview History Panel */}
        {showHistory && interviewHistory.length > 0 && (
          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border mb-6">
            <h3 className="text-lg font-semibold mb-4">Interview History ({interviewHistory.length})</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {interviewHistory.map((item) => (
                <div key={item.id} className="border border-border rounded-lg p-4 bg-background/50">
                  <p className="font-medium text-sm mb-2">Q: {item.question}</p>
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap">A: {item.suggestion}</p>
                  <p className="text-xs text-muted-foreground mt-2">{item.timestamp}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Question Detection Card */}
          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Question Detected</h2>
              <Button
                onClick={toggleListening}
                variant={isListening ? "destructive" : "default"}
                size="icon"
                className="rounded-full"
              >
                {isListening ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </Button>
            </div>
            <div className="min-h-[200px] p-4 rounded-lg bg-background/50 border border-border">
              {isListening && !question && (
                <p className="text-muted-foreground italic">Listening for questions...</p>
              )}
              {question && (
                <p className="text-foreground leading-relaxed">{question}</p>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              {isListening ? (
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Microphone is active - speak your interview question
                </span>
              ) : (
                "Click the microphone to start listening for interview questions"
              )}
            </p>
          </Card>

          {/* AI Suggestion Card */}
          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">AI Suggestion</h2>
              {suggestion && (
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            <div className="min-h-[200px] p-4 rounded-lg bg-background/50 border border-border">
              {isLoading && (
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-muted-foreground">Generating AI response...</p>
                </div>
              )}
              {!isLoading && suggestion && (
                <p className="text-foreground leading-relaxed whitespace-pre-wrap">{suggestion}</p>
              )}
              {!isLoading && !suggestion && !question && (
                <p className="text-muted-foreground italic">
                  AI suggestions will appear here when a question is detected
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Tips Card */}
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-border">
          <h3 className="text-lg font-semibold mb-4">Tips for Best Results</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              Make sure your microphone is enabled and working properly
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              Speak clearly and at a moderate pace for better speech recognition
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              Use the AI suggestions as inspiration - personalize them with your own experience
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              Your interview history is automatically saved locally in your browser
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              Export your history to keep a permanent record of your practice sessions
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default InterviewHelper;