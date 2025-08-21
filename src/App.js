import { useState, useRef } from "react";

function App() {
  // --- State for Registering Phonemes ---
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null); // 👈 store audio response
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // --- State for Walkup Try ---
  const [walkupText, setWalkupText] = useState("");
  const [walkupLoading, setWalkupLoading] = useState(false);

  // 🎤 Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start();
      setRecording(true);
      setAudioUrl(null); // reset previous response
    } catch (err) {
      console.error("Error accessing mic:", err);
      alert("Could not access microphone");
    }
  };

  // ⏹ Stop recording and send to backend
  const stopRecording = () => {
    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        // Join firstname + lastname
        const phrase = `${firstname} ${lastname}`.trim();

        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");
        formData.append("phrase", phrase);

        setLoading(true);
        try {
          const response = await fetch("https://redfish-internal-definitely.ngrok-free.app/integrations/speech-to-text", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            alert("Error processing audio");
            setLoading(false);
            return;
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setAudioUrl(url); // 👈 store response URL
        } catch (err) {
          console.error(err);
          alert("Error connecting to server");
        } finally {
          setLoading(false);
        }

        resolve();
      };

      mediaRecorderRef.current.stop();
      setRecording(false);
    });
  };

  // 🔊 Play the received audio
  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  // ✍️ Handle Walkup Try text-to-speech
  const handleWalkupSubmit = async (e) => {
    e.preventDefault();
    if (!walkupText) return;

    setWalkupLoading(true);

    try {
      const response = await fetch("https://redfish-internal-definitely.ngrok-free.app/integrations/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: walkupText }),
      });

      if (!response.ok) {
        alert("Error generating voice");
        setWalkupLoading(false);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
    } catch (err) {
      console.error(err);
      alert("Error connecting to server");
    } finally {
      setWalkupLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>ElevenLabs POC</h1>

      {/* --- Section 1: Registering Phonemes --- */}
      <section style={{ marginBottom: 40 }}>
        <h2>Registering Phonemes</h2>

        {/* Form with firstname + lastname */}
        <div style={{ marginBottom: 10 }}>
          <input
            type="text"
            placeholder="Firstname"
            value={firstname}
            onChange={(e) => setFirstname(e.target.value)}
            style={{ marginRight: 10 }}
          />
          <input
            type="text"
            placeholder="Lastname"
            value={lastname}
            onChange={(e) => setLastname(e.target.value)}
          />
        </div>

        {/* 🎤 Recording Buttons */}
        {!recording ? (
          <button onClick={startRecording} disabled={loading || !firstname || !lastname}>
            Start Recording
          </button>
        ) : (
          <button onClick={stopRecording} disabled={loading}>
            Stop & Send
          </button>
        )}

        {loading && <p>Processing...</p>}

        {/* 🔊 Play Button appears only if we got audio */}
        {audioUrl && (
          <button onClick={playAudio} style={{ marginTop: 10 }}>
            Hear Voice
          </button>
        )}
      </section>

      {/* --- Section 2: Walkup Try --- */}
      <section>
        <h2>Walkup Try</h2>
        <form onSubmit={handleWalkupSubmit}>
          <textarea
            rows="4"
            cols="50"
            placeholder="Enter text here..."
            value={walkupText}
            onChange={(e) => setWalkupText(e.target.value)}
          />
          <br />
          <button type="submit" disabled={walkupLoading}>
            {walkupLoading ? "Generating..." : "Convert to Voice"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default App;
