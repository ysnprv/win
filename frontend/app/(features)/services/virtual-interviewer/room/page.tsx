"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Send } from "lucide-react";
import { toast } from "sonner";
import {
    API_BASE_URL,
    API_WS_BASE_URL,
    API_WS_ENV_DEFINED,
    VIRTUAL_INTERVIEWER_WS_VOICE_PATH,
} from "@/lib/constants";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";

type InterviewState =
    | "connecting"
    | "ready"
    | "listening"
    | "speaking"
    | "recording"
    | "ended";
type InputMode = "text" | "voice";

export default function InterviewRoomPage() {
    const searchParams = useSearchParams();
    const persona = searchParams.get("persona") || "alex_chen";

    const [state, setState] = useState<InterviewState>("connecting");
    const [messages, setMessages] = useState<
        Array<{ role: string; content: string }>
    >([]);
    const [inputText, setInputText] = useState("");
    // Lock the UI to voice-only mode (text is kept in code but not exposed)
    const [inputMode, setInputMode] = useState<InputMode>("voice");
    const [isRecording, setIsRecording] = useState(false);
    const [micSupported, setMicSupported] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const router = useRouter();

    const wsRef = useRef<WebSocket | null>(null);
    const redirectingRef = useRef(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize WebSocket connection
        const connectWebSocket = async () => {
            try {
                // Prefer explicit WS base URL from env var (should include protocol: wss://)
                // Fall back to converting API_BASE_URL for local/dev usage.
                if (!API_WS_ENV_DEFINED) {
                    // Log a clear warning in runtime if the production WS env var is missing.
                    console.error(
                        "NEXT_PUBLIC_API_URL_WS is not defined; using converted API_BASE_URL as fallback. " +
                            "For production please set NEXT_PUBLIC_API_URL_WS to wss://<your-backend>"
                    );
                }
                const wsUrl = API_WS_BASE_URL;
                // We only connect to the voice endpoint — keep text endpoint but do not expose in UI
                const endpoint = `${VIRTUAL_INTERVIEWER_WS_VOICE_PATH}/${persona}`;
                // Get user id from supabase auth (if available) to forward to server
                let userId: string | null = null;
                try {
                    const supabase = createSupabaseClient();
                    const {
                        data: { user },
                    } = await supabase.auth.getUser();
                    if (user && user.id) userId = user.id;
                } catch (err) {
                    console.warn(
                        "Failed to get user ID for websocket connection",
                        err
                    );
                }

                const extra = userId
                    ? `?user_id=${encodeURIComponent(userId)}`
                    : "";
                // Ensure we don't produce duplicate slashes when concatenating base + endpoint
                const fullWsUrl = `${wsUrl.replace(/\/+$/, '')}${endpoint}${extra}`;

                console.log("Connecting to:", fullWsUrl);
                const ws = new WebSocket(fullWsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    console.log("Connected to interview server");
                    setState("ready");
                    toast.success("Connected to interviewer");
                };

                ws.onmessage = (event) => {
                    console.log("Received message:", event.data);

                    // Handle voice mode responses
                    if (inputMode === "voice") {
                        // Try to safely parse JSON — many messages are plain text (e.g., TTS text
                        // or the formatted report) so only attempt to parse when the message
                        // looks like JSON to avoid uncaught SyntaxError (Turbopack env logs parse
                        // errors as uncaught). This avoids the JSON.parse exception you saw.
                        let parsed: any | null = null;
                        const raw = (event.data || "").toString();
                        const first = raw.trim().slice(0, 1);
                        if (first === "{" || first === "[") {
                            try {
                                parsed = JSON.parse(raw);
                            } catch (err) {
                                // If JSON.parse fails, fall back to plain text handling below
                                parsed = null;
                                console.info(
                                    "Received non-JSON string that starts with JSON char:",
                                    raw.slice(0, 120)
                                );
                            }
                        }

                        if (parsed) {
                            const response = parsed;

                            if (response.type === "error") {
                                toast.error(response.message);
                                setState("ready");
                                return;
                            }

                            // When the server notifies the client that the interview is saved,
                            // it returns a JSON message with type "interview_saved" and the
                            // new interview id. Redirect the user to the database detail page
                            // for the newly-saved interview and stop further interaction.
                            if (response.type === "interview_saved") {
                                const id = response.id;
                                toast.success(
                                    "Interview saved — redirecting to report..."
                                );
                                setState("ended");
                                // Mark redirecting so we don't duplicate the session-ended snackbar;
                                // set it before closing the socket to avoid a race between onclose and the flag update.
                                redirectingRef.current = true;
                                // Close websocket
                                try {
                                    if (
                                        wsRef.current &&
                                        wsRef.current.readyState ===
                                            WebSocket.OPEN
                                    ) {
                                        wsRef.current.close();
                                    }
                                } catch (e) {}
                                // only show the session-ended snackbar once
                                toast.info("Interview session ended");

                                // Add a small timeout so the toast shows briefly before navigation
                                setTimeout(() => {
                                    if (id) {
                                        router.push(
                                            `/services/virtual-interviewer/database/${id}`
                                        );
                                    } else {
                                        router.push(
                                            `/services/virtual-interviewer/database`
                                        );
                                    }
                                }, 700);
                                return;
                            }

                            if (response.type === "transcription") {
                                // Update the last user message with the actual transcription
                                setMessages((prev) => {
                                    const newMessages = [...prev];
                                    // Find the last [Voice message] placeholder and replace it
                                    for (
                                        let i = newMessages.length - 1;
                                        i >= 0;
                                        i--
                                    ) {
                                        if (
                                            newMessages[i].role === "user" &&
                                            newMessages[i].content ===
                                                "[Voice message]"
                                        ) {
                                            newMessages[i].content =
                                                response.text;
                                            break;
                                        }
                                    }
                                    return newMessages;
                                });
                                return;
                            }

                            if (response.type === "response") {
                                // Add interviewer message to chat
                                setMessages((prev) => [
                                    ...prev,
                                    {
                                        role: "interviewer",
                                        content: response.text,
                                    },
                                ]);
                                setState("speaking");

                                // Play audio if available, otherwise speak the text
                                if (response.audio) {
                                    playAudioFromHex(
                                        response.audio,
                                        response.text
                                    );
                                } else {
                                    speakText(response.text);
                                }

                                // Return to ready state after speaking
                                setTimeout(() => setState("ready"), 3000);
                            }
                        } else {
                            // Not JSON — fallback to plain text behavior
                            const text = raw;
                            setMessages((prev) => [
                                ...prev,
                                { role: "interviewer", content: text },
                            ]);

                            // If the interview completed message was received, mark ended
                            // The backend used to send an "INTERVIEW COMPLETE" message to the
                            // client. We no longer want to display that message to users — keep
                            // it in logs only. Convert it to state change only if we also get
                            // the saved interview event later (we still set ended when
                            // `interview_saved` arrives). But in case there is no saved event,
                            // keep UI alive (ready) so the user can still interact.
                            if (text.includes("INTERVIEW COMPLETE")) {
                                console.log(
                                    "Agent: interview completed (server sent INTERVIEW COMPLETE)"
                                );
                                // Do not display that raw message in chat.
                                // setState("ended");  // Not setting ended; wait for interview_saved
                            } else if (text.includes("INTERVIEW REPORT")) {
                                // The backend previously forwarded a formatted report; avoid
                                // displaying large reports in the live chat. Log it for
                                // diagnostics only and keep UI ready.
                                console.info(
                                    "Received formatted report text on room socket (suppressed)"
                                );
                                setState("ready");
                            } else {
                                setMessages((prev) => [
                                    ...prev,
                                    { role: "interviewer", content: text },
                                ]);
                                setState("ready");
                            }
                        }
                    }
                };

                ws.onerror = (error) => {
                    console.error("WebSocket error:", error);
                    toast.error("Connection error. Please try again.");
                    setState("ended");
                };

                ws.onclose = () => {
                    console.log("WebSocket closed");
                    setState("ended");
                    // Show the session ended snackbar only when we are not already
                    // redirecting because the `interview_saved` handler will show it
                    // to the user before navigation.
                    if (!redirectingRef.current) {
                        toast.info("Interview session ended");
                    }
                };
            } catch (error) {
                console.error("Failed to connect:", error);
                toast.error("Failed to connect to interview server");
                setState("ended");
            }
        };

        connectWebSocket();

        return () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state === "recording"
            ) {
                mediaRecorderRef.current.stop();
            }
            // Stop any playing audio
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, [inputMode, persona]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        // Load available voices for speech synthesis
        const loadVoices = () => {
            if (window.speechSynthesis) {
                const availableVoices = window.speechSynthesis.getVoices();
                if (availableVoices.length > 0) {
                    setVoices(availableVoices);
                }
            }
        };

        loadVoices();
        // Some browsers load voices asynchronously
        if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, []);

    const speakText = (text: string) => {
        if (!window.speechSynthesis) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);

        // Vary voice characteristics based on persona for a more personalized experience
        const voiceSettings = getPersonaVoiceSettings(persona);

        // Try to set a specific voice if available, otherwise use pitch/rate
        if (voiceSettings.voice) {
            utterance.voice = voiceSettings.voice;
        } else {
            utterance.rate = voiceSettings.rate;
            utterance.pitch = voiceSettings.pitch;
        }

        window.speechSynthesis.speak(utterance);
    };

    const getPersonaVoiceSettings = (personaKey: string) => {
        // Try to assign different voices to personas if available
        const englishVoices = voices.filter((voice) =>
            voice.lang.startsWith("en")
        );

        let assignedVoice: SpeechSynthesisVoice | null = null;

        if (englishVoices.length > 1) {
            // Assign voices based on gender
            const femaleVoices = englishVoices.filter(
                (v) =>
                    v.name.toLowerCase().includes("female") ||
                    v.name.toLowerCase().includes("samantha") ||
                    v.name.toLowerCase().includes("victoria") ||
                    v.name.toLowerCase().includes("alex") ||
                    v.name.toLowerCase().includes("zira")
            );
            const maleVoices = englishVoices.filter(
                (v) =>
                    v.name.toLowerCase().includes("male") ||
                    v.name.toLowerCase().includes("david") ||
                    v.name.toLowerCase().includes("mark") ||
                    v.name.toLowerCase().includes("james")
            );

            switch (personaKey) {
                case "alex_chen": // Female
                    assignedVoice = femaleVoices[0] || englishVoices[0];
                    break;
                case "sarah_williams": // Female
                    assignedVoice =
                        femaleVoices[1] ||
                        femaleVoices[0] ||
                        englishVoices[1] ||
                        englishVoices[0];
                    break;
                case "marcus_johnson": // Male
                    assignedVoice = maleVoices[0] || englishVoices[0];
                    break;
                case "priya_patel": // Female
                    assignedVoice =
                        femaleVoices[2] ||
                        femaleVoices[1] ||
                        femaleVoices[0] ||
                        englishVoices[2] ||
                        englishVoices[0];
                    break;
                case "jordan_lee": // Male
                    assignedVoice =
                        maleVoices[1] ||
                        maleVoices[0] ||
                        englishVoices[1] ||
                        englishVoices[0];
                    break;
            }
            console.log(
                `Assigned voice for ${personaKey}:`,
                assignedVoice?.name,
                assignedVoice?.lang
            );
        } else if (englishVoices.length === 1) {
            assignedVoice = englishVoices[0];
        }

        // Exaggerated pitch/rate settings for maximum distinction
        const fallbackSettings = {
            alex_chen: { pitch: 2.0, rate: 1.8 }, // Female extremely high pitch, very fast
            sarah_williams: { pitch: 1.5, rate: 1.6 }, // Female high pitch, fast
            marcus_johnson: { pitch: 0.3, rate: 1.4 }, // Male very low pitch, fast
            priya_patel: { pitch: 1.7, rate: 1.5 }, // Female very high pitch, fast
            jordan_lee: { pitch: 0.2, rate: 1.7 }, // Male extremely low pitch, very fast
        };

        const fallback = fallbackSettings[
            personaKey as keyof typeof fallbackSettings
        ] || { pitch: 1.0, rate: 1.0 };

        return {
            voice: assignedVoice,
            ...fallback,
        };
    };

    const playAudioFromHex = async (
        hexString: string,
        fallbackText?: string
    ) => {
        try {
            // Stop any currently playing audio
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }

            // Convert hex string to Uint8Array
            const bytes = new Uint8Array(
                hexString.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
            );

            // Create blob from bytes
            const blob = new Blob([bytes], { type: "audio/mpeg" });
            const audioUrl = URL.createObjectURL(blob);

            // Play audio and await the play promise so we can fallback on errors
            const audio = new Audio(audioUrl);
            audio.crossOrigin = "anonymous";
            audio.preload = "auto";
            audio.setAttribute("playsinline", "true");
            currentAudioRef.current = audio;

            try {
                // Some browsers require a user gesture — await the promise and fall back to SpeechSynthesis
                await audio.play();
            } catch (err) {
                console.warn(
                    "Audio playback failed or was blocked; falling back to browser TTS",
                    err
                );
                // Fallback: if we have text, use browser TTS
                if (fallbackText) {
                    speakText(fallbackText);
                }
            }

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                currentAudioRef.current = null;
            };
        } catch (error) {
            console.error("Failed to play audio:", error);
            // If all else fails, use speech synthesis
            if (fallbackText) {
                speakText(fallbackText);
            }
        }
    };

    // Compatibility wrapper that returns a MediaStream or throws a descriptive error
    const getUserMediaCompat = async (
        constraints: MediaStreamConstraints
    ): Promise<MediaStream> => {
        // If navigator isn't available the code is running in a server context
        if (typeof navigator === "undefined") {
            throw new Error(
                "Navigator is undefined — microphone access is only available in the browser."
            );
        }

        // Modern browsers (guard with optional chaining to avoid read errors)
        try {
            const md = (navigator as any)?.mediaDevices;
            if (md && typeof md.getUserMedia === "function") {
                return await md.getUserMedia(constraints);
            }
        } catch (err) {
            // Defensive: some environments may throw when trying to access mediaDevices
            console.warn(
                "Failed to access navigator.mediaDevices safely:",
                err
            );
        }

        // Legacy callback-style APIs (older Safari/Chrome builds)
        const legacyGetUserMedia =
            (navigator as any).getUserMedia ||
            (navigator as any).webkitGetUserMedia ||
            (navigator as any).mozGetUserMedia;
        if (legacyGetUserMedia) {
            // Wrap in a Promise
            return new Promise((resolve, reject) => {
                legacyGetUserMedia.call(
                    navigator,
                    constraints,
                    resolve,
                    reject
                );
            });
        }

        // No getUserMedia support — provide actionable hint for debugging
        throw new Error(
            "getUserMedia not supported by your browser. Requires a secure origin (https or localhost) and a compatible browser."
        );
    };

    useEffect(() => {
        // Check microphone capability in client-only environment
        try {
            const supported = !!(
                (navigator.mediaDevices &&
                    navigator.mediaDevices.getUserMedia) ||
                (navigator as any).getUserMedia ||
                (navigator as any).webkitGetUserMedia ||
                (navigator as any).mozGetUserMedia
            );
            if (!supported) {
                console.warn("Microphone API not available (navigator):", {
                    navigatorExists: typeof navigator !== "undefined",
                    mediaDevices: (navigator as any)?.mediaDevices,
                    userAgent:
                        typeof navigator !== "undefined"
                            ? navigator.userAgent
                            : "none",
                    isSecureContext:
                        typeof window !== "undefined"
                            ? window.isSecureContext
                            : false,
                });
            }
            setMicSupported(supported);
        } catch (e) {
            setMicSupported(false);
        }
    }, []);

    const startRecording = async () => {
        try {
            // Fail early if browser doesn't provide microphone API
            if (!micSupported) {
                const secure = window.isSecureContext === true;
                // Provide a friendly message for common issues (secure origin, unsupported browser)
                const msg = secure
                    ? "Your browser does not allow microphone access. Try a different browser (Chrome, Edge) or update your settings."
                    : "Microphone access requires a secure connection (https) or localhost. Please run the app over https or on localhost.";
                throw new Error(msg);
            }

            // Use compatibility wrapper to support older vendor prefixes
            const stream = await getUserMediaCompat({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, {
                    type: "audio/webm",
                });
                await sendAudioMessage(audioBlob);

                // Stop all tracks
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setState("recording");
            toast.info("Recording...");
        } catch (error) {
            console.error("Failed to start recording:", error);
            const msg =
                error && (error as any).message
                    ? (error as any).message
                    : "Failed to access microphone";
            toast.error(msg);
        }
    };

    const stopRecording = () => {
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state === "recording"
        ) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setState("listening");
        }
    };

    const sendAudioMessage = async (audioBlob: Blob) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            toast.error("Not connected to server");
            return;
        }

        try {
            // Add placeholder for user message (will show transcription when received)
            setMessages((prev) => [
                ...prev,
                { role: "user", content: "[Voice message]" },
            ]);

            // Convert blob to array buffer
            const arrayBuffer = await audioBlob.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            // Send audio data
            wsRef.current.send(uint8Array);

            setState("listening");
            toast.info("Processing your response...");
        } catch (error) {
            console.error("Failed to send audio:", error);
            toast.error("Failed to send audio");
            setState("ready");
        }
    };

    const sendMessage = () => {
        if (
            !inputText.trim() ||
            !wsRef.current ||
            wsRef.current.readyState !== WebSocket.OPEN
        ) {
            return;
        }

        // Add user message to chat
        setMessages((prev) => [...prev, { role: "user", content: inputText }]);

        // Send to server
        wsRef.current.send(inputText);
        setInputText("");
        setState("listening");
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // toggleInputMode is intentionally disabled to prevent switching to text mode
    const toggleInputMode = () => {
        if (
            state === "recording" ||
            state === "listening" ||
            state === "speaking"
        ) {
            toast.error("Cannot switch mode during active interaction");
            return;
        }
        // Do nothing — voice-only UI
        toast.info("Voice-only mode enabled");

        // Reconnect with new mode
        if (wsRef.current) {
            wsRef.current.close();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background px-6 py-10">
            <div className="container mx-auto max-w-5xl">
                {/* The Interview nav is intentionally _not_ shown on the live room page.
          It links to the feature root which provides setup and database links. */}

                <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md overflow-hidden">
                    {/* Orb Visualization Area */}
                    <div className="relative h-80 bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center overflow-hidden">
                        {/* Floating Orb */}
                        <div className="relative">
                            <div
                                className={`
                  w-32 h-32 rounded-full transition-all duration-500 ease-in-out
                  ${
                      state === "speaking"
                          ? "scale-110 animate-pulse shadow-2xl shadow-primary/50"
                          : state === "listening"
                          ? "scale-95 shadow-lg shadow-accent/30"
                          : state === "recording"
                          ? "scale-105 shadow-xl shadow-red-500/50"
                          : "scale-100 shadow-xl shadow-primary/40"
                  }
                  bg-gradient-to-br ${
                      state === "recording"
                          ? "from-red-500 via-red-400 to-red-500"
                          : "from-primary via-accent to-primary"
                  }
                  backdrop-blur-lg
                `}
                                style={{
                                    animation:
                                        state === "speaking"
                                            ? "orb-pulse 1.5s ease-in-out infinite"
                                            : state === "listening"
                                            ? "orb-listening 2s ease-in-out infinite"
                                            : state === "recording"
                                            ? "orb-recording 1s ease-in-out infinite"
                                            : "orb-float 3s ease-in-out infinite",
                                }}
                            />

                            {/* Glow effect */}
                            <div
                                className={`
                  absolute inset-0 rounded-full transition-all duration-500
                  ${state === "speaking" ? "opacity-60" : "opacity-30"}
                  bg-gradient-to-br from-primary/40 to-accent/40
                  blur-2xl
                `}
                                style={{
                                    animation:
                                        "orb-glow 2s ease-in-out infinite",
                                }}
                            />
                        </div>

                        {/* Status Text */}
                        <div className="absolute bottom-8 text-center">
                            <p className="text-sm font-medium text-foreground/80">
                                {state === "connecting" &&
                                    "Connecting to interviewer..."}
                                {state === "ready" && "Ready"}
                                {state === "recording" &&
                                    "Recording your response..."}
                                {state === "listening" &&
                                    "Processing your response..."}
                                {state === "speaking" &&
                                    "Interviewer is speaking"}
                                {state === "ended" && "Interview completed"}
                            </p>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div className="h-96 overflow-y-auto p-6 space-y-4 bg-muted/20">
                        {messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-sm text-muted-foreground">
                                    {state === "connecting"
                                        ? "Connecting..."
                                        : "Waiting for the interview to begin..."}
                                </p>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${
                                            msg.role === "user"
                                                ? "justify-end"
                                                : "justify-start"
                                        }`}
                                    >
                                        <div
                                            className={`
                        max-w-[80%] rounded-2xl px-4 py-3 text-sm
                        ${
                            msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-card border border-border/60"
                        }
                      `}
                                        >
                                            <p className="whitespace-pre-wrap">
                                                {msg.content}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-6 border-t border-border/60 bg-card/40">
                        {/* Text input is hidden on purpose — app is voice-only */}
                        {inputMode === "text" ? (
                            <>
                                <div className="flex gap-3">
                                    <textarea
                                        value={inputText}
                                        onChange={(e) =>
                                            setInputText(e.target.value)
                                        }
                                        onKeyDown={handleKeyPress}
                                        placeholder="Type your response..."
                                        disabled={state !== "ready"}
                                        className="flex-1 min-h-[60px] max-h-[120px] resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                    />

                                    <Button
                                        onClick={sendMessage}
                                        disabled={
                                            !inputText.trim() ||
                                            state !== "ready"
                                        }
                                        size="icon"
                                        className="flex-shrink-0 h-[60px] w-[60px]"
                                    >
                                        <Send className="h-5 w-5" />
                                    </Button>

                                    {/* hide the toggle — no switching to voice from text */}
                                </div>

                                <p className="mt-3 text-xs text-muted-foreground text-center">
                                    Press Enter to send • Shift + Enter for new
                                    line
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    <div className="flex gap-3 items-center justify-center">
                                        <Button
                                            onClick={
                                                isRecording
                                                    ? stopRecording
                                                    : startRecording
                                            }
                                            disabled={
                                                (state !== "ready" &&
                                                    !isRecording) ||
                                                !micSupported
                                            }
                                            title={
                                                !micSupported
                                                    ? "Microphone not available: ensure https or localhost and allow mic permissions"
                                                    : undefined
                                            }
                                            size="lg"
                                            className={`relative flex-shrink-0 h-[90px] w-[90px] rounded-full transition-all duration-300 ${
                                                isRecording
                                                    ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50"
                                                    : "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/50"
                                            }`}
                                        >
                                            {isRecording ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <MicOff className="h-8 w-8" />
                                                    <span className="text-[10px] font-medium">
                                                        Stop
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1">
                                                    <Mic className="h-8 w-8" />
                                                    <span className="text-[10px] font-medium">
                                                        Speak
                                                    </span>
                                                </div>
                                            )}

                                            {isRecording && (
                                                <span className="absolute -inset-2 rounded-full border-4 border-red-500 animate-ping opacity-75" />
                                            )}
                                        </Button>

                                        {/* hide the toggle — no switching to text */}
                                    </div>

                                    <div className="text-center space-y-1">
                                        <p className="text-sm font-medium text-foreground">
                                            {isRecording
                                                ? "🎙️ Recording..."
                                                : state === "listening"
                                                ? "⏳ Processing..."
                                                : "Tap to speak"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {isRecording
                                                ? "Tap the red button to finish"
                                                : state === "listening"
                                                ? "Transcribing and analyzing your response"
                                                : "Hold down and speak your answer clearly"}
                                        </p>
                                        {!micSupported && (
                                            <p className="mt-1 text-xs text-rose-500">
                                                Microphone access not available.
                                                Ensure you're on a secure origin
                                                (https or localhost) and allow
                                                mic permission in your browser.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes orb-float {
                    0%,
                    100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }

                @keyframes orb-pulse {
                    0%,
                    100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.15);
                    }
                }

                @keyframes orb-listening {
                    0%,
                    100% {
                        transform: scale(0.95);
                    }
                    50% {
                        transform: scale(1);
                    }
                }

                @keyframes orb-glow {
                    0%,
                    100% {
                        opacity: 0.3;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 0.6;
                        transform: scale(1.1);
                    }
                }

                @keyframes orb-recording {
                    0%,
                    100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.05);
                    }
                }
            `}</style>
        </div>
    );
}
