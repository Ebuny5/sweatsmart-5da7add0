import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const SweatSmartLanding = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [animatedBars, setAnimatedBars] = useState(false);
  const [typewriterText, setTypewriterText] = useState("");
  const chartRef = useRef(null);
  
  // For feature card scroll animations
  const [visibleCards, setVisibleCards] = useState<boolean[]>(new Array(6).fill(false));
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!loading && user) {
      navigate('/home', { replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAnimatedBars(true); },
      { threshold: 0.3 }
    );
    if (chartRef.current) observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);

  // Typewriter effect for "365 million people live with hyperhidrosis worldwide"
  useEffect(() => {
    const fullText = "365 million people live with hyperhidrosis worldwide";
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setTypewriterText(fullText.substring(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Observe each feature card
  useEffect(() => {
    const observers = cardRefs.current.map((ref, idx) => {
      if (!ref) return null;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleCards(prev => {
              const newArr = [...prev];
              newArr[idx] = true;
              return newArr;
            });
          }
        },
        { threshold: 0.2 }
      );
      observer.observe(ref);
      return observer;
    });
    return () => {
      observers.forEach(obs => obs?.disconnect());
    };
  }, []);

  const triggers = [
    { label: "Hot Temperature", value: 17, max: 20, color: "#a78bfa" },
    { label: "Crowded Spaces", value: 12, max: 20, color: "#818cf8" },
    { label: "Bright Lights", value: 9, max: 20, color: "#c084fc" },
    { label: "Anger", value: 7, max: 20, color: "#e879f9" },
    { label: "Nervousness", value: 7, max: 20, color: "#f0abfc" },
  ];

  const monthlyData = [3, 5, 4, 8, 6, 9, 7, 4, 3, 5, 2, 1];
  const months = ["J","F","M","A","M","J","J","A","S","O","N","D"];
  const maxEpisodes = Math.max(...monthlyData);

  const features = [
    {
      icon: "📝",
      title: "Precision Episode Logging",
      desc: "The core of your journey is the multi-layered Episode Logger. Record your experience by selecting complex environmental, emotional, gustatory, or pharmacological triggers alongside HDSS severity and body-area mapping. Immediately after logging, our cutting-edge technology performs a <span class='highlight-gold'>granular clinical analysis</span> to provide <span class='highlight-navy'>personalized relief strategies</span> specifically for your body.",
      accent: "#a78bfa",
      direction: "left",
    },
    {
      icon: "🎯",
      title: "Your Personal Trigger Profile",
      desc: "Every log and EDA scan is connected to your Personal Trigger Profile. This isn't just a list of episodes; it is a <span class='highlight-gold'>&quot;Digital Phenotype&quot;</span>—a smart map of your life. Identify whether your episodes are <span class='highlight-navy'>climate-driven or stress-driven</span>, allowing you to build a clearer understanding of your daily comfort and stay in control.",
      accent: "#818cf8",
      direction: "right",
    },
    {
      icon: "📊",
      title: "Longitudinal Dashboard & Analytics",
      desc: "Your dashboard features interactive <span class='highlight-gold'>Trend Overview charts</span> that visualize your history over weeks, months, and years. Track frequency fluctuations and <span class='highlight-navy'>severity trends</span> to see how you are successfully navigating your journey toward bodily dignity.",
      accent: "#c084fc",
      direction: "left",
    },
    {
      icon: "🌤️",
      title: "Climate Alerts",
      desc: "<span class='highlight-gold'>Proactive Guarding:</span> Real-time environmental monitoring that triggers <span class='highlight-navy'>&quot;High Risk&quot; notifications</span> before an episode starts by tracking real-time heat, humidity, and UV levels tuned to the <span class='highlight-gold'>African HH Trigger Baseline</span> (28°C and 70% humidity).",
      accent: "#e879f9",
      direction: "right",
    },
    {
      icon: "🫴",
      title: "AIoT Biometric Simulation (Xiaomi Integration)",
      desc: "Bridge the gap between smartphone accessibility and medical diagnostics. Our world-first camera-integrated <span class='highlight-gold'>Palm Scanner</span> utilizes computer vision and moisture detection to simulate <span class='highlight-navy'>Xiaomi IoT sensor data</span>. By quantifying your Electrodermal Activity (EDA) and heart rate across Resting, Active, and Trigger phases, the app confirms your &quot;physiological state&quot; to provide <span class='highlight-gold'>objective evidence</span> for a condition that is otherwise invisible.",
      accent: "#f0abfc",
      direction: "left",
    },
    {
      icon: "🗺️",
      title: "Geospatial Specialist Radar",
      desc: "Bridge the specialized care gap by connecting with <span class='highlight-gold'>expert dermatologists</span> through our intelligent <span class='highlight-navy'>geospatial expansion algorithm</span> — searching from your city to the global stage.",
      accent: "#a78bfa",
      direction: "right",
    },
  ];

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'DM Sans', sans-serif;
      background: #0a0614;
      color: #e2d9f3;
      overflow-x: hidden;
    }

    :root {
      --violet: #7c3aed;
      --violet-light: #a78bfa;
      --violet-bright: #8b5cf6;
      --indigo: #4f46e5;
      --magenta: #d946ef;
      --pink-soft: #f0abfc;
      --dark-bg: #0a0614;
      --card-bg: rgba(255,255,255,0.04);
      --card-border: rgba(167,139,250,0.18);
      --text-muted: #c4d0f0;
      --gold: #fbbf24;
      --navy: #1e3a8a;
    }

    .highlight-gold {
      color: var(--gold);
      font-weight: 600;
    }
    
    .highlight-navy {
      color: #60a5fa;
      font-weight: 600;
    }

    .noise-overlay {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      opacity: 0.025;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
      background-size: 200px;
    }

    .orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      pointer-events: none;
    }

    nav {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      padding: 0 5%;
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.3s ease;
    }
    nav.scrolled {
      background: rgba(10,6,20,0.9);
      backdrop-filter: blur(20px);
      border-bottom: 0.5px solid rgba(167,139,250,0.15);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
    }
    .logo-img {
      width: 44px;
      height: 44px;
      object-fit: contain;
      filter: drop-shadow(0 0 16px rgba(124,58,237,0.6));
      animation: pulse-logo 3s ease-in-out infinite;
    }
    @keyframes pulse-logo {
      0%, 100% { filter: drop-shadow(0 0 16px rgba(124,58,237,0.6)); }
      50% { filter: drop-shadow(0 0 28px rgba(124,58,237,0.9)) drop-shadow(0 0 40px rgba(217,70,239,0.4)); }
    }
    .logo-text {
      font-family: 'Syne', sans-serif;
      font-weight: 800;
      font-size: 22px;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #a78bfa 0%, #f0abfc 50%, #7c3aed 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-shadow: 0 0 24px rgba(167,139,250,0.35);
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-ghost {
      padding: 10px 22px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 500;
      color: #c4b5fd;
      background: transparent;
      border: none;
      cursor: pointer;
      text-decoration: none;
      transition: color 0.2s, background 0.2s;
    }
    .btn-ghost:hover { background: rgba(167,139,250,0.1); color: #f5f3ff; }

    .btn-primary {
      padding: 11px 26px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      color: white;
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      border: none;
      cursor: pointer;
      text-decoration: none;
      box-shadow: 0 0 24px rgba(124,58,237,0.5);
      transition: all 0.2s;
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 0 32px rgba(124,58,237,0.7);
    }
    .btn-primary-lg {
      padding: 17px 40px;
      border-radius: 10px;
      font-size: 17px;
      font-weight: 600;
      color: white;
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      border: none;
      cursor: pointer;
      text-decoration: none;
      box-shadow: 0 0 40px rgba(124,58,237,0.6);
      display: inline-block;
      transition: all 0.25s;
    }
    .btn-primary-lg:hover { transform: translateY(-2px); box-shadow: 0 8px 50px rgba(124,58,237,0.7); }

    .btn-outline-lg {
      padding: 17px 40px;
      border-radius: 10px;
      font-size: 17px;
      font-weight: 600;
      color: #f5f3ff;
      background: transparent;
      border: 1.5px solid rgba(167,139,250,0.5);
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      transition: all 0.25s;
    }
    .btn-outline-lg:hover {
      background: rgba(167,139,250,0.1);
      border-color: rgba(167,139,250,0.8);
      transform: translateY(-2px);
    }

    section {
      position: relative;
      padding: 60px 5% 40px;
    }

    .section-hero {
      min-height: 90vh;
      display: flex;
      align-items: center;
      padding-top: 100px;
      padding-bottom: 60px;
    }

    .hero-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      align-items: center;
      max-width: 1400px;
      margin: 0 auto;
    }

    @media (max-width: 1024px) {
      .hero-grid {
        grid-template-columns: 1fr;
        gap: 50px;
      }
    }

    .trust-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(167,139,250,0.15);
      border: 1px solid rgba(167,139,250,0.3);
      padding: 10px 20px;
      border-radius: 24px;
      font-size: 13px;
      font-weight: 500;
      color: #c4b5fd;
      margin-bottom: 28px;
      letter-spacing: 0.3px;
    }

    .hero-title {
      font-family: 'Syne', sans-serif;
      font-size: clamp(48px, 7vw, 68px);
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 26px;
      color: #f5f3ff;
      overflow-wrap: break-word;
      word-wrap: break-word;
      hyphens: auto;
    }

    .gradient-text {
      background: linear-gradient(135deg, #7c3aed 0%, #d946ef 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      display: inline-block;
    }

    .hero-subtitle {
      font-size: clamp(17px, 2vw, 20px);
      line-height: 1.65;
      color: var(--text-muted);
      margin-bottom: 36px;
      max-width: 580px;
    }

    .hero-ctas {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 44px;
    }

    .hero-social-proof {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .avatars {
      display: flex;
    }
    .avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 15px;
      color: white;
      margin-left: -12px;
      border: 2px solid #0a0614;
    }
    .avatar:first-child { margin-left: 0; }

    .proof-text {
      font-size: 17px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .proof-text strong {
      color: #ffffff;
      font-weight: 600;
    }

    /* Typewriter cursor */
    .typewriter {
      display: inline-block;
    }
    .typewriter::after {
      content: '|';
      animation: blink 1s infinite;
      margin-left: 2px;
    }
    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }

    /* MOCK DASHBOARD */
    .hero-visual {
      position: relative;
    }
    .hero-visual::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%);
      filter: blur(80px);
      pointer-events: none;
      z-index: 0;
    }
    .mock-phone {
      background: linear-gradient(135deg, rgba(124,58,237,0.1), rgba(217,70,239,0.1));
      border: 1px solid rgba(167,139,250,0.25);
      border-radius: 28px;
      overflow: hidden;
      box-shadow:
        0 30px 90px rgba(0,0,0,0.5),
        0 0 0 1px rgba(167,139,250,0.1),
        0 0 60px rgba(124,58,237,0.4),
        0 0 120px rgba(217,70,239,0.2);
      max-width: 500px;
      margin: 0 auto;
      transform: translateY(-10px);
      position: relative;
      z-index: 1;
      animation: float 6s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(-10px);
        box-shadow:
          0 30px 90px rgba(0,0,0,0.5),
          0 0 0 1px rgba(167,139,250,0.1),
          0 0 60px rgba(124,58,237,0.4),
          0 0 120px rgba(217,70,239,0.2);
      }
      50% {
        transform: translateY(-20px);
        box-shadow:
          0 40px 110px rgba(0,0,0,0.6),
          0 0 0 1px rgba(167,139,250,0.15),
          0 0 80px rgba(124,58,237,0.6),
          0 0 160px rgba(217,70,239,0.3);
      }
    }

    .mock-header {
      background: linear-gradient(135deg, #7c3aed, #9333ea);
      padding: 28px 24px;
      color: white;
    }

    .mock-greeting {
      font-size: 11px;
      letter-spacing: 1.2px;
      opacity: 0.9;
      margin-bottom: 8px;
      font-weight: 500;
    }

    .mock-title {
      font-size: 26px;
      font-weight: 700;
      margin-bottom: 20px;
      font-family: 'Syne', sans-serif;
    }

    .mock-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .mock-stat {
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 14px 12px;
      text-align: center;
    }

    .mock-stat-val {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 4px;
      font-family: 'Syne', sans-serif;
    }

    .mock-stat-label {
      font-size: 11px;
      opacity: 0.85;
      font-weight: 500;
    }

    .mock-body {
      background: #1a0f2e;
      padding: 24px;
      min-height: 340px;
    }

    .mock-section-title {
      font-size: 13px;
      font-weight: 600;
      color: #9ca3af;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .mock-chart-bars {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      height: 60px;
      margin-bottom: 28px;
    }

    .mock-bar {
      flex: 1;
      background: linear-gradient(180deg, #a78bfa, #7c3aed);
      border-radius: 4px 4px 0 0;
      transition: height 1.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .mock-triggers {
      margin-bottom: 20px;
    }

    .mock-trigger-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .mock-trigger-label {
      font-size: 13px;
      color: #9ca3af;
      width: 100px;
      flex-shrink: 0;
    }

    .mock-trigger-bar-wrap {
      flex: 1;
      height: 8px;
      background: rgba(255,255,255,0.05);
      border-radius: 4px;
      overflow: hidden;
    }

    .mock-trigger-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #7c3aed, #a78bfa);
      border-radius: 4px;
      transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .mock-trigger-count {
      font-size: 13px;
      color: #c4b5fd;
      font-weight: 600;
      width: 30px;
      text-align: right;
    }

    .mock-pill {
      display: inline-block;
      background: rgba(167,139,250,0.15);
      border: 1px solid rgba(167,139,250,0.3);
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 12px;
      margin-right: 8px;
      margin-top: 8px;
      color: #c4b5fd;
    }

    /* FEATURES SECTION */
    .section-features {
      padding: 60px 5%;
    }

    .section-label {
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--violet-light);
      margin-bottom: 20px;
    }

    .section-title {
      text-align: center;
      font-family: 'Syne', sans-serif;
      font-size: clamp(36px, 5vw, 52px);
      font-weight: 800;
      line-height: 1.2;
      color: #f5f3ff;
      margin-bottom: 22px;
    }

    .section-subtitle {
      text-align: center;
      font-size: clamp(16px, 2vw, 19px);
      line-height: 1.65;
      color: var(--text-muted);
      max-width: 800px;
      margin: 0 auto 50px;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 28px;
      max-width: 1400px;
      margin: 0 auto;
    }

    @media (max-width: 768px) {
      .features-grid {
        grid-template-columns: 1fr;
      }
    }

    .feature-card {
      position: relative;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 34px 28px;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      opacity: 0;
    }

    .feature-card.slide-left {
      animation: slideInLeft 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    .feature-card.slide-right {
      animation: slideInRight 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    @keyframes slideInLeft {
      from {
        opacity: 0;
        transform: translateX(-60px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(60px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .feature-card:hover {
      border-color: rgba(167,139,250,0.4);
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(124,58,237,0.2);
    }

    .feature-icon {
      font-size: 42px;
      display: block;
      margin-bottom: 20px;
      line-height: 1;
    }

    .feature-title {
      font-family: 'Syne', sans-serif;
      font-size: clamp(20px, 2.5vw, 24px);
      font-weight: 700;
      color: #f5f3ff;
      margin-bottom: 14px;
      line-height: 1.3;
    }

    .feature-desc {
      font-size: clamp(15px, 1.8vw, 17px);
      line-height: 1.7;
      color: #c4d0f0;
    }

    .feature-glow {
      position: absolute;
      bottom: -40px;
      right: -40px;
      width: 140px;
      height: 140px;
      border-radius: 50%;
      filter: blur(70px);
      opacity: 0.12;
      pointer-events: none;
    }

    /* ANALYTICS SECTION */
    .section-analytics {
      padding: 60px 5%;
      background: rgba(124,58,237,0.03);
    }

    .analytics-inner {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 50px;
      align-items: center;
      max-width: 1300px;
      margin: 0 auto;
    }

    @media (max-width: 1024px) {
      .analytics-inner {
        grid-template-columns: 1fr;
      }
    }

    .chart-visual {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 32px;
    }

    .chart-title {
      font-size: 16px;
      font-weight: 600;
      color: #9ca3af;
      margin-bottom: 24px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .chart-container {
      margin-bottom: 28px;
    }

    .chart-bars-full {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      height: 120px;
      margin-bottom: 16px;
    }

    .chart-bar-wrap {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .chart-bar-full {
      width: 100%;
      background: linear-gradient(180deg, #a78bfa, #7c3aed);
      border-radius: 6px 6px 0 0;
      transition: height 1.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .chart-month {
      font-size: 12px;
      color: #9ca3af;
      font-weight: 500;
    }

    .chart-legend {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text-muted);
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .analytics-text {
      padding: 0 20px;
    }

    .big-stat {
      font-family: 'Syne', sans-serif;
      font-size: clamp(64px, 8vw, 90px);
      font-weight: 800;
      background: linear-gradient(135deg, #7c3aed, #d946ef);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
      margin-bottom: 12px;
    }

    .big-stat-label {
      font-size: clamp(17px, 2vw, 20px);
      color: var(--text-muted);
      margin-bottom: 36px;
      font-weight: 500;
    }

    .stat-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 32px;
    }

    .stat-item {
      background: rgba(167,139,250,0.08);
      border: 1px solid rgba(167,139,250,0.15);
      border-radius: 14px;
      padding: 22px 18px;
    }

    .stat-val {
      font-family: 'Syne', sans-serif;
      font-size: clamp(32px, 4vw, 42px);
      font-weight: 700;
      color: var(--violet-light);
      margin-bottom: 8px;
    }

    .stat-key {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.4;
    }

    /* CTA SECTION */
    .section-cta {
      padding: 60px 5% 80px;
    }

    .cta-card {
      background: linear-gradient(135deg, rgba(124,58,237,0.15), rgba(217,70,239,0.15));
      border: 1px solid rgba(167,139,250,0.3);
      border-radius: 28px;
      padding: 64px 40px;
      text-align: center;
      max-width: 900px;
      margin: 0 auto;
      position: relative;
      overflow: hidden;
    }

    .cta-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 50% 0%, rgba(124,58,237,0.2), transparent 70%);
      pointer-events: none;
    }

    .cta-title {
      font-family: 'Syne', sans-serif;
      font-size: clamp(32px, 5vw, 48px);
      font-weight: 800;
      line-height: 1.2;
      color: #f5f3ff;
      margin-bottom: 22px;
      position: relative;
    }

    .cta-sub {
      font-size: clamp(16px, 2vw, 19px);
      line-height: 1.65;
      color: var(--text-muted);
      margin-bottom: 36px;
      max-width: 700px;
      margin-left: auto;
      margin-right: auto;
      position: relative;
    }

    .cta-buttons {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
      position: relative;
    }

    /* FOOTER */
    footer {
      border-top: 1px solid rgba(167,139,250,0.15);
      padding: 44px 5%;
      text-align: center;
    }

    .footer-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1300px;
      margin: 0 auto 32px;
      flex-wrap: wrap;
      gap: 24px;
    }

    .footer-logo-img {
      width: 38px;
      height: 38px;
      object-fit: contain;
      filter: drop-shadow(0 0 12px rgba(124,58,237,0.5));
    }

    .footer-copy {
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }

    .footer-links {
      display: flex;
      gap: 28px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .footer-link {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 14px;
      transition: color 0.2s;
    }

    .footer-link:hover {
      color: var(--violet-light);
    }

    /* RESPONSIVE */
    @media (max-width: 640px) {
      nav {
        height: 64px;
        padding: 0 4%;
      }
      
      .logo-img {
        width: 38px;
        height: 38px;
      }
      
      .logo-text {
        font-size: 18px;
      }

      .btn-ghost {
        padding: 8px 16px;
        font-size: 14px;
      }

      .btn-primary {
        padding: 9px 20px;
        font-size: 14px;
      }

      section {
        padding: 40px 4%;
      }

      .section-hero {
        padding-top: 80px;
      }

      .hero-title {
        font-size: 42px;
      }

      .btn-primary-lg,
      .btn-outline-lg {
        padding: 14px 32px;
        font-size: 15px;
        width: 100%;
      }

      .features-grid {
        gap: 20px;
      }

      .feature-card {
        padding: 26px 22px;
      }

      .cta-card {
        padding: 44px 28px;
      }

      .footer-top {
        flex-direction: column;
        text-align: center;
      }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="noise-overlay" />

      {/* FLOATING ORBS */}
      <div className="orb" style={{ top: '-10%', left: '10%', width: 500, height: 500, background: 'rgba(124,58,237,0.15)' }} />
      <div className="orb" style={{ top: '40%', right: '-5%', width: 400, height: 400, background: 'rgba(217,70,239,0.12)' }} />

      {/* NAV */}
      <nav className={scrolled ? 'scrolled' : ''}>
        <a href="/" className="logo">
          <img 
            src="/sweatsmart-logo.png"
            alt="SweatSmart Logo" 
            className="logo-img"
          />
          <span className="logo-text">SweatSmart</span>
        </a>
        <div className="nav-links">
          <a href="/login" className="btn-ghost">Login</a>
          <a href="/register" className="btn-primary">Get Started</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="section-hero">
        <div className="hero-grid">
          <div>
            <div className="trust-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              TRUSTED BY 12,000+ PEOPLE
            </div>
            <h1 className="hero-title">
              Take control<br />
              of your{' '}
              <span className="gradient-text">hyperhidrosis</span>
            </h1>
            <p className="hero-subtitle">
              Track episodes, uncover triggers, and get AI-powered insights — all in one clinical-grade app designed for real life.
            </p>
            <div className="hero-ctas">
              <a href="/register" className="btn-primary-lg">Start for free</a>
              <a href="/login" className="btn-outline-lg">Sign in</a>
            </div>
            <div className="hero-social-proof">
              <div className="avatars">
                {['#7c3aed','#a855f7','#6d28d9','#9333ea'].map((c, i) => (
                  <div key={i} className="avatar" style={{ background: c }}>
                    {['T','M','R','K'][i]}
                  </div>
                ))}
              </div>
              <p className="proof-text">
                <strong className="typewriter">{typewriterText}</strong>
              </p>
            </div>
          </div>

          {/* MOCK DASHBOARD */}
          <div className="hero-visual">
            <div className="mock-phone">
              <div className="mock-header">
                <div className="mock-greeting">SWEATSMART · GOOD EVENING</div>
                <div className="mock-title">Tyla's Dashboard 💧</div>
                <div className="mock-stats">
                  <div className="mock-stat">
                    <div className="mock-stat-val">32</div>
                    <div className="mock-stat-label">Episodes</div>
                  </div>
                  <div className="mock-stat">
                    <div className="mock-stat-val">3.1</div>
                    <div className="mock-stat-label">Avg HDSS</div>
                  </div>
                  <div className="mock-stat" style={{ background: 'rgba(217,70,239,0.2)' }}>
                    <div className="mock-stat-val" style={{ fontSize: 11, paddingTop: 2 }}>🔥 Hot</div>
                    <div className="mock-stat-label">Top trigger</div>
                  </div>
                </div>
              </div>
              <div className="mock-body">
                <div className="mock-section-title">Monthly trend</div>
                <div className="mock-chart-bars">
                  {monthlyData.map((v, i) => (
                    <div
                      key={i}
                      className="mock-bar"
                      style={{ height: animatedBars ? `${(v / maxEpisodes) * 56 + 4}px` : '4px' }}
                    />
                  ))}
                </div>

                <div className="mock-section-title">Your top triggers</div>
                <div className="mock-triggers" ref={chartRef}>
                  {triggers.slice(0, 3).map((t, i) => (
                    <div key={i} className="mock-trigger-row">
                      <div className="mock-trigger-label">{t.label}</div>
                      <div className="mock-trigger-bar-wrap">
                        <div
                          className="mock-trigger-bar-fill"
                          style={{ width: animatedBars ? `${(t.value / t.max) * 100}%` : '0%' }}
                        />
                      </div>
                      <div className="mock-trigger-count">{t.value}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <span className="mock-pill">🌡 Hot Temperature (17)</span>
                  <span className="mock-pill">👥 Crowded (12)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section-features">
        <div className="section-label">CORE FEATURES</div>
        <p className="section-subtitle">
          Professional-grade tracking tools built specifically for hyperhidrosis — designed with clinical rigor, and human sensitivity.
        </p>
        <div className="features-grid">
          {features.map((f, i) => (
            <div 
              key={i} 
              ref={el => cardRefs.current[i] = el}
              className={`feature-card ${visibleCards[i] ? (f.direction === 'left' ? 'slide-left' : 'slide-right') : ''}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <span className="feature-icon">{f.icon}</span>
              <div className="feature-title">{f.title}</div>
              <div 
                className="feature-desc" 
                dangerouslySetInnerHTML={{ __html: f.desc }}
              />
              <div className="feature-glow" style={{ background: f.accent }} />
            </div>
          ))}
        </div>
      </section>

      {/* ANALYTICS SHOWCASE */}
      <section className="section-analytics">
        <div className="analytics-inner">
          <div className="chart-visual">
            <div className="chart-title">Trend overview — 12 months</div>
            <div className="chart-container">
              <div className="chart-bars-full">
                {monthlyData.map((v, i) => (
                  <div key={i} className="chart-bar-wrap">
                    <div
                      className="chart-bar-full"
                      style={{ height: animatedBars ? `${(v / maxEpisodes) * 108 + 4}px` : '4px' }}
                    />
                    <div className="chart-month">{months[i]}</div>
                  </div>
                ))}
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: '#a78bfa' }} />
                  Episode count
                </div>
                <div className="legend-item">
                  <div className="legend-dot" style={{ background: '#e879f9', borderRadius: 0, width: 14, height: 2, marginTop: 3 }} />
                  HDSS severity (1–4)
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              {triggers.map((t, i) => (
                <div key={i} className="mock-trigger-row" style={{ marginBottom: 8 }}>
                  <div style={{ width: 120, fontSize: 12, color: '#9ca3af' }}>{t.label}</div>
                  <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: 4,
                      background: `linear-gradient(90deg, #7c3aed, ${t.color})`,
                      width: animatedBars ? `${(t.value / 20) * 100}%` : '0%',
                      transition: `width ${1 + i * 0.15}s cubic-bezier(0.4,0,0.2,1)`,
                    }} />
                  </div>
                  <div style={{ width: 24, textAlign: 'right', fontSize: 12, color: '#c4b5fd', fontWeight: 600 }}>{t.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-text">
            <div className="big-stat">32</div>
            <div className="big-stat-label">episodes tracked this year</div>
            <div className="stat-row">
              <div className="stat-item">
                <div className="stat-val">20</div>
                <div className="stat-key">Unique triggers<br />identified</div>
              </div>
              <div className="stat-item">
                <div className="stat-val">↓ 4</div>
                <div className="stat-key">Fewer episodes<br />this month</div>
              </div>
            </div>
            <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.65, marginBottom: 28 }}>
              Your data builds a personal picture over time. Patterns that were invisible become clear — giving you and your doctor the full story.
            </p>
            <a href="/register" className="btn-primary-lg" style={{ fontSize: 14, padding: '12px 28px' }}>
              Start tracking
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-cta">
        <div className="cta-card">
          <div className="cta-title">
            Ready to Reclaim your comfort<br />
            with data-driven confidence?
          </div>
          <p className="cta-sub">
            Join a global community of Warriors using SweatSmart to quantify their experience, optimize their daily environment, and finally achieve the dignity of being understood.
          </p>
          <div className="cta-buttons">
            <a href="/register" className="btn-primary-lg">Start your journey free</a>
            <a href="/login" className="btn-outline-lg">Sign in</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-top">
          <a href="/" className="logo" style={{ textDecoration: 'none' }}>
            <img 
              src="/sweatsmart-logo.png"
              alt="SweatSmart Logo" 
              className="footer-logo-img"
            />
            <span className="logo-text" style={{ fontSize: 16 }}>SweatSmart</span>
          </a>
          <div className="footer-links">
            <a href="/privacy" className="footer-link">Privacy</a>
            <a href="/terms" className="footer-link">Terms</a>
            <a href="/contact" className="footer-link">Contact</a>
          </div>
        </div>
        <p className="footer-copy">© {new Date().getFullYear()} SweatSmart by Giftovate Therapeutics Ltd. All rights reserved.</p>
      </footer>
    </>
  );
};

export default SweatSmartLanding;
