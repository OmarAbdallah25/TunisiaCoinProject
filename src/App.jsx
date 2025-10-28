import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import "./index.css";

const BACKEND_URL = "http://192.168.1.17:8000/detect";

export default function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [sum, setSum] = useState(null);
  const lastCoinsRef = useRef({ total: null });

  const getArabicVoice = () => {
    return new Promise((resolve) => {
      let voices = speechSynthesis.getVoices();
      if (voices.length) resolve(voices.find((v) => v.lang.startsWith("ar")));
      else
        speechSynthesis.onvoiceschanged = () => {
          voices = speechSynthesis.getVoices();
          resolve(voices.find((v) => v.lang.startsWith("ar")));
        };
    });
  };

  const speakTotal = async (total) => {
    if (total === null || total === 0) return;
    if (lastCoinsRef.current.total === total) return;
    lastCoinsRef.current.total = total;

    let text = "";
    if (total >= 1000) {
      const dinar = Math.floor(total / 1000);
      const millime = total % 1000;
      text += `لديك ${dinar} دينار`;
      if (millime > 0) text += ` و ${millime} مليم`;
    } else if (total > 0) {
      text += `لديك ${total} مليم`;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const arabicVoice = await getArabicVoice();
    if (arabicVoice) utterance.voice = arabicVoice;
    utterance.lang = "ar-SA";
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  };

  const captureAndSend = async () => {
    if (!webcamRef.current || !webcamRef.current.video) return;
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    const blob = await (await fetch(imageSrc)).blob();
    const formData = new FormData();
    formData.append("file", blob, "frame.jpg");

    try {
      const res = await fetch(BACKEND_URL, { method: "POST", body: formData });
      if (!res.ok) return;
      const data = await res.json();

      if (data) {
        setSum(data.sum || 0);
        drawBoxes(data.detections || []);
        speakTotal(data.sum || 0);
      }
    } catch (err) {
      console.error("Erreur fetch:", err);
      setSum(0);
    }
  };

  const drawBoxes = (detections) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = webcamRef.current.video;
    if (!video) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach((det) => {
      const [x1, y1, x2, y2] = det.box;
      ctx.strokeStyle = det.conf > 0.7 ? "lime" : "orange";
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
      ctx.font = "18px Arial";
      ctx.fillText(det.label, x1 + 5, y1 + 20);
    });
  };

  useEffect(() => {
    let animationFrameId;
    const runDetection = async () => {
      await captureAndSend();
      animationFrameId = requestAnimationFrame(runDetection);
    };
    runDetection();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="app-container">
      {/* Titre professionnel */}
     <h1 className="app-title">نظام التعرف على العملات التونسية</h1>

      <div className="webcam-wrapper">
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          className="webcam-video"
          videoConstraints={{ facingMode: "environment" }}
        />
        <canvas ref={canvasRef} className="canvas-overlay" />
      </div>

      <div className="sum-button">
        {sum !== null
          ? `المجموع : ${
              sum >= 1000
                ? `${Math.floor(sum / 1000)} دينار${
                    sum % 1000 > 0 ? ` و ${sum % 1000} مليم` : ""
                  }`
                : `${sum} مليم`
            }`
          : "Scan en cours..."}
      </div>
    </div>
  );
}
